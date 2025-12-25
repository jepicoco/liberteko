/**
 * Routes pour le desherbage (lots de sortie)
 * Gestion des articles sortis du stock (rebus, don, vente)
 */

const express = require('express');
const router = express.Router();
const desherbageController = require('../controllers/desherbageController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// =============================================================================
// TYPES DE SORTIE
// =============================================================================

// Liste des types de sortie (tous les utilisateurs authentifies)
router.get('/types-sortie', desherbageController.getTypesSortie);

// Creer un type de sortie (admin uniquement)
router.post('/types-sortie',
  checkRole(['administrateur']),
  desherbageController.createTypeSortie
);

// Modifier un type de sortie (admin uniquement)
router.put('/types-sortie/:id',
  checkRole(['administrateur']),
  desherbageController.updateTypeSortie
);

// =============================================================================
// LOTS DE SORTIE
// =============================================================================

// Liste des lots (gestionnaire+)
router.get('/lots',
  checkRole(['gestionnaire', 'administrateur', 'comptable']),
  desherbageController.getLots
);

// Detail d'un lot (gestionnaire+)
router.get('/lots/:id',
  checkRole(['gestionnaire', 'administrateur', 'comptable']),
  desherbageController.getLotById
);

// Creer un lot (gestionnaire+)
router.post('/lots',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.createLot
);

// Modifier un lot (gestionnaire+)
router.put('/lots/:id',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.updateLot
);

// Supprimer un lot (gestionnaire+)
router.delete('/lots/:id',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.deleteLot
);

// =============================================================================
// ARTICLES DANS UN LOT
// =============================================================================

// Ajouter des articles a un lot (legacy - gestionnaire+)
router.post('/lots/:id/articles',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.addArticlesToLot
);

// Ajouter des exemplaires a un lot (V2 - gestionnaire+)
router.post('/lots/:id/exemplaires',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.addExemplairesToLot
);

// Retirer un article d'un lot (gestionnaire+)
router.delete('/lots/:id/articles/:articleSortieId',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.removeArticleFromLot
);

// =============================================================================
// ACTIONS SUR LES LOTS
// =============================================================================

// Valider un lot (gestionnaire+)
router.post('/lots/:id/valider',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.validerLot
);

// Exporter un lot vers la comptabilite (comptable/admin)
router.post('/lots/:id/exporter',
  checkRole(['comptable', 'administrateur']),
  desherbageController.exporterLot
);

// Reintegrer un article sorti (gestionnaire+)
router.post('/lots/:id/articles/:articleSortieId/reintegrer',
  checkRole(['gestionnaire', 'administrateur']),
  desherbageController.reintegrerArticle
);

// =============================================================================
// STATISTIQUES ET FONDS PROPRES
// =============================================================================

// Fonds propres (valeur du stock)
router.get('/fonds-propres',
  checkRole(['gestionnaire', 'administrateur', 'comptable']),
  desherbageController.getFondsPropres
);

// Statistiques de desherbage
router.get('/statistiques',
  checkRole(['gestionnaire', 'administrateur', 'comptable']),
  desherbageController.getStatistiques
);

module.exports = router;
