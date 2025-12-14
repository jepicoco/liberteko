/**
 * Controller pour la recherche EAN/ISBN
 * Fournit des endpoints generiques pour toutes les collections
 */

const eanLookupService = require('../services/eanLookupService');
const logger = require('../utils/logger');

/**
 * Recherche par code EAN/ISBN
 * POST /api/lookup/ean
 * Body: { code: "3558380077992", collection: "jeu" }
 */
const lookupByCode = async (req, res) => {
  try {
    const { code, collection, forceRefresh } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Le code EAN/ISBN est requis'
      });
    }

    logger.info(`[EAN Lookup] Request for ${code} (collection: ${collection || 'auto'})`);

    const result = await eanLookupService.lookupEAN(code, collection, { forceRefresh });

    res.json(result);

  } catch (error) {
    logger.error('[EAN Lookup] Error:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
};

/**
 * Recherche par titre
 * POST /api/lookup/title
 * Body: { title: "Catan", collection: "jeu" }
 */
const lookupByTitle = async (req, res) => {
  try {
    const { title, collection = 'jeu' } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Le titre est requis'
      });
    }

    logger.info(`[Title Lookup] Request for "${title}" (collection: ${collection})`);

    const result = await eanLookupService.lookupByTitle(title, collection);

    res.json(result);

  } catch (error) {
    logger.error('[Title Lookup] Error:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
};

/**
 * Recherche par titre avec resultats multiples
 * POST /api/lookup/title/search
 * Body: { title: "Germinal", collection: "livre", maxResults: 10, provider: "bnf" }
 */
const searchTitleMultiple = async (req, res) => {
  try {
    const { title, collection = 'livre', maxResults = 10, provider = null } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Le titre est requis'
      });
    }

    if (title.length < 2) {
      return res.status(400).json({
        error: 'Le titre doit contenir au moins 2 caracteres'
      });
    }

    logger.info(`[Title Search Multiple] "${title}" (collection: ${collection}, max: ${maxResults}, provider: ${provider || 'all'})`);

    const result = await eanLookupService.searchByTitleMultiple(title, collection, maxResults, provider);

    res.json(result);

  } catch (error) {
    logger.error('[Title Search Multiple] Error:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
};

/**
 * Recherche multi-collection
 * POST /api/lookup/search
 * Body: { query: "3558380077992", type: "ean" | "title" }
 */
const search = async (req, res) => {
  try {
    const { query, type = 'auto', collection } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'La requete de recherche est requise'
      });
    }

    // Detecter automatiquement si c'est un code ou un titre
    const isCode = /^\d{8,14}$/.test(query.replace(/[- ]/g, ''));
    const searchType = type === 'auto' ? (isCode ? 'ean' : 'title') : type;

    logger.info(`[Search] ${searchType} query: "${query}"`);

    let result;
    if (searchType === 'ean') {
      result = await eanLookupService.lookupEAN(query, collection);
    } else {
      result = await eanLookupService.lookupByTitle(query, collection || 'jeu');
    }

    res.json({
      ...result,
      search_type: searchType
    });

  } catch (error) {
    logger.error('[Search] Error:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
};

/**
 * Detecte le type de code
 * GET /api/lookup/detect/:code
 */
const detectCode = async (req, res) => {
  try {
    const { code } = req.params;

    const codeType = eanLookupService.detectCodeType(code);

    let collection = null;
    if (codeType === 'isbn') {
      collection = 'livre';
    }

    res.json({
      code,
      type: codeType,
      suggested_collection: collection
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors de la detection',
      details: error.message
    });
  }
};

/**
 * Statistiques du cache
 * GET /api/lookup/cache/stats
 */
const getCacheStats = async (req, res) => {
  try {
    const stats = eanLookupService.getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Vide le cache
 * DELETE /api/lookup/cache
 */
const clearCache = async (req, res) => {
  try {
    eanLookupService.clearCache();
    res.json({ message: 'Cache vide' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Liste les providers configures pour une collection
 * GET /api/lookup/providers?collection=livre
 */
const getProviders = async (req, res) => {
  try {
    const { collection } = req.query;
    const providers = await eanLookupService.getConfiguredProviders(collection);
    res.json({ providers });
  } catch (error) {
    logger.error('[Providers] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recherche GET avec provider specifique
 * GET /api/lookup/search?code=XXX&collection=livre&provider=bnf
 */
const searchGet = async (req, res) => {
  try {
    const { code, collection, provider } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Le code est requis' });
    }

    logger.info(`[Search GET] code=${code}, collection=${collection}, provider=${provider}`);

    const result = await eanLookupService.lookupEAN(code, collection, {
      forceRefresh: false,
      specificProvider: provider
    });

    res.json(result);

  } catch (error) {
    logger.error('[Search GET] Error:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
};

module.exports = {
  lookupByCode,
  lookupByTitle,
  searchTitleMultiple,
  search,
  searchGet,
  detectCode,
  getCacheStats,
  clearCache,
  getProviders
};
