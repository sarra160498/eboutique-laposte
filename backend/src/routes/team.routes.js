const router = require('express').Router();
const ctrl = require('../controllers/team.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ROLES, ADMIN_ROLES, STAFF_ROLES } = require('../constants/roles');

router.use(auth);

// Chaque membre du personnel peut voir ses propres équipes.
router.get('/mine', requireRole(...STAFF_ROLES), ctrl.mine);

// Consultation : tous les admins.
router.get('/', requireRole(...ADMIN_ROLES), ctrl.list);
router.get('/:id/members', requireRole(...ADMIN_ROLES), ctrl.members);

// Gestion des équipes : admin général.
router.post('/', requireRole(ROLES.ADMIN_GENERAL), ctrl.create);
router.put('/:id', requireRole(ROLES.ADMIN_GENERAL), ctrl.update);
router.delete('/:id', requireRole(ROLES.ADMIN_GENERAL), ctrl.remove);
router.post('/:id/members', requireRole(ROLES.ADMIN_GENERAL), ctrl.addMember);
router.delete('/:id/members/:userId', requireRole(ROLES.ADMIN_GENERAL), ctrl.removeMember);

module.exports = router;
