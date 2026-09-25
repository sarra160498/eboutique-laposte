const router = require('express').Router();
const { list, create, update, remove } = require('../controllers/bureau.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ROLES } = require('../constants/roles');

// Liste publique (pour la carte).
router.get('/', list);

// Gestion réservée à l'admin général.
router.post('/', auth, requireRole(ROLES.ADMIN_GENERAL), create);
router.put('/:id', auth, requireRole(ROLES.ADMIN_GENERAL), update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN_GENERAL), remove);

module.exports = router;
