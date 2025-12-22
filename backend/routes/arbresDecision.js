/**
 * Routes Arbre de Decision Tarifaire
 * API pour la gestion des arbres de decision
 */

const express = require('express');
const router = express.Router();
const arbreDecisionController = require('../controllers/arbreDecisionController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const checkArbreModifiable = require('../middleware/checkArbreModifiable');

// ============================================================
// TYPES DE CONDITION (Reference)
// ============================================================

// GET /api/arbres-decision/types-condition
// Liste des types de condition disponibles
router.get('/types-condition',
  verifyToken,
  arbreDecisionController.getTypesCondition
);

// ============================================================
// OPERATIONS COMPTABLES
// ============================================================

// GET /api/arbres-decision/operations-reduction
// Liste des operations comptables pour les reductions
router.get('/operations-reduction',
  verifyToken,
  arbreDecisionController.getOperationsReduction
);

// POST /api/arbres-decision/operations-reduction
// Cree une operation comptable
router.post('/operations-reduction',
  verifyToken,
  checkRole(['administrateur', 'comptable']),
  arbreDecisionController.creerOperationReduction
);

// ============================================================
// EXPORT COMPTABLE
// ============================================================

// GET /api/arbres-decision/reductions/export
// Export des reductions par operation comptable
router.get('/reductions/export',
  verifyToken,
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  arbreDecisionController.exportReductions
);

// ============================================================
// CRUD ARBRE
// ============================================================

// GET /api/arbres-decision/tarif/:tarifId
// Recupere l'arbre d'un tarif
router.get('/tarif/:tarifId',
  verifyToken,
  arbreDecisionController.getArbre
);

// POST /api/arbres-decision/tarif/:tarifId
// Cree un arbre pour un tarif
router.post('/tarif/:tarifId',
  verifyToken,
  checkRole(['administrateur', 'gestionnaire']),
  arbreDecisionController.creerArbre
);

// PUT /api/arbres-decision/:id
// Modifie un arbre (si non verrouille)
router.put('/:id',
  verifyToken,
  checkRole(['administrateur', 'gestionnaire']),
  checkArbreModifiable,
  arbreDecisionController.modifierArbre
);

// DELETE /api/arbres-decision/:id
// Supprime un arbre (si non verrouille)
router.delete('/:id',
  verifyToken,
  checkRole(['administrateur']),
  checkArbreModifiable,
  arbreDecisionController.supprimerArbre
);

// ============================================================
// SIMULATION
// ============================================================

// POST /api/arbres-decision/:id/simuler
// Simule le calcul d'un arbre pour un utilisateur
router.post('/:id/simuler',
  verifyToken,
  arbreDecisionController.simulerArbre
);

// ============================================================
// VERROUILLAGE
// ============================================================

// GET /api/arbres-decision/:id/statut
// Recupere le statut de verrouillage
router.get('/:id/statut',
  verifyToken,
  arbreDecisionController.getStatut
);

// POST /api/arbres-decision/:id/dupliquer
// Duplique un arbre (cree nouvelle version modifiable)
router.post('/:id/dupliquer',
  verifyToken,
  checkRole(['administrateur', 'gestionnaire']),
  arbreDecisionController.dupliquerArbre
);

module.exports = router;
