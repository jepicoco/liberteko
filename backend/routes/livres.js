const express = require('express');
const router = express.Router();
const livreController = require('../controllers/livreController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques (référentiels)
router.get('/genres', livreController.getGenres);
router.get('/formats', livreController.getFormats);
router.get('/collections', livreController.getCollections);
router.get('/emplacements', livreController.getEmplacements);
router.get('/stats', livreController.getStats);

// Routes CRUD pour les livres
router.get('/', livreController.getAllLivres);
router.get('/:id', livreController.getLivreById);

// Routes protégées (nécessitent authentification)
router.post('/', verifyToken, livreController.createLivre);
router.put('/:id', verifyToken, livreController.updateLivre);
router.delete('/:id', verifyToken, livreController.deleteLivre);

module.exports = router;
