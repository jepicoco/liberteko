const { IpAutorisee, ParametresFront } = require('../models');
const path = require('path');

/**
 * Obtenir la vraie IP du client (gestion des proxies)
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection.remoteAddress;
};

/**
 * Parser simple de cookies
 */
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = value;
    });
  }
  return cookies;
};

/**
 * Nom du cookie de bypass maintenance
 */
const BYPASS_COOKIE_NAME = 'maintenance_bypass';

/**
 * Durée max du cookie : 3 jours en millisecondes
 */
const COOKIE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

/**
 * Middleware pour vérifier le mode maintenance
 *
 * Ce middleware vérifie :
 * 1. Si le mode maintenance est activé
 * 2. Si l'IP du visiteur est autorisée (locales ou liste blanche)
 * 3. Si un cookie de bypass valide existe
 *
 * Si le visiteur n'est pas autorisé, renvoie une réponse 503 avec le message de maintenance.
 *
 * Usage: Appliquer sur les routes du site public (pas l'admin, pas l'API)
 */
const checkMaintenance = async (req, res, next) => {
  try {
    // Récupérer les paramètres front
    const parametres = await ParametresFront.getParametres();

    // Si le mode maintenance n'est pas activé, continuer
    if (!parametres.mode_maintenance) {
      return next();
    }

    // Vérifier le cookie de bypass
    const cookies = parseCookies(req);
    if (cookies[BYPASS_COOKIE_NAME]) {
      // Le cookie existe, vérifier qu'il n'a pas expiré
      // Le cookie lui-même a une durée de vie, donc si il existe il est valide
      return next();
    }

    // Récupérer l'IP du client
    const clientIp = getClientIp(req);

    // Vérifier si l'IP est autorisée
    const estAutorisee = await IpAutorisee.estAutorisee(clientIp, parametres.autoriser_ip_locales);

    if (estAutorisee) {
      // Créer un cookie de bypass pour les prochaines requêtes
      res.cookie(BYPASS_COOKIE_NAME, 'true', {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return next();
    }

    // L'IP n'est pas autorisée, renvoyer la page de maintenance
    res.status(503).sendFile(path.join(__dirname, '../../frontend/maintenance.html'));

  } catch (error) {
    console.error('Erreur middleware maintenance:', error);
    // En cas d'erreur, laisser passer (fail-open pour ne pas bloquer le site)
    next();
  }
};

/**
 * Middleware pour définir le cookie de bypass après un unlock triforce réussi
 */
const setBypassCookie = (req, res) => {
  res.cookie(BYPASS_COOKIE_NAME, 'true', {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
};

module.exports = {
  checkMaintenance,
  setBypassCookie,
  BYPASS_COOKIE_NAME,
  getClientIp
};
