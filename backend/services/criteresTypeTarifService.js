/**
 * Service de gestion des criteres dynamiques pour les types de tarifs
 *
 * Ce service gere la logique de verification des criteres d'affichage
 * pour determiner quels types de tarifs sont applicables a un utilisateur.
 *
 * Criteres supportes:
 * - age: Conditions basees sur l'age (operateurs: <, <=, >, >=, entre)
 * - sexe: Liste des sexes acceptes (M, F, A)
 * - commune: Basee sur communaute ou liste de communes
 * - adhesion_active: Adhesion association en cours de validite
 * - tags: Au moins un des tags specifies
 */

const { TypeTarif, Commune, CommunauteCommunesMembre, TagUtilisateur } = require('../models');

/**
 * Verifie le critere d'age
 * @param {Object} utilisateur - Utilisateur avec date_naissance
 * @param {Object} critereAge - { operateur: string, min?: number, max?: number }
 * @param {Date} dateReference - Date de reference (defaut: aujourd'hui)
 * @returns {boolean}
 */
function matchAge(utilisateur, critereAge, dateReference = new Date()) {
  if (!critereAge) return true;

  const age = TypeTarif.calculateAge(utilisateur.date_naissance, dateReference);

  if (age === null || age === undefined) {
    return false;
  }

  switch (critereAge.operateur) {
    case '<':
      return age < (critereAge.max || 999);
    case '<=':
      return age <= (critereAge.max || 999);
    case '>':
      return age > (critereAge.min || 0);
    case '>=':
      return age >= (critereAge.min || 0);
    case 'entre':
      const min = critereAge.min || 0;
      const max = critereAge.max || 999;
      return age >= min && age <= max;
    default:
      return true;
  }
}

/**
 * Verifie le critere de sexe
 * @param {Object} utilisateur - Utilisateur avec sexe
 * @param {Array<string>} critereSexe - Liste des sexes acceptes ['M', 'F', 'A']
 * @returns {boolean}
 */
function matchSexe(utilisateur, critereSexe) {
  if (!critereSexe || !Array.isArray(critereSexe) || critereSexe.length === 0) {
    return true;
  }

  return critereSexe.includes(utilisateur.sexe);
}

/**
 * Verifie le critere de commune
 * Priorite: commune_prise_en_charge_id > code_postal+ville
 *
 * @param {Object} utilisateur - Utilisateur avec commune_prise_en_charge_id, code_postal, ville
 * @param {Object} critereCommune - { type: 'communaute'|'liste', id?: number, ids?: number[] }
 * @returns {Promise<boolean>}
 */
async function matchCommune(utilisateur, critereCommune) {
  if (!critereCommune) return true;

  // 1. Priorite: commune_prise_en_charge_id
  let communeId = utilisateur.commune_prise_en_charge_id;

  // 2. Fallback: chercher par code_postal + ville
  if (!communeId && utilisateur.code_postal) {
    const commune = await Commune.findOne({
      where: { code_postal: utilisateur.code_postal }
    });
    communeId = commune?.id;
  }

  // Si pas de commune identifiee, le critere echoue
  if (!communeId) {
    return false;
  }

  // 3. Verifier selon le type de critere
  if (critereCommune.type === 'communaute') {
    // Verifier si la commune appartient a la communaute
    const count = await CommunauteCommunesMembre.count({
      where: {
        communaute_id: critereCommune.id,
        commune_id: communeId
      }
    });
    return count > 0;
  } else if (critereCommune.type === 'liste') {
    // Verifier si la commune est dans la liste
    return (critereCommune.ids || []).includes(communeId);
  }

  return false;
}

/**
 * Verifie le critere d'adhesion association active
 * @param {Object} utilisateur - Utilisateur avec adhesion_association, date_fin_adhesion_association
 * @returns {boolean}
 */
function matchAdhesion(utilisateur) {
  if (!utilisateur.adhesion_association) {
    return false;
  }
  if (!utilisateur.date_fin_adhesion_association) {
    return false;
  }

  const dateFin = new Date(utilisateur.date_fin_adhesion_association);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  return dateFin >= aujourdhui;
}

/**
 * Verifie le critere de tags (au moins un tag requis)
 * @param {Object} utilisateur - Utilisateur avec tags (array)
 * @param {Array<number>} critereTags - IDs des tags requis
 * @returns {boolean}
 */
function matchTags(utilisateur, critereTags) {
  if (!critereTags || !Array.isArray(critereTags) || critereTags.length === 0) {
    return true;
  }

  if (!utilisateur.tags || !Array.isArray(utilisateur.tags) || utilisateur.tags.length === 0) {
    return false;
  }

  // L'usager doit avoir AU MOINS UN des tags specifies
  const userTagIds = utilisateur.tags.map(t => t.id || t);
  return critereTags.some(id => userTagIds.includes(id));
}

/**
 * Verifie tous les criteres d'un type de tarif pour un utilisateur
 * @param {Object} utilisateur - Utilisateur complet avec tags
 * @param {Object} criteres - Objet criteres du TypeTarif
 * @param {Object} context - { dateReference?: Date }
 * @returns {Promise<boolean>}
 */
async function matchAllCriteres(utilisateur, criteres, context = {}) {
  if (!criteres || Object.keys(criteres).length === 0) {
    return true; // Pas de critere = pour tous
  }

  // Critere d'age
  if (criteres.age) {
    if (!matchAge(utilisateur, criteres.age, context.dateReference)) {
      return false;
    }
  }

  // Critere de sexe
  if (criteres.sexe) {
    if (!matchSexe(utilisateur, criteres.sexe)) {
      return false;
    }
  }

  // Critere de commune (async)
  if (criteres.commune) {
    const communeMatch = await matchCommune(utilisateur, criteres.commune);
    if (!communeMatch) {
      return false;
    }
  }

  // Critere d'adhesion active
  if (criteres.adhesion_active === true) {
    if (!matchAdhesion(utilisateur)) {
      return false;
    }
  }

  // Critere de tags
  if (criteres.tags) {
    if (!matchTags(utilisateur, criteres.tags)) {
      return false;
    }
  }

  return true;
}

