const express = require('express');
const router = express.Router();
const smsLogController = require('../controllers/smsLogController');
const { verifyToken } = require('../middleware/auth');
const { structureContext } = require('../middleware/structureContext');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

/**
 * @route   GET /api/sms-logs
 * @desc    Récupérer tous les logs de SMS avec filtres et pagination
 * @query   statut, template_code, provider, adherent_id, date_debut, date_fin, page, limit
 * @header  X-Structure-Id (optionnel, filtre par structure)
 * @access  Private
 */
router.get('/', structureContext(), smsLogController.getAllSmsLogs);

/**
 * @route   GET /api/sms-logs/statistics
 * @desc    Récupérer les statistiques des SMS envoyés
 * @query   date_debut, date_fin
 * @header  X-Structure-Id (optionnel, filtre par structure)
 * @access  Private
 */
router.get('/statistics', structureContext(), smsLogController.getSmsStatistics);

/**
 * @route   GET /api/sms-logs/templates
 * @desc    Récupérer la liste des templates utilisés
 * @header  X-Structure-Id (optionnel, filtre par structure)
 * @access  Private
 */
router.get('/templates', structureContext(), smsLogController.getTemplatesList);

/**
 * @route   GET /api/sms-logs/providers
 * @desc    Récupérer la liste des providers utilisés
 * @header  X-Structure-Id (optionnel, filtre par structure)
 * @access  Private
 */
router.get('/providers', structureContext(), smsLogController.getProvidersList);

/**
 * @route   GET /api/sms-logs/:id
 * @desc    Récupérer un log de SMS par ID
 * @access  Private
 */
router.get('/:id', smsLogController.getSmsLogById);

/**
 * @route   POST /api/sms-logs/purge
 * @desc    Supprimer les anciens logs de SMS
 * @body    { jours: 90 }
 * @header  X-Structure-Id (optionnel, filtre par structure)
 * @access  Private
 */
router.post('/purge', structureContext(), smsLogController.purgeOldLogs);

/**
 * @route   POST /api/sms-logs/webhook
 * @desc    Callback webhook pour mise à jour du statut de livraison
 * @body    { message_id, statut, date_livraison, erreur_code, erreur_message }
 * @access  Private (peut être public pour les webhooks externes)
 */
router.post('/webhook', smsLogController.updateSmsStatus);

module.exports = router;
