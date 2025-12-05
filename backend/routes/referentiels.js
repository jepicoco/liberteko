/**
 * Routes Référentiels
 * API pour la gestion des tables de référence (catégories, thèmes, éditeurs, etc.)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/referentielsController');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// ========================================
// Statistiques globales
// ========================================
router.get('/stats', ctrl.getStats);

// ========================================
// Catégories
// ========================================
router.get('/categories', ctrl.getAllCategories);
router.get('/categories/search', ctrl.searchCategories);
router.get('/categories/:id', ctrl.getCategorieById);
router.post('/categories', ctrl.createCategorie);
router.put('/categories/:id', ctrl.updateCategorie);
router.delete('/categories/:id', ctrl.deleteCategorie);
router.patch('/categories/:id/toggle', ctrl.toggleCategorieActif);

// ========================================
// Thèmes
// ========================================
router.get('/themes', ctrl.getAllThemes);
router.get('/themes/search', ctrl.searchThemes);
router.get('/themes/:id', ctrl.getThemeById);
router.post('/themes', ctrl.createTheme);
router.put('/themes/:id', ctrl.updateTheme);
router.delete('/themes/:id', ctrl.deleteTheme);
router.patch('/themes/:id/toggle', ctrl.toggleThemeActif);

// ========================================
// Mécanismes
// ========================================
router.get('/mecanismes', ctrl.getAllMecanismes);
router.get('/mecanismes/search', ctrl.searchMecanismes);
router.get('/mecanismes/:id', ctrl.getMecanismeById);
router.post('/mecanismes', ctrl.createMecanisme);
router.put('/mecanismes/:id', ctrl.updateMecanisme);
router.delete('/mecanismes/:id', ctrl.deleteMecanisme);
router.patch('/mecanismes/:id/toggle', ctrl.toggleMecanismeActif);

// ========================================
// Langues
// ========================================
router.get('/langues', ctrl.getAllLangues);
router.get('/langues/search', ctrl.searchLangues);
router.get('/langues/:id', ctrl.getLangueById);
router.post('/langues', ctrl.createLangue);
router.put('/langues/:id', ctrl.updateLangue);
router.delete('/langues/:id', ctrl.deleteLangue);
router.patch('/langues/:id/toggle', ctrl.toggleLangueActif);

// ========================================
// Éditeurs
// ========================================
router.get('/editeurs', ctrl.getAllEditeurs);
router.get('/editeurs/search', ctrl.searchEditeurs);
router.get('/editeurs/:id', ctrl.getEditeurById);
router.post('/editeurs', ctrl.createEditeur);
router.put('/editeurs/:id', ctrl.updateEditeur);
router.delete('/editeurs/:id', ctrl.deleteEditeur);
router.patch('/editeurs/:id/toggle', ctrl.toggleEditeurActif);

// ========================================
// Auteurs
// ========================================
router.get('/auteurs', ctrl.getAllAuteurs);
router.get('/auteurs/search', ctrl.searchAuteurs);
router.get('/auteurs/:id', ctrl.getAuteurById);
router.post('/auteurs', ctrl.createAuteur);
router.put('/auteurs/:id', ctrl.updateAuteur);
router.delete('/auteurs/:id', ctrl.deleteAuteur);
router.patch('/auteurs/:id/toggle', ctrl.toggleAuteurActif);

// ========================================
// Illustrateurs
// ========================================
router.get('/illustrateurs', ctrl.getAllIllustrateurs);
router.get('/illustrateurs/search', ctrl.searchIllustrateurs);
router.get('/illustrateurs/:id', ctrl.getIllustrateurById);
router.post('/illustrateurs', ctrl.createIllustrateur);
router.put('/illustrateurs/:id', ctrl.updateIllustrateur);
router.delete('/illustrateurs/:id', ctrl.deleteIllustrateur);
router.patch('/illustrateurs/:id/toggle', ctrl.toggleIllustrateurActif);

// ========================================
// Gammes
// ========================================
router.get('/gammes', ctrl.getAllGammes);
router.get('/gammes/search', ctrl.searchGammes);
router.get('/gammes/:id', ctrl.getGammeById);
router.post('/gammes', ctrl.createGamme);
router.put('/gammes/:id', ctrl.updateGamme);
router.delete('/gammes/:id', ctrl.deleteGamme);
router.patch('/gammes/:id/toggle', ctrl.toggleGammeActif);

// ========================================
// Emplacements
// ========================================
router.get('/emplacements', ctrl.getAllEmplacements);
router.get('/emplacements/search', ctrl.searchEmplacements);
router.get('/emplacements/:id', ctrl.getEmplacementById);
router.post('/emplacements', ctrl.createEmplacement);
router.put('/emplacements/:id', ctrl.updateEmplacement);
router.delete('/emplacements/:id', ctrl.deleteEmplacement);
router.patch('/emplacements/:id/toggle', ctrl.toggleEmplacementActif);

module.exports = router;
