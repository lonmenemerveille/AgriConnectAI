const router = require('express').Router();
const db = require('../db');
const Transporteur = require('../models/transporteurModel');
const { rejeter, gerer } = require('../utils/erreur');

// TEMPORAIRE : même identification que pour l'acheteur
router.post('/position', gerer(async (req, res) => {
  const id = Number(req.headers['x-user-id']);
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!id || Number.isNaN(lat) || Number.isNaN(lng)) rejeter(400, 'Position invalide.');
  await Transporteur.majPosition(db, id, lat, lng);
  res.json({ ok: true });
}));

module.exports = router;