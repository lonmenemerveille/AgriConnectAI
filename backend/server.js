const path = require('path');
// ... tes autres require ...

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db'); // adapte le chemin si besoin
// const { demanderPaiement, verifierStatutPaiement } = require('./momo');
const { assignerTransporteurAutomatique } = require('./geolocalisation');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/test', (req, res) => {
  res.json({ message: 'le serveur AgriConnectAI est fonctionnel !' });
});

// ---------- INSCRIPTION ----------
app.post('/api/register', async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, telephone, role } = req.body;
    if (!nom || !email || !mot_de_passe || !role) {
      return res.status(400).json({ erreur: 'Champs manquants.' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);

    const [result] = await db.query(
      'INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, role) VALUES (?, ?, ?, ?, ?,?)',
      [nom, '', email, hash, telephone || null, role]
    );
    const idUtilisateur = result.insertId;

    // Créer la ligne dans la table spécifique selon le rôle choisi
    if (role === 'producteur') {
      await db.query('INSERT INTO producteur (id_utilisateur) VALUES (?)', [idUtilisateur]);
    } else if (role === 'acheteur') {
      await db.query('INSERT INTO acheteur (id_utilisateur, nom_complet) VALUES (?, ?)', [idUtilisateur, nom]);
    } else if (role === 'transporteur') {
      await db.query('INSERT INTO transporteur (id_utilisateur) VALUES (?)', [idUtilisateur]);
    }

    res.status(201).json({ message: 'Compte créé avec succès.', id: idUtilisateur });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé.' });
    }
    res.status(500).json({ erreur: err.message });
  }
});

// ---------- CONNEXION ----------
app.post('/api/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const [rows] = await db.query('SELECT * FROM utilisateur WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }
    const utilisateur = rows[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }
    res.json({
      message: 'Connexion réussie.',
      utilisateur: { id: utilisateur.id_utilisateur, nom: utilisateur.nom, email: utilisateur.email , role: utilisateur.role }
    });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// ---------- PAIEMENT (inchangé, toujours en mémoire pour l'instant) ----------
const paiements = {};
app.post('/api/paiement', (req, res) => {
  const { telephone, montant, operateur } = req.body;
  if (!telephone || !montant || !['MTN', 'ORANGE'].includes(operateur)) {
    return res.status(400).json({ erreur: 'donnees invalides' });
  }
  const id = 'PAY' + Date.now();
  paiements[id] = { id, telephone, montant, operateur, statut: 'EN_ATTENTE' };
  setTimeout(() => { paiements[id].statut = 'REUSSI'; }, 5000);
  res.status(201).json(paiements[id]);
});

app.get('/api/paiement/:id', (req, res) => {
  const p = paiements[req.params.id];
  if (!p) return res.status(404).json({ erreur: 'paiement introuvable' });
  res.json(p);
});

// ---------- ASSIGNATION TRANSPORTEUR (corrigé pour MySQL) ----------
function calculerDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

