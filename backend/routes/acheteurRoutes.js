const router = require('express').Router();
const identifier = require('../middlewares/identifier');
const c = require('../controllers/acheteurController');

router.use(identifier);

router.get('/produits', c.listerProduits);
router.post('/commandes', c.passerCommande);
router.get('/livraisons', c.listerLivraisons);
router.get('/livraisons/:id', c.detailLivraison);
router.post('/livraisons/:id/confirmer', c.confirmerReception);
router.post('/evaluations', c.evaluerProducteur);

module.exports = router;