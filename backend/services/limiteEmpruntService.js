/**
 * Service de validation des limites d'emprunt
 *
 * Gère 3 niveaux de limites hiérarchiques :
 * 1. Limite générale par module (ex: max 5 jeux)
 * 2. Limite par genre (ex: max 3 BD, max 2 magazines)
 * 3. Limite de nouveautés (ex: max 1 nouveauté)
 *
 * Les limites peuvent être bloquantes ou non (warning seulement).
 */

const {
  Emprunt, ParametresFront, LimiteEmpruntGenre,
  Jeu, Livre, Film, Disque,
  GenreLitteraire, GenreFilm, GenreMusical, Categorie
} = require('../models');
const { Op } = require('sequelize');

// Mapping module -> type d'item et table
const MODULE_CONFIG = {
  ludotheque: {
    itemType: 'jeu',
    model: Jeu,
    foreignKey: 'jeu_id',
    genreModel: Categorie, // Les jeux utilisent les catégories comme "genres"
    genreAssociation: 'categoriesRef',
    nouveauteDureeField: 'nouveaute_duree_ludotheque',
    nouveauteActiveField: 'nouveaute_active_ludotheque'
  },
  bibliotheque: {
    itemType: 'livre',
    model: Livre,
    foreignKey: 'livre_id',
    genreModel: GenreLitteraire,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_bibliotheque',
    nouveauteActiveField: 'nouveaute_active_bibliotheque'
  },
  filmotheque: {
    itemType: 'film',
    model: Film,
    foreignKey: 'film_id',
    genreModel: GenreFilm,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_filmotheque',
    nouveauteActiveField: 'nouveaute_active_filmotheque'
  },
  discotheque: {
    itemType: 'disque',
    model: Disque,
    foreignKey: 'disque_id',
    genreModel: GenreMusical,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_discotheque',
    nouveauteActiveField: 'nouveaute_active_discotheque'
  }
};

/**
 * Vérifie si un article est une nouveauté
 * @param {Object} item - L'article (jeu, livre, film, disque)
 * @param {string} module - Le module (ludotheque, bibliotheque, etc.)
 * @param {Object} params - Les paramètres front
 * @returns {boolean}
 */
function isNouveaute(item, module, params) {
  const config = MODULE_CONFIG[module];
  if (!config) return false;

  // Vérifier si les nouveautés sont actives pour ce module
  if (!params[config.nouveauteActiveField]) return false;

  // Statut forcé
  if (item.statut_nouveaute === 'force_nouveau') return true;
  if (item.statut_nouveaute === 'jamais_nouveau') return false;

  // Calcul automatique basé sur date_ajout
  if (!item.date_ajout) return false;

  const dureeNouveaute = params[config.nouveauteDureeField] || 30;
  const dateAjout = new Date(item.date_ajout);
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() - dureeNouveaute);

  return dateAjout >= dateLimite;
}

/**
 * Compte les emprunts en cours d'un utilisateur par module
 * @param {number} utilisateurId
 * @param {string} module
 * @returns {Promise<number>}
 */
async function countEmpruntsEnCours(utilisateurId, module) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  const where = {
    utilisateur_id: utilisateurId,
    statut: { [Op.in]: ['en_cours', 'en_retard'] },
    [config.foreignKey]: { [Op.not]: null }
  };

  return await Emprunt.count({ where });
}

/**
 * Compte les emprunts en cours d'un utilisateur pour un genre spécifique
 * @param {number} utilisateurId
 * @param {string} module
 * @param {number} genreId
 * @returns {Promise<number>}
 */
async function countEmpruntsParGenre(utilisateurId, module, genreId) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  // Récupérer les emprunts en cours pour ce module
  const emprunts = await Emprunt.findAll({
    where: {
      utilisateur_id: utilisateurId,
      statut: { [Op.in]: ['en_cours', 'en_retard'] },
      [config.foreignKey]: { [Op.not]: null }
    },
    include: [{
      model: config.model,
      as: config.itemType,
      include: [{
        model: config.genreModel,
        as: config.genreAssociation,
        where: { id: genreId },
        required: true
      }]
    }]
  });

  return emprunts.filter(e => e[config.itemType]).length;
}

/**
 * Compte les emprunts de nouveautés en cours d'un utilisateur par module
 * @param {number} utilisateurId
 * @param {string} module
 * @param {Object} params - Les paramètres front
 * @returns {Promise<number>}
 */
async function countEmpruntsNouveautes(utilisateurId, module, params) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  // Récupérer les emprunts en cours pour ce module avec l'item
  const emprunts = await Emprunt.findAll({
    where: {
      utilisateur_id: utilisateurId,
      statut: { [Op.in]: ['en_cours', 'en_retard'] },
      [config.foreignKey]: { [Op.not]: null }
    },
    include: [{
      model: config.model,
      as: config.itemType
    }]
  });

  // Filtrer ceux qui sont des nouveautés
  let count = 0;
  for (const emprunt of emprunts) {
    const item = emprunt[config.itemType];
    if (item && isNouveaute(item, module, params)) {
      count++;
    }
  }

  return count;
}

/**
 * Récupère les genres d'un article
 * @param {Object} item - L'article chargé avec ses associations
 * @param {string} module
 * @returns {Array<{id: number, nom: string}>}
 */
function getGenresFromItem(item, module) {
  const config = MODULE_CONFIG[module];
  if (!config || !item) return [];

  const genres = item[config.genreAssociation];
  if (!genres || !Array.isArray(genres)) return [];

  return genres.map(g => ({ id: g.id, nom: g.nom }));
}

