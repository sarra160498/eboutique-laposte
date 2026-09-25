const router = require('express').Router();
const { contacts, directory, conversation, send } = require('../controllers/message.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { STAFF_ROLES } = require('../constants/roles');

// La messagerie interne est réservée au personnel.
router.use(auth, requireRole(...STAFF_ROLES));

router.get('/contacts', contacts);
router.get('/directory', directory);
router.get('/:userId', conversation);
router.post('/', send);

module.exports = router;