app.post('/api/commandes/:id/assigner-transporteur', async (req, res) => {
  try {
    const { id } = req.params;
    const [commandes] = await db.query('SELECT * FROM commande WHERE id_commande = ?', [id]);
    if (commandes.length === 0) return res.status(404).json({ erreur: 'Commande introuvable.' });

    const [transporteurs] = await db.query(
      `SELECT t.id_utilisateur, u.nom, t.statut_disponibilite
       FROM transporteur t JOIN utilisateur u ON t.id_utilisateur = u.id_utilisateur
       WHERE t.statut_disponibilite = 'disponible'`
    );
    if (transporteurs.length === 0) return res.status(404).json({ erreur: 'Aucun transporteur disponible.' });

    // NOTE: il faudra stocker latitude/longitude du transporteur pour un vrai calcul de distance
    const meilleur = transporteurs[0];

    await db.query('UPDATE commande SET id_trajet = NULL WHERE id_commande = ?', [id]); // à adapter selon ta logique de trajet
    res.json({ message: `Transporteur assigné : ${meilleur.nom}`, transporteur: meilleur });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});
// ---------- OFFRES ----------
app.get('/api/offres', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id_produit, p.nom, p.categorie, p.nature_culture, p.prix_unitaire,
              p.quantite_disponible_kg, p.description, p.date_publication,
              u.nom AS producteur_nom, pr.nom_cooperative, pr.localisation
       FROM produit p
       JOIN utilisateur u ON u.id_utilisateur = p.id_producteur
       LEFT JOIN producteur pr ON pr.id_utilisateur = p.id_producteur
       WHERE p.statut = 'en_cours' AND p.quantite_disponible_kg > 0
       ORDER BY p.date_publication DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.post('/api/offres', async (req, res) => {
  try {
    const { id_producteur, nom, categorie, nature_culture, prix_unitaire, quantite_disponible_kg, description } = req.body;
    if (!id_producteur || !nom || !prix_unitaire || !quantite_disponible_kg) {
      return res.status(400).json({ erreur: 'Champs manquants.' });
    }
    const [result] = await db.query(
      `INSERT INTO produit (id_producteur, nom, categorie, nature_culture, prix_unitaire, quantite_disponible_kg, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_producteur, nom, categorie || null, nature_culture || null, prix_unitaire, quantite_disponible_kg, description || null]
    );
    res.status(201).json({ id_produit: result.insertId, message: 'Offre publiée.' });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.post('/api/commandes', async (req, res) => {
  try {
    const { acheteur_id, id_produit, quantite } = req.body;
    if (!acheteur_id || !id_produit || !quantite || quantite <= 0) {
      return res.status(400).json({ erreur: 'Données invalides.' });
    }
    const [rows] = await db.query(
      "SELECT prix_unitaire, quantite_disponible_kg FROM produit WHERE id_produit = ? AND statut = 'en_cours'",
      [id_produit]
    );
    if (rows.length === 0) return res.status(404).json({ erreur: 'Offre introuvable ou retirée.' });
    if (quantite > rows[0].quantite_disponible_kg) {
      return res.status(400).json({ erreur: 'Quantité supérieure au stock disponible.' });
    }
    const montant = rows[0].prix_unitaire * quantite;
    const [r] = await db.query(
      'INSERT INTO commande (id_acheteur, date_commande, montant_total, statut_paiement) VALUES (?, CURDATE(), ?, ?)',
      [acheteur_id, montant, 'non_paye']
    );
    await db.query(
      'INSERT INTO ligne_commande (id_commande, id_produit, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
      [r.insertId, id_produit, quantite, rows[0].prix_unitaire]
    );
    res.status(201).json({ commande_id: r.insertId, montant_total: montant });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});
const { demanderPaiement, verifierStatutPaiement } = require('./momo');

app.post('/api/paiement/initier', async (req, res) => {
  try {
    const { commande_id, telephone, montant } = req.body;
    const referenceId = await demanderPaiement(telephone, montant);

    await db.query(
      'INSERT INTO paiement (id_commande, montant, mode_paiement, statut) VALUES (?, ?, ?, ?)',
      [commande_id, montant, 'MTN_MOMO', 'EN_ATTENTE']
    );

    res.json({ referenceId, message: 'Paiement initié, en attente de confirmation.' });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.get('/api/paiement/statut/:referenceId/:commande_id', async (req, res) => {
  try {
    const statut = await verifierStatutPaiement(req.params.referenceId);
    if (statut === 'SUCCESSFUL') {
      await db.query('UPDATE paiement SET statut = ? WHERE id_commande = ?', ['PAYE', req.params.commande_id]);
      await db.query('UPDATE commande SET statut_paiement = ? WHERE id_commande = ?', ['paye', req.params.commande_id]);
      // Déclenche automatiquement l'assignation du transporteur
      await assignerTransporteurAutomatique(req.params.commande_id);
    }
    res.json({ statut });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use('/api/acheteur', require('./routes/acheteurRoutes'));
app.use('/api/transporteur', require('./routes/transporteurRoutes'));
app.use('/api/acheteur', require('./routes/acheteurRoutes'));
app.use('/api/transporteur', require('./routes/transporteurRoutes'));
app.listen(PORT, () => console.log(`serveur sur http://localhost:${PORT}`));