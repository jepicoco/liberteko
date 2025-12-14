/**
 * Routes pour les imports externes via API Key
 * Utilise par les extensions Chrome, etc.
 */

const express = require('express');
const router = express.Router();
const externalImportController = require('../controllers/externalImportController');
const { verifyApiKey, checkCollectionAccess } = require('../middleware/apiKeyAuth');

// ==================== JEUX ====================

// Verifier si un jeu existe par EAN
router.get('/jeux/check-ean/:ean',
  verifyApiKey(['jeux:read']),
  checkCollectionAccess('jeu'),
  externalImportController.checkJeuByEan
);

// Creer ou mettre a jour un jeu
router.post('/jeux',
  verifyApiKey(['jeux:create']),
  checkCollectionAccess('jeu'),
  externalImportController.createOrUpdateJeu
);

// ==================== IMAGES ====================

// Upload image en base64
router.post('/upload-image',
  verifyApiKey(['images:upload']),
  externalImportController.uploadImageBase64
);

// Upload image depuis URL
router.post('/upload-image-url',
  verifyApiKey(['images:upload']),
  externalImportController.uploadImageFromUrl
);

// ==================== STATS ====================

// Stats de la cle API
router.get('/stats',
  verifyApiKey([]),
  externalImportController.getApiKeyStats
);

module.exports = router;
