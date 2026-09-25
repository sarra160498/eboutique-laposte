const router = require('express').Router();
const { list, create, manage, updateStatus } = require('../controllers/order.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { STAFF_ROLES } = require('../constants/roles');

// Toutes les routes commandes nécessitent d'être connecté.
router.use(auth);

// Espace client : ses propres commandes.
router.get('/', list);
router.post('/', create);

// Espace pro : file de travail + changement de statut (personnel uniquement).
router.get('/manage', requireRole(...STAFF_ROLES), manage);
router.patch('/:id/status', requireRole(...STAFF_ROLES), updateStatus);

module.exports = router;
