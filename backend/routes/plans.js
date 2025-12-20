/**
 * Routes pour l'editeur de plans interactifs
 */

const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { checkModuleActif } = require('../middleware/checkModuleActif');
const { structureContext, requireStructureRole } = require('../middleware/structureContext');

// Middleware pour routes admin (gestionnaire ou admin)
const modulePlansActif = checkModuleActif('plans');

// Middleware pour routes admin (gestionnaire ou admin + module actif)
const authAdmin = [verifyToken, checkRole(['gestionnaire', 'administrateur']), modulePlansActif];

// Middleware pour lecture de references (benevole+ dans la structure)
const authReadRefs = [verifyToken, structureContext(), requireStructureRole('benevole')];

// Middleware pour routes publiques (optionnel token)
const authOptional = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    return verifyToken(req, res, next);
  }
  next();
};

// ============================================
// ROUTES ADMIN - PLANS
// ============================================

// Liste tous les plans
router.get('/', authAdmin, planController.getPlans);

// Recupere le plan d'un site (AVANT /:id pour eviter conflit)
router.get('/site/:siteId', authAdmin, planController.getPlanBySite);

// Cree un nouveau plan
router.post('/', authAdmin, planController.createPlan);

// Recupere un plan complet par ID
router.get('/:id', authAdmin, planController.getPlan);

// Met a jour un plan
router.put('/:id', authAdmin, planController.updatePlan);

// Supprime un plan (soft delete)
router.delete('/:id', authAdmin, planController.deletePlan);

// ============================================
// ROUTES ADMIN - REFERENCES (avant routes avec params)
// ============================================

// Liste les emplacements disponibles par type (accessible benevole+ pour filtres)
router.get('/refs/emplacements/:type', authReadRefs, planController.getEmplacementsDisponibles);

// Cree un nouvel emplacement (creation rapide)
router.post('/refs/emplacements/:type', authAdmin, planController.createEmplacement);

// Liste les templates disponibles
router.get('/refs/templates', authAdmin, planController.getTemplates);

// ============================================
// ROUTES ADMIN - ETAGES
// ============================================

// Met a jour un etage
router.put('/etages/:id', authAdmin, planController.updateEtage);

// Supprime un etage
router.delete('/etages/:id', authAdmin, planController.deleteEtage);

// Liste les elements d'un etage
router.get('/etages/:etageId/elements', authAdmin, planController.getElements);

// Cree un nouvel element
router.post('/etages/:etageId/elements', authAdmin, planController.createElement);

// Sauvegarde multiple d'elements
router.post('/etages/:etageId/elements/batch', authAdmin, planController.saveElements);

// Applique un template a un etage
router.post('/etages/:etageId/apply-template', authAdmin, planController.applyTemplate);

// ============================================
// ROUTES ADMIN - ELEMENTS
// ============================================

// Met a jour un element
router.put('/elements/:id', authAdmin, planController.updateElement);

// Supprime un element
router.delete('/elements/:id', authAdmin, planController.deleteElement);

// Ajoute une liaison element <-> emplacement
router.post('/elements/:elementId/emplacements', authAdmin, planController.addEmplacement);

// ============================================
// ROUTES ADMIN - EMPLACEMENTS (liaisons)
// ============================================

// Supprime une liaison
router.delete('/emplacements/:id', authAdmin, planController.removeEmplacement);

// ============================================
// ROUTES ADMIN - PLANS (avec params dynamiques - en dernier)
// ============================================

// Liste les etages d'un plan
router.get('/:planId/etages', authAdmin, planController.getEtages);

// Cree un nouvel etage
router.post('/:planId/etages', authAdmin, planController.createEtage);

// ============================================
// ROUTES PUBLIQUES
// ============================================

// Recupere un plan pour la vue publique
router.get('/public/site/:siteId', modulePlansActif, authOptional, planController.getPlanPublic);

// Recupere les articles d'un element (pour popup vue publique)
router.get('/public/elements/:elementId/articles', modulePlansActif, authOptional, planController.getArticlesElement);

// Recupere les articles d'un emplacement
router.get('/public/articles/:type/:emplacementId', modulePlansActif, authOptional, planController.getArticlesEmplacement);

module.exports = router;
