const express = require('express');
const router = express.Router();
const parametrageComptableController = require('../controllers/parametrageComptableController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes necessitent authentification + role comptable ou admin
const authMiddleware = [verifyToken, checkRole(['administrateur', 'comptable'])];

// ============================================
// JOURNAUX COMPTABLES
// ============================================
router.get('/journaux', authMiddleware, parametrageComptableController.getJournaux);
router.get('/journaux/:id', authMiddleware, parametrageComptableController.getJournal);
router.post('/journaux', authMiddleware, parametrageComptableController.createJournal);
router.put('/journaux/:id', authMiddleware, parametrageComptableController.updateJournal);
router.delete('/journaux/:id', authMiddleware, parametrageComptableController.deleteJournal);

// ============================================
// COMPTES COMPTABLES
// ============================================
router.get('/comptes', authMiddleware, parametrageComptableController.getComptes);
router.get('/comptes/arbre', authMiddleware, parametrageComptableController.getComptesArbre);
router.get('/comptes/:id', authMiddleware, parametrageComptableController.getCompte);
router.post('/comptes', authMiddleware, parametrageComptableController.createCompte);
router.put('/comptes/:id', authMiddleware, parametrageComptableController.updateCompte);
router.delete('/comptes/:id', authMiddleware, parametrageComptableController.deleteCompte);

// ============================================
// PARAMETRAGE DES OPERATIONS
// ============================================
router.get('/operations', authMiddleware, parametrageComptableController.getParametrages);
router.get('/operations/type/:type', authMiddleware, parametrageComptableController.getParametrageByType);
router.get('/operations/:id', authMiddleware, parametrageComptableController.getParametrage);
router.put('/operations/:id', authMiddleware, parametrageComptableController.updateParametrage);

// ============================================
// COMPTES D'ENCAISSEMENT PAR MODE DE PAIEMENT
// ============================================
router.get('/encaissements', authMiddleware, parametrageComptableController.getComptesEncaissement);
router.post('/encaissements', authMiddleware, parametrageComptableController.createCompteEncaissement);
router.put('/encaissements/:id', authMiddleware, parametrageComptableController.updateCompteEncaissement);

// ============================================
// SECTIONS ANALYTIQUES
// ============================================
router.get('/sections', authMiddleware, parametrageComptableController.getSections);
router.get('/sections/:id', authMiddleware, parametrageComptableController.getSection);
router.post('/sections', authMiddleware, parametrageComptableController.createSection);
router.put('/sections/:id', authMiddleware, parametrageComptableController.updateSection);
router.delete('/sections/:id', authMiddleware, parametrageComptableController.deleteSection);

// ============================================
// REGROUPEMENTS ANALYTIQUES (ventilation multi-sections)
// ============================================
router.get('/regroupements', authMiddleware, parametrageComptableController.getRegroupements);
router.get('/regroupements/:id', authMiddleware, parametrageComptableController.getRegroupement);
router.post('/regroupements', authMiddleware, parametrageComptableController.createRegroupement);
router.put('/regroupements/:id', authMiddleware, parametrageComptableController.updateRegroupement);
router.delete('/regroupements/:id', authMiddleware, parametrageComptableController.deleteRegroupement);

// ============================================
// DONNEES DE REFERENCE (pour selects)
// ============================================
router.get('/refs/taux-tva', authMiddleware, parametrageComptableController.getTauxTVA);
router.get('/refs/sections-analytiques', authMiddleware, parametrageComptableController.getSectionsAnalytiques);
router.get('/refs/modes-paiement', authMiddleware, parametrageComptableController.getModesPaiement);

module.exports = router;
