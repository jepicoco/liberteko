/**
 * Routes Communautes de Communes
 * CRUD pour les intercommunalites
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/communautesCommunesController');
const { verifyToken } = require('../middleware/auth');
const { checkRole, checkMinRole } = require('../middleware/checkRole');

// Liste et detail (gestionnaire+)
router.get('/', verifyToken, checkMinRole('gestionnaire'), controller.getAll);
router.get('/:id', verifyToken, checkMinRole('gestionnaire'), controller.getById);

// CRUD (admin seulement)
router.post('/', verifyToken, checkRole(['administrateur']), controller.create);
router.put('/:id', verifyToken, checkRole(['administrateur']), controller.update);
router.delete('/:id', verifyToken, checkRole(['administrateur']), controller.remove);

// Gestion des communes membres (admin seulement)
router.post('/:id/communes', verifyToken, checkRole(['administrateur']), controller.addCommunes);
router.delete('/:id/communes/:communeId', verifyToken, checkRole(['administrateur']), controller.removeCommune);

module.exports = router;
