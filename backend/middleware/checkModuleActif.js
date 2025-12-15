/**
 * Middleware pour verifier qu'un module est globalement actif
 * Verifie dans la table modules_actifs si le module est active
 */

const { ModuleActif } = require('../models');

// Cache des modules actifs (5 minutes)
let modulesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Charge les modules actifs depuis la base ou le cache
 * @returns {Promise<Object>} Map code -> actif
 */
async function getModulesActifs() {
  const now = Date.now();

  // Utiliser le cache si valide
  if (modulesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return modulesCache;
  }

  try {
    const modules = await ModuleActif.findAll({
      attributes: ['code', 'actif']
    });

    modulesCache = {};
    modules.forEach(m => {
      modulesCache[m.code] = m.actif;
    });
    cacheTimestamp = now;

    return modulesCache;
  } catch (error) {
    console.error('Erreur chargement modules actifs:', error);
    // En cas d'erreur, retourner cache existant ou objet vide
    return modulesCache || {};
  }
}

/**
 * Invalide le cache des modules (a appeler apres modification)
 */
function invalidateModulesCache() {
  modulesCache = null;
  cacheTimestamp = 0;
}

/**
 * Verifie si un module est globalement actif
 * @param {string} moduleCode - Code du module a verifier
 * @returns {Promise<boolean>}
 */
async function isModuleActif(moduleCode) {
  const modules = await getModulesActifs();
  return modules[moduleCode] === true || modules[moduleCode] === 1;
}

/**
 * Middleware Express pour verifier qu'un module est actif
 * @param {string} moduleCode - Code du module requis
 * @returns {Function} Middleware Express
 */
const checkModuleActif = (moduleCode) => {
  return async (req, res, next) => {
    try {
      const actif = await isModuleActif(moduleCode);

      if (!actif) {
        return res.status(403).json({
          error: 'Module desactive',
          message: 'Ce module est desactive. Contactez votre administrateur.',
          module: moduleCode
        });
      }

      next();
    } catch (error) {
      console.error('Erreur verification module actif:', error);
      // En cas d'erreur, laisser passer (fail-open pour ne pas bloquer)
      next();
    }
  };
};

/**
 * Middleware Express pour verifier qu'au moins un module est actif
 * @param {Array<string>} moduleCodes - Codes des modules acceptes
 * @returns {Function} Middleware Express
 */
const checkAnyModuleActif = (moduleCodes) => {
  return async (req, res, next) => {
    try {
      const modules = await getModulesActifs();
      const hasActiveModule = moduleCodes.some(code =>
        modules[code] === true || modules[code] === 1
      );

      if (!hasActiveModule) {
        return res.status(403).json({
          error: 'Modules desactives',
          message: 'Aucun des modules requis n\'est actif. Contactez votre administrateur.',
          modules: moduleCodes
        });
      }

      next();
    } catch (error) {
      console.error('Erreur verification modules actifs:', error);
      next();
    }
  };
};

module.exports = {
  checkModuleActif,
  checkAnyModuleActif,
  isModuleActif,
  getModulesActifs,
  invalidateModulesCache
};
