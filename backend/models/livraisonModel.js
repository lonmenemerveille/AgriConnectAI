const db = require('../db');

async function lister(idAcheteur) {
  const [rows] = await db.query(
    `SELECT l.id_livraison, l.statut, l.cout_transport, c.id_commande, c.date_commande,
            GROUP_CONCAT(p.nom SEPARATOR ', ') AS produits
       FROM livraison l
       JOIN commande c ON c.id_commande = l.id_commande
       JOIN ligne_commande lc ON lc.id_commande = c.id_commande
       JOIN produit p ON p.id_produit = lc.id_produit
      WHERE c.id_acheteur = ?
      GROUP BY l.id_livraison, l.statut, l.cout_transport, c.id_commande, c.date_commande
      ORDER BY c.date_commande DESC`, [idAcheteur]);
  return rows;
}

async function detail(idLivraison, idAcheteur) {
  const [[row]] = await db.query(
    `SELECT l.id_livraison, l.statut, l.cout_transport, c.id_commande,
            ut.nom AS transporteur, ut.latitude, ut.longitude,
            (SELECT p.id_producteur FROM ligne_commande lc
               JOIN produit p ON p.id_produit = lc.id_produit
              WHERE lc.id_commande = c.id_commande LIMIT 1) AS id_producteur,
            (SELECT u.nom FROM ligne_commande lc
               JOIN produit p ON p.id_produit = lc.id_produit
               JOIN utilisateur u ON u.id_utilisateur = p.id_producteur
              WHERE lc.id_commande = c.id_commande LIMIT 1) AS producteur
       FROM livraison l
       JOIN commande c ON c.id_commande = l.id_commande
       LEFT JOIN utilisateur ut ON ut.id_utilisateur = l.id_transporteur
      WHERE l.id_livraison = ? AND c.id_acheteur = ?`, [idLivraison, idAcheteur]);
  return row || null;
}

// en_cours -> validee, uniquement par l'acheteur concerné
async function confirmerReception(idLivraison, idAcheteur) {
  const [r] = await db.query(
    `UPDATE livraison l JOIN commande c ON c.id_commande = l.id_commande
        SET l.statut = 'validee'
      WHERE l.id_livraison = ? AND c.id_acheteur = ? AND l.statut = 'en_cours'`,
    [idLivraison, idAcheteur]);
  return r.affectedRows > 0;
}

module.exports = { lister, detail, confirmerReception };