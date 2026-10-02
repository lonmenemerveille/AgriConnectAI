const Produit = require('../models/produitModel');
const Commande = require('../models/commandeModel');
const Livraison = require('../models/livraisonModel');
const Evaluation = require('../models/evaluationModel');
const paiement = require('../services/paiementService');
const { rejeter, gerer } = require('../utils/erreur');

const MODES_PAIEMENT = ['mtn_momo', 'orange_money', 'carte'];

exports.listerProduits = gerer(async (req, res) => {
  res.json(await Produit.filtrer(req.query));
});

exports.passerCommande = gerer(async (req, res) => {
  const { lignes, mode_paiement, telephone } = req.body;
  if (!Array.isArray(lignes) || !lignes.length) rejeter(400, 'Le panier est vide.');
  if (!MODES_PAIEMENT.includes(mode_paiement)) rejeter(400, 'Choisissez un mode de paiement.');

  const nettes = lignes.map((l) => ({ id_produit: Number(l.id_produit), quantite: Number(l.quantite) }));
  if (nettes.some((l) => !l.id_produit || !(l.quantite > 0))) rejeter(400, 'Quantité invalide.');

  const resultat = await Commande.creer(req.idAcheteur, nettes,
    (montant) => paiement.payer({ montant, mode: mode_paiement, telephone }));
  res.status(201).json(resultat);
});

exports.listerLivraisons = gerer(async (req, res) => {
  res.json(await Livraison.lister(req.idAcheteur));
});

exports.detailLivraison = gerer(async (req, res) => {
  const d = await Livraison.detail(Number(req.params.id), req.idAcheteur);
  if (!d) rejeter(404, 'Livraison introuvable.');
  res.json(d);
});

exports.confirmerReception = gerer(async (req, res) => {
  const ok = await Livraison.confirmerReception(Number(req.params.id), req.idAcheteur);
  if (!ok) rejeter(409, "Cette livraison ne peut pas être validée pour l'instant.");
  res.json({ statut: 'validee' });
});

exports.evaluerProducteur = gerer(async (req, res) => {
  const { id_producteur, note, commentaire } = req.body;
  const n = Number(note);
  if (!Number.isInteger(n) || n < 1 || n > 5) rejeter(400, 'La note doit être comprise entre 1 et 5.');
  if (!(await Evaluation.aCommandeChez(req.idAcheteur, Number(id_producteur)))) {
    rejeter(403, 'Vous ne pouvez noter que les producteurs chez qui vous avez commandé.');
  }
  await Evaluation.creer(req.idAcheteur, Number(id_producteur), n, commentaire);
  res.status(201).json({ message: 'Avis enregistré.' });
});