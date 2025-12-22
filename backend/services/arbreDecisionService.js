/**
 * Service Arbre de Decision Tarifaire
 *
 * Evalue les arbres de decision de maniere cumulative
 * pour calculer les reductions de cotisations.
 */

const {
  ArbreDecision,
  TarifCotisation,
  TypeConditionTarif,
  OperationComptableReduction,
  CotisationReduction,
  Cotisation,
  Utilisateur,
  Commune,
  CommunauteCommunes,
  CommunauteCommunesMembre,
  TagUtilisateur,
  Structure,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class ArbreDecisionService {

  /**
   * Evalue l'arbre de maniere cumulative
   * Parcourt TOUS les noeuds, cumule les reductions des branches matchees
   * Supporte les sous-conditions imbriquees (enfants)
   * @param {number} arbreId - ID de l'arbre
   * @param {Object} utilisateur - Utilisateur avec ses donnees
   * @param {Object} context - Contexte (dateCotisation, structureId)
   * @returns {Object} { reductions, chemin, totalReductions, trace }
   */
  async evaluerArbre(arbreId, utilisateur, context = {}) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    if (!arbre) {
      throw new Error(`Arbre de decision ${arbreId} non trouve`);
    }

    const structure = arbre.arbre_json;
    if (!structure.noeuds || structure.noeuds.length === 0) {
      return { reductions: [], chemin: [], totalReductions: 0, trace: [] };
    }

    const reductions = [];
    const chemin = [];
    const trace = [];  // Trace detaillee de l'evaluation
    let totalReductions = 0;

    // Trier les noeuds par ordre
    const noeuds = [...structure.noeuds].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    for (const noeud of noeuds) {
      const resultat = await this.evaluerNoeud(noeud, utilisateur, context, trace);

      if (resultat) {
        chemin.push(...resultat.chemin);
        reductions.push(...resultat.reductions);
        totalReductions += resultat.totalReductions;
      }
    }

    return { reductions, chemin, totalReductions, trace };
  }

  /**
   * Evalue un noeud et ses sous-conditions (enfants)
   * @param {Object} noeud - Noeud a evaluer
   * @param {Object} utilisateur - Utilisateur
   * @param {Object} context - Contexte
   * @param {Array} trace - Tableau pour tracer l'evaluation
   * @returns {Object|null} { reductions, chemin, totalReductions }
   */
  async evaluerNoeud(noeud, utilisateur, context, trace = []) {
    const traceNoeud = {
      noeud_id: noeud.id,
      noeud_type: noeud.type,
      branches_testees: [],
      branche_selectionnee: null,
      reduction: null,
      enfants: []
    };

    // Tester chaque branche et enregistrer le resultat
    const { brancheMatch, branchesTestees } = await this.trouverBrancheMatchAvecTrace(noeud, utilisateur, context);
    traceNoeud.branches_testees = branchesTestees;

    if (!brancheMatch) {
      traceNoeud.branche_selectionnee = null;
      trace.push(traceNoeud);
      return null;
    }

    traceNoeud.branche_selectionnee = {
      id: brancheMatch.id,
      code: brancheMatch.code,
      libelle: brancheMatch.libelle
    };

    const reductions = [];
    const chemin = [];
    let totalReductions = 0;

    // Ajouter le chemin pour cette branche
    chemin.push({
      noeud_id: noeud.id,
      noeud_type: noeud.type,
      branche_id: brancheMatch.id,
      branche_code: brancheMatch.code,
      branche_libelle: brancheMatch.libelle
    });

    // Ajouter la reduction de cette branche
    if (brancheMatch.reduction) {
      const montantReduction = this.calculerMontantReduction(
        brancheMatch.reduction,
        context.montantBase || 0
      );

      const reductionInfo = {
        operation_id: brancheMatch.reduction.operation_id,
        type_source: noeud.type,
        branche_code: brancheMatch.code,
        branche_libelle: brancheMatch.libelle,
        type_calcul: brancheMatch.reduction.type_calcul,
        valeur: brancheMatch.reduction.valeur,
        montant_reduction: montantReduction
      };

      reductions.push(reductionInfo);
      totalReductions += montantReduction;

      traceNoeud.reduction = {
        type_calcul: brancheMatch.reduction.type_calcul,
        valeur: brancheMatch.reduction.valeur,
        montant: montantReduction
      };
    }

    // Evaluer les sous-conditions (enfants) de cette branche
    if (brancheMatch.enfants && brancheMatch.enfants.length > 0) {
      for (const enfant of brancheMatch.enfants) {
        const traceEnfants = [];
        const resultatEnfant = await this.evaluerNoeud(enfant, utilisateur, context, traceEnfants);

        traceNoeud.enfants.push(...traceEnfants);

        if (resultatEnfant) {
          chemin.push(...resultatEnfant.chemin);
          reductions.push(...resultatEnfant.reductions);
          totalReductions += resultatEnfant.totalReductions;
        }
      }
    }

    trace.push(traceNoeud);
    return { reductions, chemin, totalReductions };
  }

  /**
   * Trouve la branche qui match et retourne aussi les branches testees
   */
  async trouverBrancheMatchAvecTrace(noeud, utilisateur, context) {
    const branchesTestees = [];

    if (!noeud.branches || noeud.branches.length === 0) {
      return { brancheMatch: null, branchesTestees };
    }

    for (const branche of noeud.branches) {
      const { match, details } = await this.matchConditionAvecDetails(noeud.type, branche.condition, utilisateur, context);

      branchesTestees.push({
        id: branche.id,
        code: branche.code,
        libelle: branche.libelle,
        condition: branche.condition,
        match,
        details
      });

      if (match) {
        return { brancheMatch: branche, branchesTestees };
      }
    }

    // Derniere branche par defaut si aucune condition explicite
    const derniereBranche = noeud.branches[noeud.branches.length - 1];
    if (derniereBranche.condition?.type === 'autre' || derniereBranche.condition?.type === 'default') {
      return { brancheMatch: derniereBranche, branchesTestees };
    }

    return { brancheMatch: null, branchesTestees };
  }

  /**
   * Calcule le montant de reduction
   * @param {Object} reduction - Objet reduction de la branche
   * @param {number} montantBase - Montant de base de la cotisation
   * @returns {number}
   */
  calculerMontantReduction(reduction, montantBase) {
    if (!reduction) return 0;

    const valeur = parseFloat(reduction.valeur) || 0;
    if (reduction.type_calcul === 'pourcentage') {
      return Math.round((montantBase * valeur / 100) * 100) / 100;
    }
    return valeur;
  }

  /**
   * Trouve la branche qui match pour un noeud
   * @param {Object} noeud - Noeud de l'arbre
   * @param {Object} utilisateur - Utilisateur
   * @param {Object} context - Contexte
   * @returns {Object|null} Branche matchee ou null
   */
  async trouverBrancheMatch(noeud, utilisateur, context) {
    if (!noeud.branches || noeud.branches.length === 0) {
      return null;
    }

    for (const branche of noeud.branches) {
      const match = await this.matchCondition(noeud.type, branche.condition, utilisateur, context);
      if (match) {
        return branche;
      }
    }

    // Derniere branche par defaut si aucune condition explicite
    const derniereBranche = noeud.branches[noeud.branches.length - 1];
    if (derniereBranche.condition?.type === 'autre' || derniereBranche.condition?.type === 'default') {
      return derniereBranche;
    }

    return null;
  }

  /**
   * Verifie si une condition match
   * @param {string} type - Type de noeud (COMMUNE, QF, AGE, etc.)
   * @param {Object} condition - Condition a evaluer
   * @param {Object} utilisateur - Utilisateur
   * @param {Object} context - Contexte
   * @returns {boolean}
   */
  async matchCondition(type, condition, utilisateur, context) {
    if (!condition) return false;

    switch (type) {
      case 'COMMUNE':
        return await this.matchCommune(condition, utilisateur, context);
      case 'QF':
        return this.matchQF(condition, utilisateur);
      case 'AGE':
        return this.matchAge(condition, utilisateur, context.dateCotisation);
      case 'FIDELITE':
        return await this.matchFidelite(condition, utilisateur);
      case 'MULTI_INSCRIPTIONS':
        return await this.matchMultiInscriptions(condition, utilisateur, context);
      case 'TAG':
      case 'STATUT_SOCIAL':  // Retrocompatibilite
        return await this.matchTag(condition, utilisateur);
      default:
        logger.warn(`Type de condition inconnu: ${type}`);
        return false;
    }
  }

  /**
   * Verifie si une condition match et retourne les details
   * @returns {Object} { match: boolean, details: string }
   */
  async matchConditionAvecDetails(type, condition, utilisateur, context) {
    if (!condition) {
      return { match: false, details: 'Pas de condition definie' };
    }

    if (condition.type === 'autre' || condition.type === 'default') {
      return { match: true, details: 'Branche par defaut' };
    }

    switch (type) {
      case 'COMMUNE':
        return await this.matchCommuneAvecDetails(condition, utilisateur, context);
      case 'QF':
        return this.matchQFAvecDetails(condition, utilisateur);
      case 'AGE':
        return this.matchAgeAvecDetails(condition, utilisateur, context.dateCotisation);
      case 'FIDELITE':
        return await this.matchFideliteAvecDetails(condition, utilisateur);
      case 'MULTI_INSCRIPTIONS':
        return await this.matchMultiInscriptionsAvecDetails(condition, utilisateur, context);
      case 'TAG':
      case 'STATUT_SOCIAL':  // Retrocompatibilite
        return await this.matchTagAvecDetails(condition, utilisateur);
      default:
        return { match: false, details: `Type inconnu: ${type}` };
    }
  }

  /**
   * Match condition COMMUNE
   * Verifie si l'utilisateur habite dans une commune/communaute
   */
  async matchCommune(condition, utilisateur, context) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    const communeId = utilisateur.commune_id;
    if (!communeId) return false;

    // Match par communaute de communes
    // Supporte condition.id (nouveau format) ou condition.ids[0] (ancien format)
    const communauteId = condition.id || (condition.ids && condition.ids[0]);
    if (condition.type === 'communaute' && communauteId) {
      const membre = await CommunauteCommunesMembre.findOne({
        where: {
          communaute_id: communauteId,
          commune_id: communeId
        }
      });
      return !!membre;
    }

    // Match par liste de communes
    if (condition.type === 'communes' && condition.ids) {
      return condition.ids.includes(communeId);
    }

    // Match par commune specifique
    if (condition.commune_id) {
      return communeId === condition.commune_id;
    }

    return false;
  }

  /**
   * Match condition QF (Quotient Familial)
   */
  matchQF(condition, utilisateur) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    const qf = utilisateur.quotient_familial;
    if (qf === null || qf === undefined) return false;

    const borneMin = condition.borne_min !== undefined ? condition.borne_min : condition.min;
    const borneMax = condition.borne_max !== undefined ? condition.borne_max : condition.max;

    if (borneMin !== undefined && borneMax !== undefined) {
      return qf >= borneMin && qf <= borneMax;
    }
    if (borneMin !== undefined) {
      return qf >= borneMin;
    }
    if (borneMax !== undefined) {
      return qf <= borneMax;
    }

    return false;
  }

  /**
   * Match condition AGE
   */
  matchAge(condition, utilisateur, dateCotisation = new Date()) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    const dateNaissance = utilisateur.date_naissance;
    if (!dateNaissance) return false;

    const age = this.calculerAge(dateNaissance, dateCotisation);

    const { operateur, valeur, min, max } = condition;

    switch (operateur) {
      case '<':
        return age < valeur;
      case '<=':
        return age <= valeur;
      case '>':
        return age > valeur;
      case '>=':
        return age >= valeur;
      case '=':
      case '==':
        return age === valeur;
      case 'entre':
        return age >= min && age <= max;
      default:
        // Fallback: utiliser min/max si definis
        if (min !== undefined && max !== undefined) {
          return age >= min && age <= max;
        }
        if (min !== undefined) {
          return age >= min;
        }
        if (max !== undefined) {
          return age <= max;
        }
        return false;
    }
  }

  /**
   * Calcule l'age a une date donnee
   */
  calculerAge(dateNaissance, dateReference = new Date()) {
    const naissance = new Date(dateNaissance);
    const reference = new Date(dateReference);
    let age = reference.getFullYear() - naissance.getFullYear();
    const moisDiff = reference.getMonth() - naissance.getMonth();
    if (moisDiff < 0 || (moisDiff === 0 && reference.getDate() < naissance.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Match condition FIDELITE (anciennete)
   */
  async matchFidelite(condition, utilisateur) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    let anneesAnciennete;

    // En mode simulation, utiliser _anciennete fourni dans les donnees de test
    if (utilisateur._anciennete !== undefined) {
      anneesAnciennete = utilisateur._anciennete;
    } else {
      // Sinon, calculer l'anciennete via la premiere cotisation
      const premiereCotisation = await Cotisation.findOne({
        where: { utilisateur_id: utilisateur.id },
        order: [['date_debut', 'ASC']]
      });

      if (!premiereCotisation) return false;

      anneesAnciennete = Math.floor(
        (new Date() - new Date(premiereCotisation.date_debut)) / (365.25 * 24 * 60 * 60 * 1000)
      );
    }

    // Format frontend: { operateur: '>=', annees: 1 }
    if (condition.operateur && condition.annees !== undefined) {
      const annees = condition.annees;
      switch (condition.operateur) {
        case '>=': return anneesAnciennete >= annees;
        case '>': return anneesAnciennete > annees;
        case '=':
        case '==': return anneesAnciennete === annees;
        case '<=': return anneesAnciennete <= annees;
        case '<': return anneesAnciennete < annees;
        default: return anneesAnciennete >= annees;
      }
    }

    // Format ancien: { min, max }
    const min = condition.annees_min !== undefined ? condition.annees_min : condition.min;
    const max = condition.annees_max !== undefined ? condition.annees_max : condition.max;

    if (min !== undefined && max !== undefined) {
      return anneesAnciennete >= min && anneesAnciennete <= max;
    }
    if (min !== undefined) {
      return anneesAnciennete >= min;
    }
    if (max !== undefined) {
      return anneesAnciennete <= max;
    }

    return false;
  }

  /**
   * Match condition MULTI_INSCRIPTIONS
   */
  async matchMultiInscriptions(condition, utilisateur, context) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    let nbInscrits;

    // En mode simulation, utiliser _nb_inscrits fourni dans les donnees de test
    if (utilisateur._nb_inscrits !== undefined) {
      nbInscrits = utilisateur._nb_inscrits;
    } else {
      // Sinon, compter les inscriptions actives dans la meme famille
      const familleId = utilisateur.famille_id;
      if (!familleId) return false;

      nbInscrits = await Cotisation.count({
        include: [{
          model: Utilisateur,
          as: 'utilisateur',
          where: { famille_id: familleId }
        }],
        where: {
          statut: 'active',
          date_fin: { [Op.gte]: new Date() }
        }
      });
    }

    // Format frontend: { operateur: '>=', nombre: 2 }
    if (condition.operateur && condition.nombre !== undefined) {
      const nombre = condition.nombre;
      switch (condition.operateur) {
        case '>=': return nbInscrits >= nombre;
        case '>': return nbInscrits > nombre;
        case '=':
        case '==': return nbInscrits === nombre;
        case '<=': return nbInscrits <= nombre;
        case '<': return nbInscrits < nombre;
        default: return nbInscrits >= nombre;
      }
    }

    // Format ancien: { min, max }
    const min = condition.nb_inscrits_min !== undefined ? condition.nb_inscrits_min : condition.min;
    const max = condition.nb_inscrits_max !== undefined ? condition.nb_inscrits_max : condition.max;

    if (min !== undefined && max !== undefined) {
      return nbInscrits >= min && nbInscrits <= max;
    }
    if (min !== undefined) {
      return nbInscrits >= min;
    }

    return false;
  }

  /**
   * Match condition TAG
   * Verifie si l'utilisateur a (ou n'a pas) certains tags
   */
  async matchTag(condition, utilisateur) {
    if (condition.type === 'autre' || condition.type === 'default') {
      return true;
    }

    // Recuperer les tags de l'utilisateur
    let userTagIds = [];
    if (utilisateur._tags !== undefined) {
      // Mode simulation avec tags fournis
      userTagIds = utilisateur._tags || [];
    } else if (utilisateur.tags && Array.isArray(utilisateur.tags)) {
      userTagIds = utilisateur.tags.map(t => t.id || t);
    }

    const conditionTags = condition.tags || [];
    if (conditionTags.length === 0) {
      return false;
    }

    const mode = condition.mode || 'contient';

    if (mode === 'contient') {
      // L'utilisateur doit avoir au moins un des tags
      return conditionTags.some(tagId => userTagIds.includes(tagId));
    } else if (mode === 'ne_contient_pas') {
      // L'utilisateur ne doit avoir aucun des tags
      return !conditionTags.some(tagId => userTagIds.includes(tagId));
    }

    // Retrocompatibilite avec ancien format statuts
    if (condition.statuts && Array.isArray(condition.statuts)) {
      const statutUtilisateur = utilisateur.statut_social;
      if (!statutUtilisateur) return false;
      return condition.statuts.includes(statutUtilisateur);
    }

    return false;
  }

  // ============================================================
  // METHODES AVEC DETAILS (pour trace)
  // ============================================================

  async matchCommuneAvecDetails(condition, utilisateur, context) {
    const communeId = utilisateur.commune_id;
    if (!communeId) {
      return { match: false, details: `Commune non definie (commune_id: null)` };
    }

    // Match par communaute de communes
    // Supporte condition.id (nouveau format) ou condition.ids[0] (ancien format)
    const communauteId = condition.id || (condition.ids && condition.ids[0]);
    if (condition.type === 'communaute' && communauteId) {
      const membre = await CommunauteCommunesMembre.findOne({
        where: {
          communaute_id: communauteId,
          commune_id: communeId
        }
      });
      const match = !!membre;
      return {
        match,
        details: `Commune ${communeId} ${match ? 'fait partie' : 'ne fait pas partie'} de la communaute ${communauteId}`
      };
    }

    // Match par liste de communes
    if (condition.type === 'communes' && condition.ids) {
      const match = condition.ids.includes(communeId);
      return {
        match,
        details: `Commune ${communeId} ${match ? 'dans' : 'hors de'} la liste [${condition.ids.join(', ')}]`
      };
    }

    // Match par commune specifique
    if (condition.commune_id) {
      const match = communeId === condition.commune_id;
      return {
        match,
        details: `Commune ${communeId} ${match ? '=' : '!='} ${condition.commune_id}`
      };
    }

    return { match: false, details: 'Condition commune invalide' };
  }

  matchQFAvecDetails(condition, utilisateur) {
    const qf = utilisateur.quotient_familial;
    if (qf === null || qf === undefined) {
      return { match: false, details: `QF non defini (quotient_familial: null)` };
    }

    const borneMin = condition.borne_min !== undefined ? condition.borne_min : condition.min;
    const borneMax = condition.borne_max !== undefined ? condition.borne_max : condition.max;

    let match = false;
    let conditionStr = '';

    if (borneMin !== undefined && borneMax !== undefined) {
      match = qf >= borneMin && qf <= borneMax;
      conditionStr = `${borneMin} <= QF <= ${borneMax}`;
    } else if (borneMin !== undefined) {
      match = qf >= borneMin;
      conditionStr = `QF >= ${borneMin}`;
    } else if (borneMax !== undefined) {
      match = qf <= borneMax;
      conditionStr = `QF <= ${borneMax}`;
    }

    return {
      match,
      details: `QF=${qf}, condition: ${conditionStr} => ${match ? 'OK' : 'NON'}`
    };
  }

  matchAgeAvecDetails(condition, utilisateur, dateCotisation = new Date()) {
    const dateNaissance = utilisateur.date_naissance;
    if (!dateNaissance) {
      return { match: false, details: `Date de naissance non definie` };
    }

    const age = this.calculerAge(dateNaissance, dateCotisation);
    const { operateur, valeur, min, max } = condition;

    let match = false;
    let conditionStr = '';

    switch (operateur) {
      case '<':
        match = age < valeur;
        conditionStr = `age < ${valeur}`;
        break;
      case '<=':
        match = age <= valeur;
        conditionStr = `age <= ${valeur}`;
        break;
      case '>':
        match = age > valeur;
        conditionStr = `age > ${valeur}`;
        break;
      case '>=':
        match = age >= valeur;
        conditionStr = `age >= ${valeur}`;
        break;
      case '=':
      case '==':
        match = age === valeur;
        conditionStr = `age = ${valeur}`;
        break;
      case 'entre':
        match = age >= min && age <= max;
        conditionStr = `${min} <= age <= ${max}`;
        break;
      default:
        if (min !== undefined && max !== undefined) {
          match = age >= min && age <= max;
          conditionStr = `${min} <= age <= ${max}`;
        } else if (min !== undefined) {
          match = age >= min;
          conditionStr = `age >= ${min}`;
        } else if (max !== undefined) {
          match = age <= max;
          conditionStr = `age <= ${max}`;
        }
    }

    return {
      match,
      details: `Age=${age} ans, condition: ${conditionStr} => ${match ? 'OK' : 'NON'}`
    };
  }

  async matchFideliteAvecDetails(condition, utilisateur) {
    let anneesAnciennete;

    // En mode simulation, utiliser _anciennete fourni dans les donnees de test
    if (utilisateur._anciennete !== undefined) {
      anneesAnciennete = utilisateur._anciennete;
    } else {
      if (!utilisateur.id) {
        return { match: false, details: `ID utilisateur non defini (simulation)` };
      }

      const premiereCotisation = await Cotisation.findOne({
        where: { utilisateur_id: utilisateur.id },
        order: [['date_debut', 'ASC']]
      });

      if (!premiereCotisation) {
        return { match: false, details: `Aucune cotisation trouvee` };
      }

      anneesAnciennete = Math.floor(
        (new Date() - new Date(premiereCotisation.date_debut)) / (365.25 * 24 * 60 * 60 * 1000)
      );
    }

    let match = false;
    let conditionStr = '';

    // Format frontend: { operateur: '>=', annees: 1 }
    if (condition.operateur && condition.annees !== undefined) {
      const annees = condition.annees;
      switch (condition.operateur) {
        case '>=':
          match = anneesAnciennete >= annees;
          conditionStr = `anciennete >= ${annees}`;
          break;
        case '>':
          match = anneesAnciennete > annees;
          conditionStr = `anciennete > ${annees}`;
          break;
        case '=':
        case '==':
          match = anneesAnciennete === annees;
          conditionStr = `anciennete = ${annees}`;
          break;
        case '<=':
          match = anneesAnciennete <= annees;
          conditionStr = `anciennete <= ${annees}`;
          break;
        case '<':
          match = anneesAnciennete < annees;
          conditionStr = `anciennete < ${annees}`;
          break;
        default:
          match = anneesAnciennete >= annees;
          conditionStr = `anciennete >= ${annees}`;
      }
    } else {
      // Format ancien: { min, max }
      const min = condition.annees_min !== undefined ? condition.annees_min : condition.min;
      const max = condition.annees_max !== undefined ? condition.annees_max : condition.max;

      if (min !== undefined && max !== undefined) {
        match = anneesAnciennete >= min && anneesAnciennete <= max;
        conditionStr = `${min} <= anciennete <= ${max}`;
      } else if (min !== undefined) {
        match = anneesAnciennete >= min;
        conditionStr = `anciennete >= ${min}`;
      } else if (max !== undefined) {
        match = anneesAnciennete <= max;
        conditionStr = `anciennete <= ${max}`;
      }
    }

    return {
      match,
      details: `Anciennete=${anneesAnciennete} ans, condition: ${conditionStr} => ${match ? 'OK' : 'NON'}`
    };
  }

  async matchMultiInscriptionsAvecDetails(condition, utilisateur, context) {
    let nbInscrits;

    // En mode simulation, utiliser _nb_inscrits fourni dans les donnees de test
    if (utilisateur._nb_inscrits !== undefined) {
      nbInscrits = utilisateur._nb_inscrits;
    } else {
      // Sinon, compter les inscriptions reelles via la famille
      const familleId = utilisateur.famille_id;
      if (!familleId) {
        return { match: false, details: `Pas de famille definie (famille_id: null)` };
      }

      nbInscrits = await Cotisation.count({
        include: [{
          model: Utilisateur,
          as: 'utilisateur',
          where: { famille_id: familleId }
        }],
        where: {
          statut: 'active',
          date_fin: { [Op.gte]: new Date() }
        }
      });
    }

    let match = false;
    let conditionStr = '';

    // Format frontend: { operateur: '>=', nombre: 2 }
    if (condition.operateur && condition.nombre !== undefined) {
      const nombre = condition.nombre;
      switch (condition.operateur) {
        case '>=':
          match = nbInscrits >= nombre;
          conditionStr = `nb_inscrits >= ${nombre}`;
          break;
        case '>':
          match = nbInscrits > nombre;
          conditionStr = `nb_inscrits > ${nombre}`;
          break;
        case '=':
        case '==':
          match = nbInscrits === nombre;
          conditionStr = `nb_inscrits = ${nombre}`;
          break;
        case '<=':
          match = nbInscrits <= nombre;
          conditionStr = `nb_inscrits <= ${nombre}`;
          break;
        case '<':
          match = nbInscrits < nombre;
          conditionStr = `nb_inscrits < ${nombre}`;
          break;
        default:
          match = nbInscrits >= nombre;
          conditionStr = `nb_inscrits >= ${nombre}`;
      }
    } else {
      // Format ancien: { min, max } ou { nb_inscrits_min, nb_inscrits_max }
      const min = condition.nb_inscrits_min !== undefined ? condition.nb_inscrits_min : condition.min;
      const max = condition.nb_inscrits_max !== undefined ? condition.nb_inscrits_max : condition.max;

      if (min !== undefined && max !== undefined) {
        match = nbInscrits >= min && nbInscrits <= max;
        conditionStr = `${min} <= nb_inscrits <= ${max}`;
      } else if (min !== undefined) {
        match = nbInscrits >= min;
        conditionStr = `nb_inscrits >= ${min}`;
      }
    }

    return {
      match,
      details: `Nb inscrits famille=${nbInscrits}, condition: ${conditionStr} => ${match ? 'OK' : 'NON'}`
    };
  }

  async matchTagAvecDetails(condition, utilisateur) {
    // Recuperer les tags de l'utilisateur
    let userTagIds = [];
    let userTagNames = [];

    if (utilisateur._tags !== undefined) {
      // Mode simulation avec tags fournis
      userTagIds = utilisateur._tags || [];
      // Charger les noms des tags pour le debug
      if (userTagIds.length > 0) {
        const tags = await TagUtilisateur.findAll({ where: { id: userTagIds } });
        userTagNames = tags.map(t => t.libelle);
      }
    } else if (utilisateur.tags && Array.isArray(utilisateur.tags)) {
      userTagIds = utilisateur.tags.map(t => t.id || t);
      userTagNames = utilisateur.tags.map(t => t.libelle || t.code || t);
    }

    const conditionTags = condition.tags || [];
    if (conditionTags.length === 0 && condition.type !== 'autre' && condition.type !== 'default') {
      // Retrocompatibilite avec ancien format
      if (condition.statuts && Array.isArray(condition.statuts)) {
        const statutUtilisateur = utilisateur.statut_social;
        if (!statutUtilisateur) {
          return { match: false, details: `Statut social non defini` };
        }
        const match = condition.statuts.includes(statutUtilisateur);
        return {
          match,
          details: `Statut "${statutUtilisateur}" ${match ? 'dans' : 'hors de'} [${condition.statuts.join(', ')}]`
        };
      }
      return { match: false, details: 'Aucun tag a verifier' };
    }

    // Charger les noms des tags de la condition
    let conditionTagNames = [];
    if (conditionTags.length > 0) {
      const tags = await TagUtilisateur.findAll({ where: { id: conditionTags } });
      conditionTagNames = tags.map(t => t.libelle);
    }

    const mode = condition.mode || 'contient';
    let match = false;

    if (mode === 'contient') {
      match = conditionTags.some(tagId => userTagIds.includes(tagId));
    } else if (mode === 'ne_contient_pas') {
      match = !conditionTags.some(tagId => userTagIds.includes(tagId));
    }

    const modeLabel = mode === 'contient' ? 'contient' : 'ne contient pas';
    const userTagsStr = userTagNames.length > 0 ? userTagNames.join(', ') : 'aucun';
    const condTagsStr = conditionTagNames.join(', ') || 'aucun';

    return {
      match,
      details: `Tags utilisateur: [${userTagsStr}], condition: ${modeLabel} [${condTagsStr}] => ${match ? 'OK' : 'NON'}`
    };
  }

  // ============================================================
  // GESTION DES ARBRES
  // ============================================================

  /**
   * Recupere l'arbre d'un tarif
   */
  async getArbreByTarif(tarifCotisationId, options = {}) {
    const arbre = await ArbreDecision.findOne({
      where: { tarif_cotisation_id: tarifCotisationId },
      include: options.include || []
    });

    if (arbre) {
      // Ajouter les infos des types de condition
      const typesCondition = await TypeConditionTarif.findAll({
        where: { actif: true },
        order: [['ordre_affichage', 'ASC']]
      });
      arbre.dataValues.typesConditionDisponibles = typesCondition;
    }

    return arbre;
  }

  /**
   * Cree un nouvel arbre pour un tarif
   */
  async creerArbre(tarifCotisationId, data, structureId = null) {
    const existant = await ArbreDecision.findOne({
      where: { tarif_cotisation_id: tarifCotisationId }
    });

    if (existant) {
      throw new Error('Un arbre existe deja pour ce tarif');
    }

    const arbre = await ArbreDecision.create({
      tarif_cotisation_id: tarifCotisationId,
      mode_affichage: data.mode_affichage || 'minimum',
      arbre_json: data.arbre_json || { version: 1, noeuds: [] },
      version: 1,
      verrouille: false,
      structure_id: structureId
    });

    return arbre;
  }

  /**
   * Modifie un arbre (si non verrouille)
   */
  async modifierArbre(arbreId, data) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    if (!arbre) {
      throw new Error('Arbre non trouve');
    }

    if (arbre.verrouille) {
      throw new Error('Cet arbre est verrouille et ne peut plus etre modifie');
    }

    // Incrementer la version si l'arbre JSON change
    const arbreJsonChanged = JSON.stringify(data.arbre_json) !== JSON.stringify(arbre.arbre_json);

    await arbre.update({
      mode_affichage: data.mode_affichage || arbre.mode_affichage,
      arbre_json: data.arbre_json || arbre.arbre_json,
      version: arbreJsonChanged ? arbre.version + 1 : arbre.version
    });

    return arbre;
  }

  /**
   * Verrouille un arbre (appele quand une cotisation est creee)
   */
  async verrouillerArbre(arbreId) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    if (!arbre) {
      throw new Error('Arbre non trouve');
    }

    if (!arbre.verrouille) {
      await arbre.update({
        verrouille: true,
        date_verrouillage: new Date()
      });
    }

    return arbre;
  }

  /**
   * Verifie si l'arbre est modifiable
   */
  async estModifiable(arbreId) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    return arbre ? !arbre.verrouille : false;
  }

  /**
   * Duplique un arbre (pour creer une nouvelle version)
   */
  async dupliquerArbre(arbreId) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    if (!arbre) {
      throw new Error('Arbre non trouve');
    }

    // On ne peut pas dupliquer, on cree un nouvel arbre non verrouille
    // L'ancien arbre verrouille reste en place pour les cotisations existantes
    const arbreJson = arbre.arbre_json;
    arbreJson.version = arbre.version + 1;

    // Pour un "duplicata", on remet l'arbre a jour (ecrase si non verrouille)
    if (arbre.verrouille) {
      // Si verrouille, on modifie l'arbre en place (deverrouillage implicite)
      await arbre.update({
        arbre_json: arbreJson,
        version: arbre.version + 1,
        verrouille: false,
        date_verrouillage: null
      });
    }

    return arbre;
  }

  /**
   * Calcule les bornes min/max du tarif
   */
  async calculerBornesTarif(arbreId, montantBase) {
    const arbre = await ArbreDecision.findByPk(arbreId);
    if (!arbre) {
      return { min: montantBase, max: montantBase };
    }
    return arbre.calculerBornes(montantBase);
  }

  // ============================================================
  // TYPES DE CONDITION
  // ============================================================

  /**
   * Recupere tous les types de condition actifs
   */
  async getTypesCondition() {
    return await TypeConditionTarif.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  }

  /**
   * Recupere tous les tags disponibles pour les conditions
   */
  async getTagsDisponibles(structureId = null) {
    return await TagUtilisateur.getActifs(structureId);
  }

  // ============================================================
  // OPERATIONS COMPTABLES
  // ============================================================

  /**
   * Recupere toutes les operations comptables actives
   */
  async getOperationsComptables(structureId = null) {
    const where = { actif: true };
    if (structureId) {
      where[Op.or] = [
        { structure_id: null },
        { structure_id: structureId }
      ];
    }

    return await OperationComptableReduction.findAll({
      where,
      order: [['libelle', 'ASC']]
    });
  }

  /**
   * Cree une operation comptable
   */
  async creerOperationComptable(data) {
    return await OperationComptableReduction.create({
      code: data.code,
      libelle: data.libelle,
      description: data.description,
      compte_comptable: data.compte_comptable,
      journal_code: data.journal_code || 'VT',
      section_analytique_id: data.section_analytique_id,
      structure_id: data.structure_id,
      actif: true
    });
  }

  // ============================================================
  // EXPORT COMPTABLE DES REDUCTIONS
  // ============================================================

  /**
   * Exporte les reductions par operation comptable
   */
  async exportReductionsParOperation(dateDebut, dateFin, structureId = null) {
    const whereClause = {};

    const cotisationWhere = {
      date_paiement: {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      }
    };
    if (structureId) {
      cotisationWhere.structure_id = structureId;
    }

    const reductions = await CotisationReduction.findAll({
      include: [
        {
          model: Cotisation,
          as: 'cotisation',
          where: cotisationWhere,
          required: true
        },
        {
          model: OperationComptableReduction,
          as: 'operationComptable',
          required: false
        }
      ],
      attributes: [
        'type_source',
        'operation_id',
        [sequelize.fn('SUM', sequelize.col('montant_reduction')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('CotisationReduction.id')), 'count']
      ],
      group: ['type_source', 'operation_id', 'operationComptable.id'],
      raw: true,
      nest: true
    });

    return reductions;
  }

  /**
   * Enregistre les reductions d'une cotisation
   */
  async enregistrerReductions(cotisationId, reductions) {
    const created = [];

    for (const reduction of reductions) {
      const record = await CotisationReduction.create({
        cotisation_id: cotisationId,
        operation_id: reduction.operation_id,
        type_source: reduction.type_source,
        branche_code: reduction.branche_code,
        branche_libelle: reduction.branche_libelle,
        libelle: reduction.branche_libelle || reduction.type_source,
        type_calcul: reduction.type_calcul || 'fixe',
        valeur: reduction.valeur,
        montant_reduction: reduction.montant_reduction,
        ordre_application: created.length + 1
      });
      created.push(record);
    }

    return created;
  }
}

module.exports = new ArbreDecisionService();
