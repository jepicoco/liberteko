/**
 * Routes pour la gestion des cles API
 * Accessibles uniquement aux administrateurs
 */

const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes necessitent une authentification admin
router.use(verifyToken);
router.use(checkRole(['administrateur']));

// Liste des permissions disponibles
router.get('/permissions', apiKeyController.obtenirPermissions);

// CRUD des cles API
router.get('/', apiKeyController.listerCles);
router.get('/:id', apiKeyController.obtenirCle);
router.post('/', apiKeyController.creerCle);
router.put('/:id', apiKeyController.mettreAJourCle);
router.delete('/:id', apiKeyController.supprimerCle);

// Actions specifiques
router.post('/:id/activer', apiKeyController.activerCle);
router.post('/:id/desactiver', apiKeyController.desactiverCle);
router.post('/:id/reset-compteur', apiKeyController.resetCompteur);

module.exports = router;
