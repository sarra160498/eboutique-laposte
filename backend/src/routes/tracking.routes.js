const router = require('express').Router();
const { track } = require('../controllers/tracking.controller');

// Route publique — pas besoin d'être connecté pour suivre un colis.
router.get('/:reference', track);

module.exports = router;
