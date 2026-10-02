const db = require('../db');

async function filtrer({ q, categorie, ville, prixMax }) {
  const where = ['p.quantite_disponible > 0'];
  const params = [];
  if (q) { where.push('p.nom LIKE ?'); params.push(`%${q}%`); }
  if (categorie) { where.push('p.categorie = ?'); params.push(categorie); }
  if (ville) { where.push('p.ville = ?'); params.push(ville); }
  if (prixMax) { where.push('p.prix <= ?'); params.push(Number(prixMax)); }

  const [rows] = await db.query(
    `SELECT p.id_produit, p.nom, p.categorie, p.prix, p.quantite_disponible, p.ville,
            p.id_producteur, u.nom AS producteur
       FROM produit p
       JOIN utilisateur u ON u.id_utilisateur = p.id_producteur
      WHERE ${where.join(' AND ')}
      ORDER BY p.nom`, params);
  return rows;
}

module.exports = { filtrer };