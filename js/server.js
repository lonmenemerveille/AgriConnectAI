const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); // 🔥 Permet à Node de lire les formulaires au format JSON

// Configuration de la politique de sécurité pour le chargement des images
app.use('/images', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'images')));

// Crée un fichier de base de données réel directement dans votre projet VS Code
const dbPath = path.resolve(__dirname, 'agriconnect.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error("Erreur SQLite :", err.message);
  console.log("Connecté avec succès à la base de données intégrée AgriConnect (SQLite) !");
});


// Initialisation de la table et des 36 produits du Cameroun
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS catalogue_produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_produit TEXT NOT NULL,
    categorie TEXT,
    bassins_production TEXT,
    prix_unitaire_moyen_fcfa INTEGER,
    format_vente_detail TEXT,
    image_path TEXT

  )`);
  db.run(`CREATE TABLE IF NOT EXISTS transporteurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT,
  latitude REAL,
  longitude REAL,
  disponible INTEGER DEFAULT 1
)`);

  // Vérifie si la table est vide avant d'insérer pour éviter les doublons au redémarrage
  db.get("SELECT COUNT(*) AS count FROM catalogue_produits", [], (err, row) => {
    if (err) return console.error(err.message);
    
    if (row && row.count === 0) {
      const stmt = db.prepare(`INSERT INTO catalogue_produits (nom_produit, categorie, bassins_production, prix_unitaire_moyen_fcfa, format_vente_detail, image) VALUES (?, ?, ?, ?, ?, ?)`);
      
      const produits = [
        ['Banane Plantain', 'Féculent', 'Centre, Est, Ouest', 100, 'Unité (doigt) / Régime à 3500 FCFA', 'banane_douce.jpg'],
        ['Banane Douce', 'Fruit', 'Littoral (Moungo), Sud-Ouest', 200, 'Tas de 5 à 7 doigts / Régime à 2000 FCFA'],
        ['Manioc', 'Tubercule', 'Centre, Sud, Est', 300, 'Tas de tubercules frais'],
        ['Fève de Cacao', 'Produit de rente', 'Centre, Sud, Sud-Ouest', 2500, 'Kilogramme (fèves séchées)', 'cacao.jpg'],
        ['Poivron', 'Légume-Fruit', 'Ouest, Centre', 200, 'Tas de 4 à 6 poivrons'],
        ['Tomate', 'Légume-Fruit', 'Ouest (Foumbot), Centre', 500, 'Grand tas de marché'],
        ['Orange', 'Agrume', 'Ouest (Foumbot), Centre (Bafia)', 250, 'Tas de 4 à 6 unités'],
        ['Citron Vert', 'Agrume', 'Adamaoua, Est', 150, 'Tas de 5 à 8 citrons'],
        ['Mandarine', 'Agrume', 'Ouest (Dschang, Bangangté)', 200, 'Petit tas de marché'],
        ['Pamplemousse / Pomelo', 'Agrume', 'Littoral (Nkongsamba), Sud', 200, 'Unité'],
        ['Avocat', 'Fruit', 'Ouest (Mbouda), Nord-Ouest', 300, 'Unité (Gros calibre beurré)'],
        ['Ananas', 'Fruit', 'Centre (Bassin d Awaé), Littoral', 500, 'Unité (Pain de Sucre)'],
        ['Papaye', 'Fruit', 'Est (Bertoua), Centre (Mbalmayo)', 600, 'Unité (Variété Solo)'],
        ['Corossol', 'Fruit', 'Sud-Ouest, Littoral (Édéa)', 1000, 'Unité'],
        ['Pastèque', 'Fruit', 'Extrême-Nord (Maroua), Centre', 1500, 'Unité (Gros calibre)'],
        ['Melon', 'Fruit', 'Nord, Diamaré, Ouest', 600, 'Unité'],
        ['Noix de Coco', 'Fruit', 'Littoral (Kribi), Sud-Ouest', 300, 'Unité'],
        ['Goyave', 'Fruit', 'Centre, Est, Ouest', 200, 'Tas de 5 à 7 goyaves'],
        ['Fruit de la Passion', 'Fruit', 'Hauteurs de l Ouest (Dschang)', 500, 'Tas de 6 à 10 fruits'],
        ['Fruit du Dragon (Pitaya)', 'Fruit', 'Centre (Périphérie de Yaoundé)', 1500, 'Unité (Fruit de luxe)'],
        ['Grenade', 'Fruit', 'Zone sahélienne (Nord)', 450, 'Unité'],
        ['Fraise', 'Fruit', 'Sud (Lolodorf), Nord-Ouest', 2000, 'Barquette de 250g'],
        ['Safou (Prune)', 'Fruit', 'Centre (Makak), Ouest (Ndé)', 400, 'Tas de 4 à 6 prunes'],
        ['Mboá (Anonidium)', 'Fruit', 'Forêt dense (Sud, Est)', 2000, 'Unité (Fruit sauvage)'],
        ['Noix de Kola', 'Fruit traditionnel', 'Ouest, Nord-Ouest, Centre', 100, 'Unité'],
        ['Bitter Kola (Oné)', 'Fruit traditionnel', 'Sud, Littoral, Sud-Ouest', 100, 'Unité'],
        ['Noix de Coula', 'Fruit traditionnel', 'Forêts de l Est et du Sud', 300, 'Gobelet décortiqué'],
        ['Fruit de l arbre à pain', 'Fruit', 'Littoral (Nkongsamba)', 450, 'Unité'],
        ['Prune de Cythère', 'Fruit', 'Littoral, Centre', 200, 'Tas de 5 fruits verts'],
        ['Ramboutan', 'Fruit', 'Littoral (Njombé-Penja)', 500, 'Tas de 5 fruits'],
        ['Mangoustan', 'Fruit', 'Vergers du Littoral', 2200, 'Kilogramme'],
        ['Datte', 'Fruit', 'Extrême-Nord (Maroua, Kousséri)', 750, 'Pot de marché'],
        ['Pain de Singe (Baobab)', 'Fruit', 'Nord, Extrême-Nord (Garoua)', 200, 'Coque entière'],
        ['Tamarin', 'Fruit', 'Nord et Extrême-Nord', 350, 'Boule de pulpe concentrée'],
        ['Jujube', 'Fruit', 'Extrême-Nord', 150, 'Grand verre de billes séchées'],
        ['Pomme locale (Pomme d eau)', 'Fruit', 'Littoral (Douala), Centre', 250, 'Tas de 6 pommes d eau']
      ];

      produits.forEach(p => stmt.run(p));
      stmt.finalize();
      console.log("✓ 36 fruits du Cameroun insérés avec succès dans la base intégrée !");
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS transporteurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT,
  latitude REAL,
  longitude REAL,
  disponible INTEGER DEFAULT 1
)`);
});

