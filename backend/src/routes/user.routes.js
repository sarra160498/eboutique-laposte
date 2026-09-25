const router = require('express').Router();
const { list, updateRole } = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ADMIN_ROLES } = require('../constants/roles');

// Gestion des comptes : accessible aux trois niveaux d'admin (périmètre géré
// dans le contrôleur).
router.use(auth, requireRole(...ADMIN_ROLES));
router.get('/', list);
router.patch('/:id', updateRole);

module.exports = router;
