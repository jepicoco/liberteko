/**
 * Disques Routes
 * Routes for music discs/vinyl management
 */

const express = require('express');
const router = express.Router();
const disqueController = require('../controllers/disqueController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module discothèque
const checkDiscoAccess = checkModuleAccess('discotheque');

// All routes require authentication
router.use(verifyToken);

// Stats
router.get('/stats', disqueController.getStats);

// ============================================
// Référentiels - Genres Musicaux
// ============================================
router.get('/referentiels/genres', disqueController.getGenres);
router.post('/referentiels/genres', isAgent(), checkDiscoAccess, disqueController.createGenre);
router.put('/referentiels/genres/:id', isAgent(), checkDiscoAccess, disqueController.updateGenre);
router.delete('/referentiels/genres/:id', isAgent(), checkDiscoAccess, disqueController.deleteGenre);
router.patch('/referentiels/genres/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleGenre);

// ============================================
// Référentiels - Formats Disques
// ============================================
router.get('/referentiels/formats', disqueController.getFormats);
router.post('/referentiels/formats', isAgent(), checkDiscoAccess, disqueController.createFormat);
router.put('/referentiels/formats/:id', isAgent(), checkDiscoAccess, disqueController.updateFormat);
router.delete('/referentiels/formats/:id', isAgent(), checkDiscoAccess, disqueController.deleteFormat);
router.patch('/referentiels/formats/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleFormat);

// ============================================
// Référentiels - Emplacements Disques
// ============================================
router.get('/referentiels/emplacements', disqueController.getEmplacements);
router.post('/referentiels/emplacements', isAgent(), checkDiscoAccess, disqueController.createEmplacement);
router.put('/referentiels/emplacements/:id', isAgent(), checkDiscoAccess, disqueController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', isAgent(), checkDiscoAccess, disqueController.deleteEmplacement);
router.patch('/referentiels/emplacements/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleEmplacement);

// ============================================
// Référentiels - Artistes
// ============================================
router.get('/referentiels/artistes', disqueController.getArtistes);
router.post('/referentiels/artistes', isAgent(), checkDiscoAccess, disqueController.createArtiste);
router.put('/referentiels/artistes/:id', isAgent(), checkDiscoAccess, disqueController.updateArtiste);
router.delete('/referentiels/artistes/:id', isAgent(), checkDiscoAccess, disqueController.deleteArtiste);
router.patch('/referentiels/artistes/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleArtiste);

// ============================================
// Référentiels - Labels
// ============================================
router.get('/referentiels/labels', disqueController.getLabels);
router.post('/referentiels/labels', isAgent(), checkDiscoAccess, disqueController.createLabel);
router.put('/referentiels/labels/:id', isAgent(), checkDiscoAccess, disqueController.updateLabel);
router.delete('/referentiels/labels/:id', isAgent(), checkDiscoAccess, disqueController.deleteLabel);
router.patch('/referentiels/labels/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleLabel);

// ============================================
// CRUD Disques
// ============================================
router.get('/', disqueController.getAllDisques);
router.get('/:id', disqueController.getDisqueById);
router.post('/', isAgent(), checkDiscoAccess, disqueController.createDisque);
router.put('/:id', isAgent(), checkDiscoAccess, disqueController.updateDisque);
router.delete('/:id', isAgent(), checkDiscoAccess, disqueController.deleteDisque);

module.exports = router;
