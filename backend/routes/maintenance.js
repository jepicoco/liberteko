const express = require('express');
const router = express.Router();
const ipAutoriseesController = require('../controllers/ipAutoriseesController');

// ============================================
// Routes publiques pour la maintenance (Triforce Easter Egg)
// ============================================

// Obtenir le timestamp pour générer le hash côté client
router.get('/timestamp', ipAutoriseesController.getTimestamp);

// Endpoint Triforce - déverrouille l'accès pour l'IP du visiteur
router.post('/unlock', ipAutoriseesController.triforceUnlock);

module.exports = router;
