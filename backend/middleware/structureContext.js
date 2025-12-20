/**
 * Middleware structureContext
 * Extrait la structure du header X-Structure-Id
 * Verifie que l'utilisateur a acces a cette structure
 * Ajoute req.structureId et req.structureAccess au contexte
 */

const { UtilisateurStructure, Structure } = require('../models');

/**
 * Middleware pour extraire et valider le contexte structure
 * @param {Object} options - Options du middleware
 * @param {boolean} options.required - Si true, structure obligatoire (defaut: false)
 */
const structureContext = (options = {}) => {
  const { required = false } = options;

  return async (req, res, next) => {
    try {
      const structureId = req.headers['x-structure-id'];

      // Si pas de structure demandee
      if (!structureId) {
        if (required) {
          return res.status(400).json({
            error: 'Structure requise',
            message: 'Header X-Structure-Id manquant'
          });
        }
        // Pas de filtrage par structure
        req.structureId = null;
        req.structureAccess = null;
        return next();
      }

      // Valider que c'est un nombre
      const parsedId = parseInt(structureId, 10);
      if (isNaN(parsedId)) {
        return res.status(400).json({
          error: 'Structure invalide',
          message: 'X-Structure-Id doit etre un nombre'
        });
      }

      // Verifier que la structure existe
      const structure = await Structure.findByPk(parsedId);
      if (!structure) {
        return res.status(404).json({
          error: 'Structure introuvable',
          message: `Structure ${parsedId} n'existe pas`
        });
      }

      if (!structure.actif) {
        return res.status(403).json({
          error: 'Structure inactive',
          message: 'Cette structure est desactivee'
        });
      }

      // Administrateur global a acces a tout
      if (req.user && req.user.role === 'administrateur') {
        req.structureId = parsedId;
        req.structure = structure;
        req.structureAccess = { role_structure: 'administrateur', actif: true };
        return next();
      }

      // Verifier l'acces utilisateur a cette structure
      if (req.user) {
        const access = await UtilisateurStructure.findOne({
          where: {
            utilisateur_id: req.user.id,
            structure_id: parsedId,
            actif: true
          }
        });

        if (!access) {
          return res.status(403).json({
            error: 'Acces refuse',
            message: 'Vous n\'avez pas acces a cette structure'
          });
        }

        // Verifier dates de validite
        const now = new Date();
        if (access.date_debut && new Date(access.date_debut) > now) {
          return res.status(403).json({
            error: 'Acces non encore actif',
            message: 'Votre acces a cette structure n\'est pas encore actif'
          });
        }
        if (access.date_fin && new Date(access.date_fin) < now) {
          return res.status(403).json({
            error: 'Acces expire',
            message: 'Votre acces a cette structure a expire'
          });
        }

        req.structureId = parsedId;
        req.structure = structure;
        req.structureAccess = access;
      } else {
        // Pas d'utilisateur authentifie mais structure demandee (cas API publique)
        req.structureId = parsedId;
        req.structure = structure;
        req.structureAccess = null;
      }

      next();
    } catch (error) {
      console.error('Erreur structureContext:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: 'Erreur lors de la verification de l\'acces structure'
      });
    }
  };
};

/**
 * Helper pour obtenir le role effectif d'un utilisateur dans une structure
 * Retourne le role_structure si defini, sinon le role global
 */
const getEffectiveRole = (user, structureAccess) => {
  if (!user) return null;
  if (!structureAccess) return user.role;
  return structureAccess.role_structure || user.role;
};

/**
 * Helper pour verifier si l'utilisateur a un role minimum dans la structure
 */
const hasMinRole = (effectiveRole, minRole) => {
  // Doit correspondre a ROLE_HIERARCHY dans checkRole.js
  const roleHierarchy = ['usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];
  const effectiveIndex = roleHierarchy.indexOf(effectiveRole);
  const minIndex = roleHierarchy.indexOf(minRole);
  return effectiveIndex >= minIndex;
};

/**
 * Middleware pour verifier un role minimum dans la structure courante
 */
const requireStructureRole = (minRole) => {
  return (req, res, next) => {
    const effectiveRole = getEffectiveRole(req.user, req.structureAccess);

    if (!effectiveRole) {
      return res.status(401).json({
        error: 'Non authentifie',
        message: 'Authentification requise'
      });
    }

    if (!hasMinRole(effectiveRole, minRole)) {
      return res.status(403).json({
        error: 'Role insuffisant',
        message: `Role ${minRole} minimum requis pour cette action`
      });
    }

    next();
  };
};

/**
 * Verifie si un utilisateur peut gerer une structure donnee
 * @param {Object} user - Utilisateur (avec id et role)
 * @param {number} structureId - ID de la structure cible
 * @param {string} minRole - Role minimum requis (defaut: gestionnaire)
 * @returns {Promise<boolean>}
 */
const canManageStructure = async (user, structureId, minRole = 'gestionnaire') => {
  if (!user) return false;

  // Admin global peut gerer toutes les structures
  if (user.role === 'administrateur') return true;

  // Verifier l'acces a la structure avec role suffisant
  const access = await UtilisateurStructure.findOne({
    where: {
      utilisateur_id: user.id,
      structure_id: structureId,
      actif: true
    }
  });

  if (!access) return false;

  // Verifier dates de validite
  const now = new Date();
  if (access.date_debut && new Date(access.date_debut) > now) return false;
  if (access.date_fin && new Date(access.date_fin) < now) return false;

  // Verifier le role (role_structure ou role global en fallback)
  const effectiveRole = access.role_structure || user.role;
  return hasMinRole(effectiveRole, minRole);
};

/**
 * Recupere toutes les structures accessibles par un utilisateur
 * @param {Object} user - Utilisateur (avec id et role)
 * @param {string} minRole - Role minimum (defaut: null = tous les acces)
 * @returns {Promise<Array>} - Liste des structures avec role effectif
 */
const getAccessibleStructures = async (user, minRole = null) => {
  if (!user) return [];

  // Admin global a acces a toutes les structures
  if (user.role === 'administrateur') {
    const structures = await Structure.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    return structures.map(s => ({
      ...s.toJSON(),
      role_effectif: 'administrateur',
      is_admin_global: true
    }));
  }

  // Recuperer les acces utilisateur
  const accesses = await UtilisateurStructure.findAll({
    where: {
      utilisateur_id: user.id,
      actif: true
    },
    include: [{
      model: Structure,
      as: 'structure',
      where: { actif: true }
    }]
  });

  const now = new Date();
  return accesses
    .filter(access => {
      // Filtrer par dates
      if (access.date_debut && new Date(access.date_debut) > now) return false;
      if (access.date_fin && new Date(access.date_fin) < now) return false;
      // Filtrer par role minimum si specifie
      if (minRole) {
        const effectiveRole = access.role_structure || user.role;
        return hasMinRole(effectiveRole, minRole);
      }
      return true;
    })
    .map(access => ({
      ...access.structure.toJSON(),
      role_effectif: access.role_structure || user.role,
      role_structure: access.role_structure,
      date_debut: access.date_debut,
      date_fin: access.date_fin,
      is_admin_global: false
    }));
};

module.exports = {
  structureContext,
  getEffectiveRole,
  hasMinRole,
  requireStructureRole,
  canManageStructure,
  getAccessibleStructures
};
