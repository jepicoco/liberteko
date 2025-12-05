/**
 * Disques Routes
 * Routes for music discs/vinyl management
 */

const express = require('express');
const router = express.Router();
const disqueController = require('../controllers/disqueController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Référentiels (must be before /:id routes)
router.get('/referentiels/genres', disqueController.getGenres);
router.get('/referentiels/formats', disqueController.getFormats);
router.get('/referentiels/labels', disqueController.getLabels);
router.get('/referentiels/emplacements', disqueController.getEmplacements);
router.get('/referentiels/artistes', disqueController.getArtistes);

// Create new referentiel items
router.post('/referentiels/artistes', disqueController.createArtiste);
router.post('/referentiels/labels', disqueController.createLabel);

// Stats
router.get('/stats', disqueController.getStats);

// CRUD Disques
router.get('/', disqueController.getAllDisques);
router.get('/:id', disqueController.getDisqueById);
router.post('/', disqueController.createDisque);
router.put('/:id', disqueController.updateDisque);
router.delete('/:id', disqueController.deleteDisque);

module.exports = router;
