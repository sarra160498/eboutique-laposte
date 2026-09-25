const router = require('express').Router();
const { list, create, update, remove } = require('../controllers/product.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ROLES } = require('../constants/roles');

// Catalogue public en lecture.
router.get('/', list);

// Gestion réservée à l'admin général (le catalogue est national).
router.post('/', auth, requireRole(ROLES.ADMIN_GENERAL), create);
router.put('/:id', auth, requireRole(ROLES.ADMIN_GENERAL), update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN_GENERAL), remove);

module.exports = router;
