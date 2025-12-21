/**
 * Service Quotient Familial
 * Gestion du quotient familial des utilisateurs avec historique et héritage
 */

const { Utilisateur, HistoriqueQuotientFamilial, ConfigurationQuotientFamilial, TrancheQuotientFamilial, TrancheQFValeur, TypeTarif, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Récupère le QF actif d'un utilisateur à une date donnée
 * Gère l'héritage parent si qf_herite_parent = true
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {Date|string} date - Date de référence (défaut: aujourd'hui)
 * @returns {Object} { quotient_familial, source, herite_de }
 */
async function getQFAtDate(utilisateurId, date = new Date()) {
  const utilisateur = await Utilisateur.findByPk(utilisateurId, {
    include: [{
      model: Utilisateur,
      as: 'parent',
      attributes: ['id', 'nom', 'prenom', 'quotient_familial', 'qf_herite_parent']
    }]
  });

  if (!utilisateur) {
    return { quotient_familial: null, source: null, herite_de: null };
  }

  // Si surcharge manuelle ou pas d'héritage, retourner le QF direct
  if (utilisateur.qf_surcharge_manuelle || !utilisateur.qf_herite_parent) {
    const historiqueQF = await HistoriqueQuotientFamilial.getQFAtDate(utilisateurId, date);
    return {
      quotient_familial: utilisateur.quotient_familial,
      source: historiqueQF?.source || 'direct',
      herite_de: null
    };
  }

  // Héritage du parent
  if (utilisateur.qf_herite_parent && utilisateur.parent) {
    // Récursion: le parent peut aussi hériter
    const parentQF = await getQFAtDate(utilisateur.parent.id, date);
    return {
      quotient_familial: parentQF.quotient_familial,
      source: 'heritage',
      herite_de: {
        id: utilisateur.parent.id,
        nom: utilisateur.parent.nom,
        prenom: utilisateur.parent.prenom
      }
    };
  }

  return { quotient_familial: utilisateur.quotient_familial, source: 'direct', herite_de: null };
}

/**
 * Définit un nouveau QF pour un utilisateur
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {number} quotientFamilial - Valeur du QF
 * @param {Object} options - Options
 * @param {string} options.source - Source (manuel, caf, import)
 * @param {Date|string} options.dateDebut - Date de début
 * @param {string} options.justificatif - Chemin fichier justificatif
 * @param {string} options.notes - Notes
 * @param {number} options.createdBy - ID de l'utilisateur qui crée
 * @param {boolean} options.surchargeManuelle - Force la surcharge manuelle
 * @param {boolean} options.propagerEnfants - Propager aux enfants qui héritent
 * @returns {Object} { historique, utilisateur, enfantsMisAJour }
 */
async function setQF(utilisateurId, quotientFamilial, options = {}) {
  const transaction = await sequelize.transaction();

  try {
    const utilisateur = await Utilisateur.findByPk(utilisateurId);
    if (!utilisateur) {
      throw new Error('Utilisateur non trouvé');
    }

    // Créer l'entrée historique
    const historique = await HistoriqueQuotientFamilial.addNewQF({
      utilisateur_id: utilisateurId,
      quotient_familial: quotientFamilial,
      date_debut: options.dateDebut,
      source: options.source || 'manuel',
      justificatif: options.justificatif,
      notes: options.notes,
      created_by: options.createdBy
    }, { transaction });

    // Mettre à jour les flags si nécessaire
    const updates = { quotient_familial: quotientFamilial };
    if (options.surchargeManuelle !== undefined) {
      updates.qf_surcharge_manuelle = options.surchargeManuelle;
    }
    await utilisateur.update(updates, { transaction });

    // Propager aux enfants qui héritent
    let enfantsMisAJour = [];
    if (options.propagerEnfants !== false) {
      enfantsMisAJour = await propagerQFEnfants(utilisateurId, quotientFamilial, {
        transaction,
        dateDebut: options.dateDebut,
        createdBy: options.createdBy
      });
    }

    await transaction.commit();

    logger.info(`QF mis à jour pour utilisateur ${utilisateurId}: ${quotientFamilial}`, {
      source: options.source,
      enfantsMisAJour: enfantsMisAJour.length
    });

    return {
      historique,
      utilisateur: await Utilisateur.findByPk(utilisateurId),
      enfantsMisAJour
    };

  } catch (error) {
    await transaction.rollback();
    logger.error(`Erreur setQF: ${error.message}`, { utilisateurId, quotientFamilial });
    throw error;
  }
}

/**
 * Propage le QF aux enfants qui héritent
 * @param {number} parentId - ID du parent
 * @param {number} quotientFamilial - Valeur du QF
 * @param {Object} options - Options de transaction
 * @returns {Array} Liste des enfants mis à jour
 */
async function propagerQFEnfants(parentId, quotientFamilial, options = {}) {
  const enfants = await Utilisateur.findAll({
    where: {
      utilisateur_parent_id: parentId,
      qf_herite_parent: true,
      qf_surcharge_manuelle: false
    }
  });

  const enfantsMisAJour = [];

  for (const enfant of enfants) {
    // Créer entrée historique pour l'enfant
    await HistoriqueQuotientFamilial.addNewQF({
      utilisateur_id: enfant.id,
      quotient_familial: quotientFamilial,
      date_debut: options.dateDebut,
      source: 'heritage',
      notes: `Hérité du parent ${parentId}`,
      created_by: options.createdBy
    }, options);

    // Mise à jour du cache
    await enfant.update({ quotient_familial: quotientFamilial }, options);

    enfantsMisAJour.push({
      id: enfant.id,
      nom: enfant.nom,
      prenom: enfant.prenom
    });

    // Récursion: propager aux petits-enfants
    const petitsEnfants = await propagerQFEnfants(enfant.id, quotientFamilial, options);
    enfantsMisAJour.push(...petitsEnfants);
  }

  return enfantsMisAJour;
}

/**
 * Active/désactive l'héritage du QF parent pour un utilisateur
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {boolean} heriter - true pour activer l'héritage
 * @param {number} createdBy - ID de l'utilisateur qui modifie
 * @returns {Object} Utilisateur mis à jour
 */
async function setHeritageQF(utilisateurId, heriter, createdBy = null) {
  const utilisateur = await Utilisateur.findByPk(utilisateurId, {
    include: [{
      model: Utilisateur,
      as: 'parent',
      attributes: ['id', 'quotient_familial']
    }]
  });

  if (!utilisateur) {
    throw new Error('Utilisateur non trouvé');
  }

  if (heriter && !utilisateur.parent) {
    throw new Error('Impossible d\'hériter: aucun parent défini');
  }

  const transaction = await sequelize.transaction();

  try {
    await utilisateur.update({
      qf_herite_parent: heriter,
      qf_surcharge_manuelle: !heriter // Désactiver surcharge si on active héritage
    }, { transaction });

    // Si on active l'héritage, copier le QF du parent
    if (heriter && utilisateur.parent?.quotient_familial) {
      await HistoriqueQuotientFamilial.addNewQF({
        utilisateur_id: utilisateurId,
        quotient_familial: utilisateur.parent.quotient_familial,
        source: 'heritage',
        notes: `Héritage activé depuis parent ${utilisateur.parent.id}`,
        created_by: createdBy
      }, { transaction });

      await utilisateur.update({
        quotient_familial: utilisateur.parent.quotient_familial
      }, { transaction });
    }

    await transaction.commit();

    return await Utilisateur.findByPk(utilisateurId);

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Récupère l'historique complet du QF d'un utilisateur
 * @param {number} utilisateurId - ID de l'utilisateur
 * @returns {Array} Historique du QF
 */
async function getHistoriqueQF(utilisateurId) {
  return await HistoriqueQuotientFamilial.getHistorique(utilisateurId);
}

/**
 * Trouve la tranche de QF applicable pour un quotient donné
 * @param {number} quotientFamilial - Valeur du QF
 * @param {number} configurationId - ID de la configuration (défaut: configuration par défaut)
 * @param {number} structureId - ID de la structure
 * @returns {Object|null} Tranche applicable
 */
async function findTrancheQF(quotientFamilial, configurationId = null, structureId = null) {
  let config;

  if (configurationId) {
    config = await ConfigurationQuotientFamilial.findByPk(configurationId, {
      include: [{
        model: TrancheQuotientFamilial,
        as: 'tranches',
        where: { actif: true },
        required: false,
        order: [['ordre', 'ASC']]
      }]
    });
  } else {
    config = await ConfigurationQuotientFamilial.getDefault(structureId);
  }

  if (!config || !config.tranches) {
    return null;
  }

  // Trouver la tranche correspondante
  for (const tranche of config.tranches) {
    if (tranche.matchQF(quotientFamilial)) {
      return tranche;
    }
  }

  return null;
}

/**
 * Calcule le montant selon la tranche de QF
 * @param {number} quotientFamilial - Valeur du QF
 * @param {number} tarifBase - Tarif de base (pour calcul pourcentage)
 * @param {number} configurationId - ID de la configuration
 * @param {number} structureId - ID de la structure
 * @param {number} typeTarifId - ID du type de tarif (optionnel, pour valeur QF par type)
 * @returns {Object} { montant, tranche, type_calcul }
 */
async function calculerMontantQF(quotientFamilial, tarifBase, configurationId = null, structureId = null, typeTarifId = null) {
  // Si pas de QF, retourner tarif max (borne supérieure ou base)
  if (quotientFamilial === null || quotientFamilial === undefined) {
    return {
      montant: tarifBase,
      tranche: null,
      type_calcul: 'defaut',
      message: 'QF non renseigné - tarif maximum appliqué'
    };
  }

  const tranche = await findTrancheQF(quotientFamilial, configurationId, structureId);

  if (!tranche) {
    return {
      montant: tarifBase,
      tranche: null,
      type_calcul: 'defaut',
      message: 'Aucune tranche applicable - tarif de base'
    };
  }

  // Si un type de tarif est spécifié, chercher la valeur spécifique pour ce type
  let valeurSpecifique = null;
  let typeCalcul = tranche.type_calcul;
  let valeurTranche = parseFloat(tranche.valeur);

  if (typeTarifId) {
    valeurSpecifique = await TrancheQFValeur.getValeurPourType(tranche.id, typeTarifId);

    if (valeurSpecifique) {
      typeCalcul = valeurSpecifique.type_calcul;
      valeurTranche = parseFloat(valeurSpecifique.valeur);
    }
  }

  // Calculer le montant selon le type de calcul
  let montant;
  if (typeCalcul === 'pourcentage') {
    montant = Math.round((tarifBase * valeurTranche / 100) * 100) / 100;
  } else {
    montant = valeurTranche; // Montant fixe
  }

  return {
    montant,
    tranche: {
      id: tranche.id,
      libelle: tranche.libelle,
      borne_min: tranche.borne_min,
      borne_max: tranche.borne_max
    },
    type_calcul: typeCalcul,
    valeur_tranche: valeurTranche,
    valeur_specifique_type: valeurSpecifique !== null
  };
}

/**
 * Importe des QF depuis un fichier CSV/Excel
 * @param {Array} data - Données à importer [{code_barre, quotient_familial, date_debut, source}]
 * @param {number} createdBy - ID de l'utilisateur qui importe
 * @returns {Object} { succes, erreurs, total }
 */
async function importerQF(data, createdBy = null) {
  const resultats = {
    succes: 0,
    erreurs: [],
    total: data.length
  };

  for (const ligne of data) {
    try {
      const utilisateur = await Utilisateur.findOne({
        where: { code_barre: ligne.code_barre }
      });

      if (!utilisateur) {
        resultats.erreurs.push({
          code_barre: ligne.code_barre,
          erreur: 'Utilisateur non trouvé'
        });
        continue;
      }

      await setQF(utilisateur.id, parseInt(ligne.quotient_familial), {
        source: ligne.source || 'import',
        dateDebut: ligne.date_debut,
        createdBy,
        propagerEnfants: true
      });

      resultats.succes++;

    } catch (error) {
      resultats.erreurs.push({
        code_barre: ligne.code_barre,
        erreur: error.message
      });
    }
  }

  logger.info(`Import QF terminé: ${resultats.succes}/${resultats.total} succès`, {
    erreurs: resultats.erreurs.length
  });

  return resultats;
}

/**
 * Calcule les statistiques QF pour une structure
 * @param {number} structureId - ID de la structure
 * @returns {Object} Statistiques
 */
async function getStatistiquesQF(structureId = null) {
  const where = structureId ? { structure_id: structureId } : {};

  const utilisateurs = await Utilisateur.findAll({
    where: {
      ...where,
      statut: 'actif',
      role: 'usager'
    },
    attributes: ['id', 'quotient_familial', 'qf_herite_parent', 'qf_surcharge_manuelle']
  });

  const stats = {
    total: utilisateurs.length,
    avec_qf: 0,
    sans_qf: 0,
    herite_parent: 0,
    surcharge_manuelle: 0,
    distribution: {}
  };

  // Configuration par défaut pour les tranches
  const config = await ConfigurationQuotientFamilial.getDefault(structureId);
  const tranches = config?.tranches || [];

  // Initialiser les compteurs par tranche
  for (const tranche of tranches) {
    stats.distribution[tranche.libelle] = 0;
  }
  stats.distribution['Sans tranche'] = 0;

  for (const u of utilisateurs) {
    if (u.quotient_familial !== null) {
      stats.avec_qf++;

      // Trouver la tranche
      const trancheMatch = tranches.find(t => t.matchQF(u.quotient_familial));
      if (trancheMatch) {
        stats.distribution[trancheMatch.libelle]++;
      } else {
        stats.distribution['Sans tranche']++;
      }
    } else {
      stats.sans_qf++;
    }

    if (u.qf_herite_parent) stats.herite_parent++;
    if (u.qf_surcharge_manuelle) stats.surcharge_manuelle++;
  }

  return stats;
}

module.exports = {
  getQFAtDate,
  setQF,
  setHeritageQF,
  getHistoriqueQF,
  findTrancheQF,
  calculerMontantQF,
  propagerQFEnfants,
  importerQF,
  getStatistiquesQF
};
