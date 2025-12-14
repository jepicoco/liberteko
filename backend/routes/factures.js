/**
 * Routes pour la gestion des factures
 */

const express = require('express');
const router = express.Router();
const factureController = require('../controllers/factureController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// ============================================
// DONNÉES DE RÉFÉRENCE
// ============================================

// GET /api/factures/references - Données de référence
router.get('/references', factureController.getReferences);

// GET /api/factures/statistiques - Statistiques de facturation
router.get('/statistiques',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.getStatistiques
);

// ============================================
// LISTE ET CONSULTATION
// ============================================

// GET /api/factures - Liste des factures
router.get('/',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.getFactures
);

// GET /api/factures/:id - Détail d'une facture
router.get('/:id',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.getFactureById
);

// ============================================
// CRÉATION
// ============================================

// POST /api/factures - Créer une facture
router.post('/',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.creerFacture
);

// POST /api/factures/depuis-cotisation - Créer depuis cotisation
router.post('/depuis-cotisation',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.creerDepuisCotisation
);

// ============================================
// MODIFICATION
// ============================================

// PUT /api/factures/:id - Modifier une facture
router.put('/:id',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.mettreAJour
);

// ============================================
// LIGNES
// ============================================

// POST /api/factures/:id/lignes - Ajouter une ligne
router.post('/:id/lignes',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.ajouterLigne
);

// PUT /api/factures/lignes/:ligneId - Modifier une ligne
router.put('/lignes/:ligneId',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.modifierLigne
);

// DELETE /api/factures/lignes/:ligneId - Supprimer une ligne
router.delete('/lignes/:ligneId',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.supprimerLigne
);

// ============================================
// WORKFLOW
// ============================================

// POST /api/factures/:id/emettre - Émettre la facture
router.post('/:id/emettre',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.emettre
);

// POST /api/factures/:id/annuler - Annuler la facture
router.post('/:id/annuler',
  checkRole(['administrateur', 'comptable']),
  factureController.annuler
);

// POST /api/factures/:id/avoir - Créer un avoir
router.post('/:id/avoir',
  checkRole(['administrateur', 'comptable']),
  factureController.creerAvoir
);

// ============================================
// RÈGLEMENTS
// ============================================

// POST /api/factures/:id/reglements - Enregistrer un règlement
router.post('/:id/reglements',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.enregistrerReglement
);

// POST /api/factures/reglements/:reglementId/annuler - Annuler un règlement
router.post('/reglements/:reglementId/annuler',
  checkRole(['administrateur', 'comptable']),
  factureController.annulerReglement
);

// ============================================
// PDF
// ============================================

// GET /api/factures/:id/pdf - Télécharger le PDF
router.get('/:id/pdf',
  checkRole(['administrateur', 'comptable', 'gestionnaire']),
  factureController.telechargerPDF
);

module.exports = router;
