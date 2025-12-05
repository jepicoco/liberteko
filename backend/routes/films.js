const express = require('express');
const router = express.Router();
const filmController = require('../controllers/filmController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(verifyToken);

// ============================================
// Films CRUD
// ============================================
router.get('/', filmController.getAll);
router.get('/stats', filmController.getStats);
router.get('/:id', filmController.getById);
router.post('/', filmController.create);
router.put('/:id', filmController.update);
router.delete('/:id', filmController.delete);

// ============================================
// Référentiels - Genres Films
// ============================================
router.get('/referentiels/genres', filmController.getGenres);
router.post('/referentiels/genres', filmController.createGenre);
router.put('/referentiels/genres/:id', filmController.updateGenre);
router.delete('/referentiels/genres/:id', filmController.deleteGenre);

// ============================================
// Référentiels - Réalisateurs
// ============================================
router.get('/referentiels/realisateurs', filmController.getRealisateurs);
router.post('/referentiels/realisateurs', filmController.createRealisateur);
router.put('/referentiels/realisateurs/:id', filmController.updateRealisateur);
router.delete('/referentiels/realisateurs/:id', filmController.deleteRealisateur);

// ============================================
// Référentiels - Acteurs
// ============================================
router.get('/referentiels/acteurs', filmController.getActeurs);
router.post('/referentiels/acteurs', filmController.createActeur);
router.put('/referentiels/acteurs/:id', filmController.updateActeur);
router.delete('/referentiels/acteurs/:id', filmController.deleteActeur);

// ============================================
// Référentiels - Studios
// ============================================
router.get('/referentiels/studios', filmController.getStudios);
router.post('/referentiels/studios', filmController.createStudio);
router.put('/referentiels/studios/:id', filmController.updateStudio);
router.delete('/referentiels/studios/:id', filmController.deleteStudio);

// ============================================
// Référentiels - Supports Vidéo
// ============================================
router.get('/referentiels/supports', filmController.getSupports);
router.post('/referentiels/supports', filmController.createSupport);
router.put('/referentiels/supports/:id', filmController.updateSupport);
router.delete('/referentiels/supports/:id', filmController.deleteSupport);

// ============================================
// Référentiels - Emplacements Films
// ============================================
router.get('/referentiels/emplacements', filmController.getEmplacements);
router.post('/referentiels/emplacements', filmController.createEmplacement);
router.put('/referentiels/emplacements/:id', filmController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', filmController.deleteEmplacement);

module.exports = router;
