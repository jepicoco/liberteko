/**
 * Routes pour la gestion des exemplaires multiples
 */

const express = require('express');
const router = express.Router();
const exemplaireController = require('../controllers/exemplaireController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, isGestionnaire, checkDynamicModuleAccess } = require('../middleware/checkRole');

// Toutes les routes necessitent authentification
router.use(verifyToken);

// ============================================================
// Routes speciales (doivent etre avant les routes parametrees)
// ============================================================

/**
 * Trouver un exemplaire par code-barre (recherche globale cross-module)
 * GET /api/exemplaires/by-barcode/:codeBarre
 * Note: Pas de check module car recherche dans tous les modules
 */
router.get('/by-barcode/:codeBarre',
  isAgent(),
  exemplaireController.getExemplaireByBarcode
);

/**
 * Assigner un code-barre a un exemplaire
 * POST /api/exemplaires/assign-barcode
 * Body: { module, exemplaireId, codeBarre }
 */
router.post('/assign-barcode',
  isGestionnaire(),
  checkDynamicModuleAccess('module'),  // Verifie body.module
  exemplaireController.assignBarcode
);

/**
 * Rechercher un article par EAN et retourner ses exemplaires sans code-barre
 * GET /api/exemplaires/search-by-ean/:ean
 * Note: Pas de check module car recherche dans tous les modules
 */
router.get('/search-by-ean/:ean',
  isAgent(),
  exemplaireController.searchByEAN
);

// ============================================================
// Routes generiques par module
// ============================================================

/**
 * Obtenir un exemplaire par ID
 * GET /api/exemplaires/:module/:exemplaireId
 */
router.get('/:module/:exemplaireId',
  isAgent(),
  checkDynamicModuleAccess('module'),
  exemplaireController.getExemplaireById
);

/**
 * Modifier un exemplaire
 * PUT /api/exemplaires/:module/:exemplaireId
 */
router.put('/:module/:exemplaireId',
  isGestionnaire(),
  checkDynamicModuleAccess('module'),
  exemplaireController.updateExemplaire
);

/**
 * Supprimer un exemplaire
 * DELETE /api/exemplaires/:module/:exemplaireId
 */
router.delete('/:module/:exemplaireId',
  isGestionnaire(),
  checkDynamicModuleAccess('module'),
  exemplaireController.deleteExemplaire
);

module.exports = router;
