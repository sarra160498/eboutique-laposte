const router = require('express').Router();
const { rates, quote } = require('../controllers/shipping.controller');

// Routes publiques : consultation de la grille et estimation d'un tarif.
router.get('/rates', rates);
router.post('/quote', quote);

module.exports = router;
