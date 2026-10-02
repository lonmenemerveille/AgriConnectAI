const db = require('../db');

// Un acheteur ne peut noter qu'un producteur chez qui il a commandé
async function aCommandeChez(idAcheteur, idProducteur) {
  const [rows] = await db.query(
    `SELECT 1 FROM commande c
       JOIN ligne_commande lc ON lc.id_commande = c.id_commande
       JOIN produit p ON p.id_produit = lc.id_produit
      WHERE c.id_acheteur = ? AND p.id_producteur = ? LIMIT 1`, [idAcheteur, idProducteur]);
  return rows.length > 0;
}

async function creer(idAcheteur, idProducteur, note, commentaire) {
  await db.query(
    `INSERT INTO evaluation (id_acheteur, id_producteur, note, commentaire)
     VALUES (?, ?, ?, ?)`, [idAcheteur, idProducteur, note, commentaire || null]);
}

module.exports = { aCommandeChez, creer };