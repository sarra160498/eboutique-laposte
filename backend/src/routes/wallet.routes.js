const router = require('express').Router();
const { getWallet, transfer } = require('../controllers/wallet.controller');
const auth = require('../middleware/auth');

// Le portefeuille e-Dinar est privé : connexion requise.
router.use(auth);
router.get('/', getWallet);
router.post('/transfer', transfer);

module.exports = router;