// =========================================================================
// ROUTE GET : RETROUVER LES PRODUITS POUR LE CATALOGUE (ACCUEIL & PRODUCTEUR)
// =========================================================================
app.get('/api/produits', (req, res) => {
  db.all("SELECT * FROM catalogue_produits ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Création de la table réelle pour les commandes de fret logistique
db.run(`CREATE TABLE IF NOT EXISTS commandes_transport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_produit TEXT,
    quantite INTEGER,
    bassin_depart TEXT,
    ville_arrivee TEXT,
    distance_km INTEGER,
    frais_fcfa INTEGER,
    transporteur_attribue TEXT,
    statut TEXT DEFAULT 'En attente'

)`);


// Route API POST : Enregistrer une affectation intelligente de transport
app.post('/api/transport/assigner', (req, res) => {
    const { nom_produit, quantite, bassin_depart, ville_arrivee, distance_km, frais_fcfa, transporteur_attribue } = req.body;
    const sql = `INSERT INTO commandes_transport (nom_produit, quantite, bassin_depart, ville_arrivee, distance_km, frais_fcfa, transporteur_attribue) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [nom_produit, quantite, bassin_depart, ville_arrivee, distance_km, frais_fcfa, transporteur_attribue], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: "Transport planifié avec succès !" });
    });
});

// Route API GET : Permet à l'espace transporteur de lire ses commandes réelles
app.get('/api/transport/commandes', (req, res) => {
    db.all("SELECT * FROM commandes_transport ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =========================================================================
// ROUTE POST : AJOUTER UN PRODUIT DANS LA BASE SQLITE (ESPACE PRODUCTEUR)
// =========================================================================
app.post('/api/produits', (req, res) => {
  const { nom_produit, categorie, bassins_production, format_vente_detail, prix_unitaire_moyen_fcfa } = req.body;

  // Sécurité élémentaire : Validation des données entrantes
  if (!nom_produit || !categorie || !bassins_production || !format_vente_detail || !prix_unitaire_moyen_fcfa) {
    return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
  }

  // 🔥 Rectifié pour cibler 'catalogue_produits' de manière unifiée
  const sql = `INSERT INTO catalogue_produits (nom_produit, categorie, bassins_production, format_vente_detail, prix_unitaire_moyen_fcfa) VALUES (?, ?, ?, ?, ?)`;
  const params = [nom_produit, categorie, bassins_production, format_vente_detail, prix_unitaire_moyen_fcfa];

  db.run(sql, params, function (err) {
    if (err) { // 🔥 Correction du bug de variable 'erreur' inexistante
      console.error("Erreur SQLite lors de l'insertion :", err.message);
      return res.status(500).json({ error: "Erreur lors de l'enregistrement du produit." });
    }
    
    // On renvoie un code 201 (Création réussie) avec le nouvel ID
    res.status(201).json({
      message: "Offre agricole publiée avec succès !",
      id: this.lastID
    });
    // ==========================================================
// ROUTE DELETE : SUPPRIMER UN PRODUIT DE LA BASE SQLITE (ESPACE PRODUCTEUR)
// ==========================================================
app.delete('/api/produits/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM catalogue_produits WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      console.error("Erreur SQLite lors de la suppression :", err.message);
      return res.status(500).json({ error: "Erreur lors de la suppression du produit." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Produit introuvable." });
    }

    res.status(200).json({ message: "Produit supprimé avec succès !" });
  });
});
  });
});


app.listen(5000, () => console.log('Serveur AgriConnect autonome actif sur : http://localhost:5000'));

