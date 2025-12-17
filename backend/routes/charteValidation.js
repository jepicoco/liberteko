/**
 * Routes pour la validation de charte usager
 * Mix de routes publiques (token-based) et authentifiees
 */

const express = require('express');
const router = express.Router();
const charteValidationController = require('../controllers/charteValidationController');
const { verifyToken } = require('../middleware/auth');

// ============================================
// Routes publiques (token-based)
// Ces routes utilisent le token dans l'URL pour l'authentification
// ============================================

// GET /api/charte/valider/:token - Affiche la charte
router.get('/valider/:token', charteValidationController.getCharte);

// POST /api/charte/valider/:token/lue - Marque comme lue
router.post('/valider/:token/lue', charteValidationController.marquerLue);

// POST /api/charte/valider/:token/otp - Demande OTP
router.post('/valider/:token/otp', charteValidationController.demanderOTP);

// POST /api/charte/valider/:token/confirmer - Confirme OTP
router.post('/valider/:token/confirmer', charteValidationController.confirmerOTP);

// ============================================
// Routes authentifiees (usager connecte)
// ============================================

// GET /api/charte/usager/statut - Statut de validation
router.get('/usager/statut', verifyToken, charteValidationController.getStatut);

// GET /api/charte/usager/canaux - Canaux OTP disponibles
router.get('/usager/canaux', verifyToken, charteValidationController.getCanaux);

// POST /api/charte/usager/initier - Initier validation (si necessaire)
router.post('/usager/initier', verifyToken, charteValidationController.initierValidation);

module.exports = router;