/**
 * Trouve tous les types de tarifs applicables a un utilisateur
 * @param {Object} utilisateur - Utilisateur complet avec tags
 * @param {number|null} tarifCotisationId - ID du tarif cotisation (optionnel)
 * @param {number|null} structureId - ID de la structure
 * @param {number|null} organisationId - ID de l'organisation
 * @returns {Promise<Array<TypeTarif>>}
 */
async function findTypesApplicables(utilisateur, tarifCotisationId = null, structureId = null, organisationId = null) {
  const { Op } = require('sequelize');

  // Construire le where clause pour la portee (structure/organisation/global)
  const orConditions = [
    { structure_id: null, organisation_id: null } // Global
  ];
  if (structureId) {
    orConditions.push({ structure_id: structureId });
  }
  if (organisationId) {
    orConditions.push({ organisation_id: organisationId, structure_id: null });
  }

  const whereClause = {
    actif: true,
    [Op.or]: orConditions
  };

  const types = await TypeTarif.findAll({
    where: whereClause,
    order: [['priorite', 'ASC']]
  });

  // Filtrer les types qui matchent les criteres
  const typesApplicables = [];
  for (const type of types) {
    const criteres = type.criteres;

    // Fallback legacy si pas de criteres JSON
    if (!criteres || Object.keys(criteres).length === 0) {
      const age = TypeTarif.calculateAge(utilisateur.date_naissance);
      if (type.matchAge(age)) {
        typesApplicables.push(type);
      }
      continue;
    }

    // Verifier les criteres
    const matches = await matchAllCriteres(utilisateur, criteres);
    if (matches) {
      typesApplicables.push(type);
    }
  }

  return typesApplicables;
}

/**
 * Trouve le premier type de tarif applicable (par priorite)
 * @param {Object} utilisateur - Utilisateur complet avec tags
 * @param {number|null} structureId - ID de la structure
 * @param {number|null} organisationId - ID de l'organisation
 * @returns {Promise<TypeTarif|null>}
 */
async function findPremierTypeApplicable(utilisateur, structureId = null, organisationId = null) {
  const typesApplicables = await findTypesApplicables(utilisateur, null, structureId, organisationId);
  return typesApplicables.length > 0 ? typesApplicables[0] : null;
}

/**
 * Charge les tags utilisateur pour affichage dans la configuration des criteres
 * @param {number|null} structureId - ID de la structure
 * @returns {Promise<Array>}
 */
async function getTagsDisponibles(structureId = null) {
  const { Op } = require('sequelize');

  const where = {
    actif: true,
    [Op.or]: [
      { structure_id: null },
      { structure_id: structureId }
    ]
  };

  return await TagUtilisateur.findAll({
    where,
    order: [['ordre', 'ASC'], ['libelle', 'ASC']],
    attributes: ['id', 'code', 'libelle', 'couleur', 'icone']
  });
}

/**
 * Formate les criteres pour affichage lisible
 * @param {Object} criteres - Criteres JSON
 * @param {Object} options - { includeTagLabels?: boolean }
 * @returns {Promise<string>}
 */
async function formatCriteresDescription(criteres, options = {}) {
  if (!criteres || Object.keys(criteres).length === 0) {
    return 'Aucun critere (pour tous)';
  }

  const parts = [];

  // Age
  if (criteres.age) {
    const op = criteres.age.operateur;
    if (op === 'entre') {
      parts.push(`Age: ${criteres.age.min || 0}-${criteres.age.max || 999} ans`);
    } else if (op === '<' || op === '<=') {
      parts.push(`Age ${op} ${criteres.age.max} ans`);
    } else {
      parts.push(`Age ${op} ${criteres.age.min} ans`);
    }
  }

  // Sexe
  if (criteres.sexe && criteres.sexe.length > 0) {
    const sexeLabels = { M: 'Masculin', F: 'Feminin', A: 'Autre' };
    const labels = criteres.sexe.map(s => sexeLabels[s] || s);
    parts.push(`Sexe: ${labels.join(', ')}`);
  }

  // Adhesion
  if (criteres.adhesion_active) {
    parts.push('Adhesion association active');
  }

  // Tags
  if (criteres.tags && criteres.tags.length > 0) {
    if (options.includeTagLabels) {
      const tags = await TagUtilisateur.findAll({
        where: { id: criteres.tags },
        attributes: ['libelle']
      });
      const tagLabels = tags.map(t => t.libelle);
      parts.push(`Tags: ${tagLabels.join(', ')}`);
    } else {
      parts.push(`Tags requis: ${criteres.tags.length}`);
    }
  }

  // Commune
  if (criteres.commune) {
    if (criteres.commune.type === 'communaute') {
      parts.push('Communaute de communes');
    } else {
      parts.push(`Communes: ${criteres.commune.ids?.length || 0}`);
    }
  }

  return parts.length > 0 ? parts.join(' | ') : 'Aucun critere (pour tous)';
}

module.exports = {
  matchAge,
  matchSexe,
  matchCommune,
  matchAdhesion,
  matchTags,
  matchAllCriteres,
  findTypesApplicables,
  findPremierTypeApplicable,
  getTagsDisponibles,
  formatCriteresDescription
};
