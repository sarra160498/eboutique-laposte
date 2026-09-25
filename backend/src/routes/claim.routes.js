const router = require('express').Router();
const { listMine, create, manage, updateStatus } = require('../controllers/claim.controller');
const auth = require('../middleware/auth');
const { requireRoleOrMission } = require('../middleware/teamAccess');
const { ADMIN_ROLES } = require('../constants/roles');

// Toutes les routes réclamations nécessitent d'être connecté.
router.use(auth);

// Espace client : ses propres réclamations.
router.get('/', listMine);
router.post('/', create);

// Traitement des réclamations : administrateurs + équipes « service après-vente ».
router.get('/manage', requireRoleOrMission(ADMIN_ROLES, ['sav']), manage);
router.patch('/:id/status', requireRoleOrMission(ADMIN_ROLES, ['sav']), updateStatus);

module.exports = router;
