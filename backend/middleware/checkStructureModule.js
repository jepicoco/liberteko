/**
 * Middleware pour verifier qu'un module est actif pour la structure courante
 *
 * Note: Les codes de module utilises sont differents selon le contexte:
 * - Structure.modules_actifs: ['jeux', 'livres', 'films', 'disques']
 * - checkModuleAccess: 'ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'
 *
 * Ce middleware accepte les deux formats et fait la conversion automatiquement.
 */

// Mapping entre les codes module (utilisateur) et les codes route/article
const MODULE_TO_ROUTE = {
  'ludotheque': 'jeux',
  'bibliotheque': 'livres',
  'filmotheque': 'films',
  'discotheque': 'disques'
};

const ROUTE_TO_MODULE = {
  'jeux': 'ludotheque',
  'livres': 'bibliotheque',
  'films': 'filmotheque',
  'disques': 'discotheque'
};

/**
 * Convertit un code module (ludotheque) vers un code route (jeux)
 * @param {string} moduleCode - Code du module
 * @returns {string} Code de route
 */
const moduleToRoute = (moduleCode) => {
  return MODULE_TO_ROUTE[moduleCode] || moduleCode;
};

/**
 * Convertit un code route (jeux) vers un code module (ludotheque)
 * @param {string} routeCode - Code de route
 * @returns {string} Code du module
 */
const routeToModule = (routeCode) => {
  return ROUTE_TO_MODULE[routeCode] || routeCode;
};

/**
 * Verifie qu'un module est actif pour la structure courante
 * Prerequis: structureContext middleware doit etre execute avant
 *
 * @param {string} moduleCode - Code du module (ex: 'ludotheque' ou 'jeux')
 * @returns {Function} Middleware Express
 */
const checkStructureModule = (moduleCode) => {
  return (req, res, next) => {
    // Si pas de structure dans le contexte, laisser passer
    // (le filtrage par structure sera optionnel ou gere ailleurs)
    if (!req.structure) {
      return next();
    }

    // Convertir le code module en code route si necessaire
    // car Structure.modules_actifs utilise les codes route
    const routeCode = moduleToRoute(moduleCode);

    // Verifier si le module est actif pour cette structure
    if (!req.structure.hasModule(routeCode)) {
      return res.status(403).json({
        error: 'Module non disponible',
        message: `Le module ${moduleCode} n'est pas actif pour cette structure`,
        structure: req.structure.nom,
        modules_actifs: req.structure.getModulesActifs()
      });
    }

    next();
  };
};

/**
 * Verifie qu'au moins un des modules specifies est actif
 * @param {Array<string>} moduleCodes - Liste des codes modules
 * @returns {Function} Middleware Express
 */
const checkAnyStructureModule = (moduleCodes) => {
  return (req, res, next) => {
    // Si pas de structure dans le contexte, laisser passer
    if (!req.structure) {
      return next();
    }

    // Convertir les codes et verifier
    const hasAccess = moduleCodes.some(moduleCode => {
      const routeCode = moduleToRoute(moduleCode);
      return req.structure.hasModule(routeCode);
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Modules non disponibles',
        message: `Aucun des modules requis n'est actif pour cette structure`,
        structure: req.structure.nom,
        required_modules: moduleCodes,
        modules_actifs: req.structure.getModulesActifs()
      });
    }

    next();
  };
};

/**
 * Middleware dynamique qui extrait le module depuis les params de route
 * et verifie qu'il est actif pour la structure
 *
 * @param {string} paramName - Nom du parametre contenant le code module/route
 * @returns {Function} Middleware Express
 */
const checkDynamicStructureModule = (paramName = 'module') => {
  return (req, res, next) => {
    // Si pas de structure dans le contexte, laisser passer
    if (!req.structure) {
      return next();
    }

    // Recuperer le code depuis params ou body
    const code = req.params[paramName] || req.body?.[paramName];

    if (!code) {
      return res.status(400).json({
        error: 'Module manquant',
        message: `Le parametre ${paramName} est requis`
      });
    }

    // Convertir en code route si c'est un code module
    const routeCode = moduleToRoute(code);

    // Verifier si le module est actif
    if (!req.structure.hasModule(routeCode)) {
      return res.status(403).json({
        error: 'Module non disponible',
        message: `Le module ${code} n'est pas actif pour cette structure`,
        structure: req.structure.nom,
        modules_actifs: req.structure.getModulesActifs()
      });
    }

    next();
  };
};

module.exports = {
  checkStructureModule,
  checkAnyStructureModule,
  checkDynamicStructureModule,
  moduleToRoute,
  routeToModule,
  MODULE_TO_ROUTE,
  ROUTE_TO_MODULE
};
