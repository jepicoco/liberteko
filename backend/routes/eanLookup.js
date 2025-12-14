/**
 * Routes pour la recherche EAN/ISBN
 * Fournit des endpoints generiques pour toutes les collections
 */

const express = require('express');
const router = express.Router();
const eanLookupController = require('../controllers/eanLookupController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes necessitent une authentification
router.use(verifyToken);

/**
 * POST /api/lookup/ean
 * Recherche par code EAN/ISBN
 * Body: { code: "3558380077992", collection: "jeu", forceRefresh: false }
 */
router.post('/ean', eanLookupController.lookupByCode);

/**
 * POST /api/lookup/title
 * Recherche par titre
 * Body: { title: "Catan", collection: "jeu" }
 */
router.post('/title', eanLookupController.lookupByTitle);

/**
 * POST /api/lookup/title/search
 * Recherche par titre avec resultats multiples
 * Body: { title: "Germinal", collection: "livre", maxResults: 10, provider: "bnf" }
 * Returns: { found: true, count: 5, results: [...], providers_used: [...] }
 */
router.post('/title/search', eanLookupController.searchTitleMultiple);

/**
 * POST /api/lookup/search
 * Recherche automatique (detecte si c'est un code ou un titre)
 * Body: { query: "3558380077992", type: "auto" | "ean" | "title", collection: "jeu" }
 */
router.post('/search', eanLookupController.search);

/**
 * GET /api/lookup/detect/:code
 * Detecte le type de code (EAN, ISBN-10, ISBN-13, UPC)
 */
router.get('/detect/:code', eanLookupController.detectCode);

/**
 * GET /api/lookup/providers
 * Liste les providers configures pour une collection
 * Query: ?collection=livre
 */
router.get('/providers', eanLookupController.getProviders);

/**
 * GET /api/lookup/search
 * Recherche par code avec provider specifique (optionnel)
 * Query: ?code=XXX&collection=livre&provider=bnf
 */
router.get('/search', eanLookupController.searchGet);

/**
 * GET /api/lookup/cache/stats
 * Statistiques du cache (admin uniquement)
 */
router.get('/cache/stats', checkRole(['administrateur', 'gestionnaire']), eanLookupController.getCacheStats);

/**
 * DELETE /api/lookup/cache
 * Vide le cache (admin uniquement)
 */
router.delete('/cache', checkRole(['administrateur']), eanLookupController.clearCache);

module.exports = router;
