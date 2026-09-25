const router = require('express').Router();
const { list } = require('../controllers/region.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { ADMIN_ROLES } = require('../constants/roles');

router.get('/', auth, requireRole(...ADMIN_ROLES), list);

module.exports = router;
