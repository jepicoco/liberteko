/**
 * Routes Aide Admin
 * Endpoints pour l'aide et la documentation admin
 */
const express = require('express');
const router = express.Router();
const aideController = require('../controllers/aideController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes nécessitent une authentification (utilisateur admin connecté)
router.use(verifyToken);

// GET /api/aide/modules - Liste des modules d'aide
router.get('/modules', aideController.getModules);

// GET /api/aide/modules/:code - Détail d'un module
router.get('/modules/:code', aideController.getModule);

// GET /api/aide/search?q=... - Recherche dans l'aide
router.get('/search', aideController.search);

// GET /api/aide/feature/:moduleCode/:featureId - Détail d'une feature
router.get('/feature/:moduleCode/:featureId', aideController.getFeature);

// POST /api/aide/cache/invalidate - Invalider le cache (admin uniquement)
router.post('/cache/invalidate', checkRole(['administrateur']), aideController.invalidateCache);

module.exports = router;
