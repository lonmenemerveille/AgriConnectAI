 const db = require('../db');
const Transporteur = require('./transporteurModel');
const { rejeter } = require('../utils/erreur');

// Une seule transaction : si le paiement ou l'écriture échoue, le stock revient comme avant.
// payer(montant) est fourni par le contrôleur (service de paiement).
async function creer(idAcheteur, lignes, payer) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;
    const details = [];
    for (const { id_produit, quantite } of lignes) {
      const [[p]] = await conn.query(
        `SELECT id_produit, nom, prix, quantite_disponible, id_producteur
           FROM produit WHERE id_produit = ? FOR UPDATE`, [id_produit]);
      if (!p) rejeter(404, 'Produit introuvable.');
      if (p.quantite_disponible < quantite) rejeter(409, `Stock insuffisant pour ${p.nom}.`);
      total += p.prix * quantite;
      details.push({ ...p, quantite });
    }

    const pay = await payer(total);
    if (pay.statut !== 'reussi') rejeter(402, 'Le paiement a été refusé.');

    const [c] = await conn.query(
      `INSERT INTO commande (id_acheteur, date_commande, montant_total, statut)
       VALUES (?, NOW(), ?, 'payee')`, [idAcheteur, total]);
    const idCommande = c.insertId;

    for (const d of details) {
      await conn.query(
        `INSERT INTO ligne_commande (id_commande, id_produit, quantite, prix_unitaire)
         VALUES (?, ?, ?, ?)`, [idCommande, d.id_produit, d.quantite, d.prix]);
      await conn.query(
        'UPDATE produit SET quantite_disponible = quantite_disponible - ? WHERE id_produit = ?',
        [d.quantite, d.id_produit]);
    }

    await conn.query(
      `INSERT INTO paiement (id_commande, montant, mode, reference, statut)
       VALUES (?, ?, ?, ?, 'reussi')`, [idCommande, total, pay.mode, pay.reference]);

    const [l] = await conn.query(
      `INSERT INTO livraison (id_commande, statut) VALUES (?, 'non_traitee')`, [idCommande]);

    // Version simple : transporteur choisi près du premier producteur de la commande.
    const t = await Transporteur.plusProche(conn, details[0].id_producteur, idAcheteur);
    if (t) {
      await conn.query(
        'UPDATE livraison SET id_transporteur = ?, cout_transport = ? WHERE id_livraison = ?',
        [t.id_transporteur, t.cout_transport, l.insertId]);
    }

    await conn.commit();
    return { id_commande: idCommande, montant_total: total, transporteur: t };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { creer };