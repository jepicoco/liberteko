/**
 * Routes admin pour la gestion des chartes usager
 * Toutes les routes necessitent authentification + role administrateur
 */

const express = require('express');
const router = express.Router();
const charteController = require('../controllers/charteController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Protection de toutes les routes - admin uniquement
router.use(verifyToken);
router.use(checkRole(['administrateur']));

// GET /api/chartes - Liste toutes les chartes
router.get('/', charteController.getAll);

// GET /api/chartes/active - Recupere la charte active
router.get('/active', charteController.getActive);

// GET /api/chartes/:id - Recupere une charte par ID
router.get('/:id', charteController.getById);

// POST /api/chartes - Cree une nouvelle charte
router.post('/', charteController.create);

// PUT /api/chartes/:id - Met a jour une charte
router.put('/:id', charteController.update);

// DELETE /api/chartes/:id - Supprime une charte
router.delete('/:id', charteController.delete);

// POST /api/chartes/:id/activer - Active une charte
router.post('/:id/activer', charteController.activer);

// POST /api/chartes/:id/dupliquer - Duplique une charte
router.post('/:id/dupliquer', charteController.dupliquer);

// GET /api/chartes/:id/stats - Statistiques d'une charte
router.get('/:id/stats', charteController.getStats);

module.exports = router;
