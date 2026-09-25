const router = require('express').Router();
const { dashboard } = require('../controllers/stats.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ADMIN_ROLES } = require('../constants/roles');

// Tableau de bord : administrateurs (et équipes « admin » via requireRole).
router.get('/', auth, requireRole(...ADMIN_ROLES), dashboard);

module.exports = router;
