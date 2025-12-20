const express = require('express');
const router = express.Router();
const empruntController = require('../controllers/empruntController');
const { verifyToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { structureContext, requireStructureRole } = require('../middleware/structureContext');
const { checkAnyStructureModule } = require('../middleware/checkStructureModule');

// Pour les emprunts, on vérifie qu'il a accès à au moins un module collection
const checkAnyCollectionModule = checkAnyStructureModule(['jeux', 'livres', 'films', 'disques']);

/**
 * @route   GET /api/emprunts/overdue
 * @desc    Get all overdue emprunts
 * @access  Private (benevole+ dans la structure)
 */
router.get('/overdue', verifyToken, structureContext(), requireStructureRole('benevole'), checkAnyCollectionModule, empruntController.getOverdueEmprunts);

/**
 * @route   GET /api/emprunts/limites/:utilisateurId/:module
 * @desc    Get loan limits summary for a user on a specific module
 * @access  Private (benevole+ dans la structure)
 */
router.get('/limites/:utilisateurId/:module', verifyToken, structureContext(), requireStructureRole('benevole'), checkAnyCollectionModule, empruntController.getLimitesSummary);

/**
 * @route   POST /api/emprunts/valider-limites
 * @desc    Pre-validate loan limits without creating the loan
 * @access  Private (benevole+ dans la structure)
 */
router.post('/valider-limites', verifyToken, structureContext(), requireStructureRole('benevole'), empruntController.validerLimites);

/**
 * @route   GET /api/emprunts
 * @desc    Get all emprunts with filters
 * @access  Private (benevole+ dans la structure)
 * @query   ?statut=en_cours&adherent_id=1&jeu_id=2
 */
router.get('/', verifyToken, structureContext(), requireStructureRole('benevole'), checkAnyCollectionModule, validate(schemas.emprunt.list), empruntController.getAllEmprunts);

/**
 * @route   GET /api/emprunts/:id
 * @desc    Get emprunt by ID
 * @access  Private (benevole+ dans la structure)
 */
router.get('/:id', verifyToken, structureContext(), requireStructureRole('benevole'), checkAnyCollectionModule, validate(schemas.emprunt.getById), empruntController.getEmpruntById);

/**
 * @route   POST /api/emprunts
 * @desc    Create new emprunt (loan a game)
 * @access  Private (benevole+ dans la structure)
 */
router.post('/', verifyToken, structureContext({ required: true }), requireStructureRole('benevole'), validate(schemas.emprunt.create), empruntController.createEmprunt);

/**
 * @route   POST /api/emprunts/:id/retour
 * @desc    Return a game
 * @access  Private (benevole+ dans la structure)
 */
router.post('/:id/retour', verifyToken, structureContext({ required: true }), requireStructureRole('benevole'), validate(schemas.emprunt.getById), empruntController.retourEmprunt);

/**
 * @route   POST /api/emprunts/:id/traiter-reservation
 * @desc    Traiter un retour avec réservation en attente
 * @access  Private (benevole+ dans la structure)
 * @body    { action: 'rayon' | 'cote' }
 */
router.post('/:id/traiter-reservation', verifyToken, structureContext({ required: true }), requireStructureRole('benevole'), validate(schemas.emprunt.getById), empruntController.traiterRetourAvecReservation);

/**
 * @route   PUT /api/emprunts/:id
 * @desc    Update emprunt
 * @access  Private (agent+ dans la structure)
 */
router.put('/:id', verifyToken, structureContext({ required: true }), requireStructureRole('agent'), validate(schemas.emprunt.update), empruntController.updateEmprunt);

/**
 * @route   DELETE /api/emprunts/:id
 * @desc    Delete emprunt
 * @access  Private (gestionnaire+ dans la structure)
 */
router.delete('/:id', verifyToken, structureContext({ required: true }), requireStructureRole('gestionnaire'), validate(schemas.emprunt.getById), empruntController.deleteEmprunt);

module.exports = router;
