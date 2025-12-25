/**
 * Routes pour la gestion des caisses
 */

const express = require('express');
const router = express.Router();
const caisseController = require('../controllers/caisseController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Rôles autorisés pour accéder aux données financières
const ROLES_CAISSE = ['administrateur', 'comptable', 'gestionnaire', 'benevole'];

// ============================================
// DONNÉES DE RÉFÉRENCE
// ============================================

// GET /api/caisses/references - Données de référence pour les formulaires
router.get('/references', checkRole(ROLES_CAISSE), caisseController.getReferences);

// GET /api/caisses/statistiques - Statistiques globales
router.get('/statistiques',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.getStatistiques
);

// ============================================
// GESTION DES CAISSES
// ============================================

// GET /api/caisses - Liste des caisses
router.get('/', checkRole(ROLES_CAISSE), caisseController.getCaisses);

// GET /api/caisses/:id - Détail d'une caisse
router.get('/:id', checkRole(ROLES_CAISSE), caisseController.getCaisseById);

// POST /api/caisses - Créer une caisse (admin seulement)
router.post('/',
  checkRole(['administrateur']),
  caisseController.createCaisse
);

// PUT /api/caisses/:id - Modifier une caisse (admin seulement)
router.put('/:id',
  checkRole(['administrateur']),
  caisseController.updateCaisse
);

// DELETE /api/caisses/:id - Désactiver une caisse (admin seulement)
router.delete('/:id',
  checkRole(['administrateur']),
  caisseController.deleteCaisse
);

// ============================================
// GESTION DES SESSIONS
// ============================================

// GET /api/caisses/:id/session - Session ouverte d'une caisse
router.get('/:id/session', checkRole(ROLES_CAISSE), caisseController.getSessionOuverte);

// POST /api/caisses/:id/session/ouvrir - Ouvrir une session
router.post('/:id/session/ouvrir',
  checkRole(['administrateur', 'gestionnaire', 'benevole']),
  caisseController.ouvrirSession
);

// GET /api/caisses/:id/sessions - Historique des sessions
router.get('/:id/sessions', checkRole(ROLES_CAISSE), caisseController.getHistoriqueSessions);

// ============================================
// ROUTES SESSIONS (par ID de session)
// ============================================

// GET /api/caisses/sessions/:sessionId - Détail d'une session
router.get('/sessions/:sessionId', checkRole(ROLES_CAISSE), caisseController.getSessionById);

// GET /api/caisses/sessions/:sessionId/pdf - Rapport PDF de la session
router.get('/sessions/:sessionId/pdf', checkRole(ROLES_CAISSE), caisseController.genererRapportSession);

// POST /api/caisses/sessions/:sessionId/cloturer - Clôturer une session
router.post('/sessions/:sessionId/cloturer',
  checkRole(['administrateur', 'gestionnaire', 'benevole']),
  caisseController.cloturerSession
);

// POST /api/caisses/sessions/:sessionId/annuler - Annuler une session
router.post('/sessions/:sessionId/annuler',
  checkRole(['administrateur', 'gestionnaire']),
  caisseController.annulerSession
);

// ============================================
// GESTION DES MOUVEMENTS
// ============================================

// GET /api/caisses/sessions/:sessionId/mouvements - Mouvements d'une session
router.get('/sessions/:sessionId/mouvements', checkRole(ROLES_CAISSE), caisseController.getMouvementsSession);

// POST /api/caisses/sessions/:sessionId/mouvements - Enregistrer un mouvement
router.post('/sessions/:sessionId/mouvements',
  checkRole(['administrateur', 'gestionnaire', 'benevole']),
  caisseController.enregistrerMouvement
);

// POST /api/caisses/mouvements/:mouvementId/annuler - Annuler un mouvement
router.post('/mouvements/:mouvementId/annuler',
  checkRole(['administrateur', 'gestionnaire']),
  caisseController.annulerMouvement
);

// ============================================
// REMISE EN BANQUE
// ============================================

// GET /api/caisses/:id/remises/disponibles - Mouvements disponibles pour remise
router.get('/:id/remises/disponibles',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.getMouvementsDisponiblesPourRemise
);

// GET /api/caisses/:id/remises - Liste des remises d'une caisse
router.get('/:id/remises',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.getRemises
);

// POST /api/caisses/:id/remises - Créer une remise
router.post('/:id/remises',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.creerRemise
);

// GET /api/caisses/remises/:remiseId - Détail d'une remise
router.get('/remises/:remiseId',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.getRemiseById
);

// POST /api/caisses/remises/:remiseId/deposer - Marquer comme déposée
router.post('/remises/:remiseId/deposer',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.deposerRemise
);

// POST /api/caisses/remises/:remiseId/valider - Valider après confirmation banque
router.post('/remises/:remiseId/valider',
  checkRole(['administrateur', 'comptable']),
  caisseController.validerRemise
);

// POST /api/caisses/remises/:remiseId/annuler - Annuler une remise
router.post('/remises/:remiseId/annuler',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  caisseController.annulerRemise
);

module.exports = router;