/**
 * Valide les limites d'emprunt pour un utilisateur et un article
 *
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {string} module - Module concerné (ludotheque, bibliotheque, filmotheque, discotheque)
 * @param {number} itemId - ID de l'article à emprunter
 * @param {Object} options - Options
 * @param {boolean} options.skipWarnings - Si true, ignore les limites non-bloquantes
 * @returns {Promise<{
 *   allowed: boolean,
 *   blocking: boolean,
 *   warnings: Array<{type: string, message: string, current: number, limit: number}>,
 *   errors: Array<{type: string, message: string, current: number, limit: number}>
 * }>}
 */
async function validateEmpruntLimits(utilisateurId, module, itemId, options = {}) {
  const result = {
    allowed: true,
    blocking: false,
    warnings: [],
    errors: []
  };

  const config = MODULE_CONFIG[module];
  if (!config) {
    return result; // Module inconnu, pas de validation
  }

  // Charger les paramètres
  const params = await ParametresFront.getParametres();

  // Récupérer les paramètres de limite pour ce module
  const limiteGenerale = params[`limite_emprunt_${module}`] || 5;
  const limiteNouveaute = params[`limite_emprunt_nouveaute_${module}`] || 1;
  const limiteBloquante = params[`limite_emprunt_bloquante_${module}`] !== false;

  // Charger l'article avec ses genres
  const item = await config.model.findByPk(itemId, {
    include: [{
      model: config.genreModel,
      as: config.genreAssociation
    }]
  });

  if (!item) {
    result.allowed = false;
    result.blocking = true;
    result.errors.push({
      type: 'item_not_found',
      message: 'Article introuvable',
      current: 0,
      limit: 0
    });
    return result;
  }

  // 1. Vérifier la limite générale
  const currentTotal = await countEmpruntsEnCours(utilisateurId, module);
  if (currentTotal >= limiteGenerale) {
    const violation = {
      type: 'limite_generale',
      message: `Limite d'emprunts atteinte (${currentTotal}/${limiteGenerale})`,
      current: currentTotal,
      limit: limiteGenerale
    };

    if (limiteBloquante) {
      result.allowed = false;
      result.blocking = true;
      result.errors.push(violation);
    } else if (!options.skipWarnings) {
      result.warnings.push(violation);
    }
  }

  // 2. Vérifier la limite de nouveauté (si l'article est une nouveauté)
  if (isNouveaute(item, module, params)) {
    const currentNouveautes = await countEmpruntsNouveautes(utilisateurId, module, params);
    if (currentNouveautes >= limiteNouveaute) {
      const violation = {
        type: 'limite_nouveaute',
        message: `Limite de nouveautés atteinte (${currentNouveautes}/${limiteNouveaute})`,
        current: currentNouveautes,
        limit: limiteNouveaute
      };

      if (limiteBloquante) {
        result.allowed = false;
        result.blocking = true;
        result.errors.push(violation);
      } else if (!options.skipWarnings) {
        result.warnings.push(violation);
      }
    }
  }

  // 3. Vérifier les limites par genre
  const genres = getGenresFromItem(item, module);
  const limitesGenre = await LimiteEmpruntGenre.findAll({
    where: {
      module,
      actif: true,
      genre_id: { [Op.in]: genres.map(g => g.id) }
    }
  });

  for (const limiteGenre of limitesGenre) {
    const genre = genres.find(g => g.id === limiteGenre.genre_id);
    const currentGenre = await countEmpruntsParGenre(utilisateurId, module, limiteGenre.genre_id);

    if (currentGenre >= limiteGenre.limite_max) {
      const violation = {
        type: 'limite_genre',
        message: `Limite pour "${genre?.nom || limiteGenre.genre_nom}" atteinte (${currentGenre}/${limiteGenre.limite_max})`,
        current: currentGenre,
        limit: limiteGenre.limite_max,
        genreId: limiteGenre.genre_id,
        genreNom: genre?.nom || limiteGenre.genre_nom
      };

      if (limiteBloquante) {
        result.allowed = false;
        result.blocking = true;
        result.errors.push(violation);
      } else if (!options.skipWarnings) {
        result.warnings.push(violation);
      }
    }
  }

  return result;
}

/**
 * Récupère le résumé des limites actuelles pour un utilisateur et un module
 *
 * @param {number} utilisateurId
 * @param {string} module
 * @returns {Promise<{
 *   general: {current: number, limit: number},
 *   nouveautes: {current: number, limit: number},
 *   genres: Array<{genreId: number, genreNom: string, current: number, limit: number}>
 * }>}
 */
async function getLimitsSummary(utilisateurId, module) {
  const config = MODULE_CONFIG[module];
  if (!config) return null;

  const params = await ParametresFront.getParametres();

  const limiteGenerale = params[`limite_emprunt_${module}`] || 5;
  const limiteNouveaute = params[`limite_emprunt_nouveaute_${module}`] || 1;

  const currentTotal = await countEmpruntsEnCours(utilisateurId, module);
  const currentNouveautes = await countEmpruntsNouveautes(utilisateurId, module, params);

  // Récupérer toutes les limites par genre pour ce module
  const limitesGenre = await LimiteEmpruntGenre.findAll({
    where: { module, actif: true }
  });

  const genres = [];
  for (const limite of limitesGenre) {
    const current = await countEmpruntsParGenre(utilisateurId, module, limite.genre_id);
    genres.push({
      genreId: limite.genre_id,
      genreNom: limite.genre_nom,
      current,
      limit: limite.limite_max
    });
  }

  return {
    general: { current: currentTotal, limit: limiteGenerale },
    nouveautes: { current: currentNouveautes, limit: limiteNouveaute },
    genres
  };
}

module.exports = {
  validateEmpruntLimits,
  getLimitsSummary,
  countEmpruntsEnCours,
  countEmpruntsParGenre,
  countEmpruntsNouveautes,
  isNouveaute,
  MODULE_CONFIG
};
