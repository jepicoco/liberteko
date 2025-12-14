/**
 * Middleware d'authentification par cle API
 * Pour les extensions externes (Chrome, etc.)
 */

const { ApiKey } = require('../models');
const logger = require('../utils/logger');

/**
 * Extrait l'IP du client depuis la requete
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.ip;
}

/**
 * Middleware de validation de cle API
 * Verifie la cle, les permissions et les limites
 */
const verifyApiKey = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      // Recuperer la cle API depuis l'en-tete
      const apiKeyHeader = req.headers['x-api-key'];

      if (!apiKeyHeader) {
        return res.status(401).json({
          success: false,
          error: 'API_KEY_MISSING',
          message: 'En-tete X-API-Key requis'
        });
      }

      // Valider la cle
      const ip = getClientIp(req);
      const result = await ApiKey.validerCle(apiKeyHeader, ip);

      if (!result.valid) {
        logger.warn(`[API Key] Cle invalide: ${result.error} (IP: ${ip})`);
        return res.status(401).json({
          success: false,
          error: 'API_KEY_INVALID',
          message: result.error
        });
      }

      const apiKey = result.apiKey;

      // Verifier les permissions requises
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(perm => apiKey.hasPermission(perm));
        if (!hasAllPermissions) {
          logger.warn(`[API Key] Permissions insuffisantes: ${apiKey.key_prefix} (IP: ${ip})`);
          return res.status(403).json({
            success: false,
            error: 'PERMISSION_DENIED',
            message: 'Permissions insuffisantes pour cette action'
          });
        }
      }

      // Incrementer le compteur
      await apiKey.incrementerCompteur(ip);

      // Attacher la cle a la requete
      req.apiKey = apiKey;
      req.clientIp = ip;

      next();
    } catch (error) {
      logger.error('[API Key] Erreur middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erreur de validation de la cle API'
      });
    }
  };
};

/**
 * Middleware pour verifier l'acces a une collection
 */
const checkCollectionAccess = (collection) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API_KEY_REQUIRED',
        message: 'Authentification requise'
      });
    }

    if (!req.apiKey.canAccessCollection(collection)) {
      return res.status(403).json({
        success: false,
        error: 'COLLECTION_ACCESS_DENIED',
        message: `Acces non autorise a la collection: ${collection}`
      });
    }

    next();
  };
};

module.exports = {
  verifyApiKey,
  checkCollectionAccess,
  getClientIp
};
