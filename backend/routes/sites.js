/**
 * Routes Sites
 * Gestion des sites multi-ludothèque
 */

const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const { verifyToken } = require('../middleware/auth');

// Protection de toutes les routes
router.use(verifyToken);

// ==================== CRUD Sites ====================

// GET /api/sites - Liste tous les sites
router.get('/', siteController.getAll);

// GET /api/sites/:id - Détails d'un site
router.get('/:id', siteController.getById);

// POST /api/sites - Créer un site
router.post('/', siteController.create);

// PUT /api/sites/:id - Modifier un site
router.put('/:id', siteController.update);

// DELETE /api/sites/:id - Désactiver un site
router.delete('/:id', siteController.delete);

// POST /api/sites/reorder - Réordonner les sites
router.post('/reorder', siteController.reorder);

// ==================== Horaires ====================

// GET /api/sites/:id/horaires - Horaires d'un site
router.get('/:id/horaires', siteController.getHoraires);

// POST /api/sites/:id/horaires - Ajouter un créneau
router.post('/:id/horaires', siteController.addHoraire);

// PUT /api/sites/:id/horaires - Remplacer tous les horaires
router.put('/:id/horaires', siteController.setHoraires);

// PUT /api/sites/:id/horaires/:horaireId - Modifier un créneau
router.put('/:id/horaires/:horaireId', siteController.updateHoraire);

// DELETE /api/sites/:id/horaires/:horaireId - Supprimer un créneau
router.delete('/:id/horaires/:horaireId', siteController.deleteHoraire);

// ==================== Fermetures ====================

// GET /api/sites/:id/fermetures - Fermetures d'un site
router.get('/:id/fermetures', siteController.getFermetures);

// POST /api/sites/:id/fermetures - Ajouter une fermeture
router.post('/:id/fermetures', siteController.addFermeture);

// DELETE /api/sites/:id/fermetures/:fermetureId - Supprimer une fermeture
router.delete('/:id/fermetures/:fermetureId', siteController.deleteFermeture);

// ==================== Disponibilité ====================

// GET /api/sites/:id/ouvert - Vérifier si ouvert maintenant
router.get('/:id/ouvert', siteController.isOpen);

module.exports = router;
