/**
 * Routes Comptes Bancaires
 * Gestion des RIB multiples
 */

const express = require('express');
const router = express.Router();
const compteBancaireController = require('../controllers/compteBancaireController');
const { verifyToken } = require('../middleware/auth');

// Protection de toutes les routes
router.use(verifyToken);

// GET /api/comptes-bancaires - Liste tous les comptes
router.get('/', compteBancaireController.getAll);

// GET /api/comptes-bancaires/default - Compte par défaut
router.get('/default', compteBancaireController.getDefault);

// GET /api/comptes-bancaires/:id - Détails d'un compte
router.get('/:id', compteBancaireController.getById);

// POST /api/comptes-bancaires - Créer un compte
router.post('/', compteBancaireController.create);

// POST /api/comptes-bancaires/format-iban - Formater un IBAN
router.post('/format-iban', compteBancaireController.formatIban);

// PUT /api/comptes-bancaires/:id - Modifier un compte
router.put('/:id', compteBancaireController.update);

// PUT /api/comptes-bancaires/:id/default - Définir par défaut
router.put('/:id/default', compteBancaireController.setDefault);

// DELETE /api/comptes-bancaires/:id - Désactiver un compte
router.delete('/:id', compteBancaireController.delete);

module.exports = router;
