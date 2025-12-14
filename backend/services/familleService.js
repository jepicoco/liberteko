/**
 * Service de gestion des relations familiales
 * Permet de lier des utilisateurs en famille (parent/tuteur - enfant)
 */

const { Utilisateur, TarifCotisation, sequelize } = require('../models');
const logger = require('../utils/logger');

class FamilleService {

  /**
   * Lier un enfant a un parent/tuteur
   * @param {number} enfantId - ID de l'utilisateur enfant
   * @param {number} parentId - ID de l'utilisateur parent/tuteur
   * @param {string} typeLien - Type de lien: 'parent', 'tuteur', 'autre'
   * @returns {Promise<Object>} - L'utilisateur enfant mis a jour
   */
  async lierEnfant(enfantId, parentId, typeLien = 'parent') {
    const transaction = await sequelize.transaction();

    try {
      const enfant = await Utilisateur.findByPk(enfantId, { transaction });
      const parent = await Utilisateur.findByPk(parentId, { transaction });

      if (!enfant) {
        throw new Error('Utilisateur enfant non trouve');
      }

      if (!parent) {
        throw new Error('Utilisateur parent non trouve');
      }

      // Verifier que le parent n'est pas lui-meme un enfant
      if (parent.est_compte_enfant) {
        throw new Error('Un compte enfant ne peut pas etre designe comme parent');
      }

      // Verifier qu'on ne cree pas une boucle
      if (enfantId === parentId) {
        throw new Error('Un utilisateur ne peut pas etre son propre parent');
      }

      // Verifier que l'enfant n'est pas deja un parent d'autres utilisateurs
      const enfantsExistants = await Utilisateur.count({
        where: { utilisateur_parent_id: enfantId },
        transaction
      });

      if (enfantsExistants > 0) {
        throw new Error('Cet utilisateur est deja parent d\'autres membres, il ne peut pas devenir enfant');
      }

      // Effectuer la liaison
      await enfant.update({
        utilisateur_parent_id: parentId,
        type_lien_famille: typeLien,
        date_lien_famille: new Date(),
        est_compte_enfant: true
      }, { transaction, hooks: false });

      await transaction.commit();

      logger.info(`Lien familial cree: ${enfant.prenom} ${enfant.nom} -> ${parent.prenom} ${parent.nom} (${typeLien})`);

      // Recharger avec les associations
      return await Utilisateur.findByPk(enfantId, {
        include: [{ model: Utilisateur, as: 'parent', attributes: ['id', 'nom', 'prenom', 'email'] }]
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Erreur lors de la liaison familiale:', error);
      throw error;
    }
  }

  /**
   * Delier un enfant de son parent
   * @param {number} enfantId - ID de l'utilisateur enfant
   * @returns {Promise<Object>} - L'utilisateur enfant mis a jour
   */
  async delierEnfant(enfantId) {
    const enfant = await Utilisateur.findByPk(enfantId);

    if (!enfant) {
      throw new Error('Utilisateur non trouve');
    }

    if (!enfant.utilisateur_parent_id) {
      throw new Error('Cet utilisateur n\'a pas de parent associe');
    }

    await enfant.update({
      utilisateur_parent_id: null,
      type_lien_famille: null,
      date_lien_famille: null,
      est_compte_enfant: false
    }, { hooks: false });

    logger.info(`Lien familial supprime pour ${enfant.prenom} ${enfant.nom}`);

    return enfant;
  }

  /**
   * Recuperer les enfants d'un parent
   * @param {number} parentId - ID du parent
   * @returns {Promise<Array>} - Liste des enfants
   */
  async getEnfants(parentId) {
    return await Utilisateur.findAll({
      where: { utilisateur_parent_id: parentId },
      attributes: ['id', 'nom', 'prenom', 'email', 'date_naissance', 'type_lien_famille', 'date_lien_famille', 'statut', 'code_barre'],
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
  }

  /**
   * Recuperer la famille complete d'un utilisateur
   * Si c'est un enfant, remonte au parent puis recupere tous les membres
   * @param {number} utilisateurId - ID de l'utilisateur
   * @returns {Promise<Object>} - { responsable, enfants, estEnfant }
   */
  async getFamille(utilisateurId) {
    const utilisateur = await Utilisateur.findByPk(utilisateurId, {
      include: [
        {
          model: Utilisateur,
          as: 'parent',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'code_barre']
        },
        {
          model: Utilisateur,
          as: 'enfants',
          attributes: ['id', 'nom', 'prenom', 'email', 'date_naissance', 'type_lien_famille', 'date_lien_famille', 'statut', 'code_barre']
        }
      ]
    });

    if (!utilisateur) {
      throw new Error('Utilisateur non trouve');
    }

    // Si c'est un enfant, remonter au parent
    if (utilisateur.utilisateur_parent_id) {
      const parent = await Utilisateur.findByPk(utilisateur.utilisateur_parent_id, {
        include: [{
          model: Utilisateur,
          as: 'enfants',
          attributes: ['id', 'nom', 'prenom', 'email', 'date_naissance', 'type_lien_famille', 'date_lien_famille', 'statut', 'code_barre']
        }]
      });

      return {
        responsable: {
          id: parent.id,
          nom: parent.nom,
          prenom: parent.prenom,
          email: parent.email,
          telephone: parent.telephone,
          code_barre: parent.code_barre
        },
        enfants: parent.enfants || [],
        estEnfant: true,
        lienAvecParent: utilisateur.type_lien_famille
      };
    }

    // C'est un parent (ou utilisateur sans famille)
    return {
      responsable: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        code_barre: utilisateur.code_barre
      },
      enfants: utilisateur.enfants || [],
      estEnfant: false,
      lienAvecParent: null
    };
  }

  /**
   * Verifier si un utilisateur a une famille
   * @param {number} utilisateurId - ID de l'utilisateur
   * @returns {Promise<boolean>}
   */
  async aUneFamille(utilisateurId) {
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      return false;
    }

    // Est un enfant
    if (utilisateur.utilisateur_parent_id) {
      return true;
    }

    // Est un parent
    const nbEnfants = await Utilisateur.count({
      where: { utilisateur_parent_id: utilisateurId }
    });

    return nbEnfants > 0;
  }

  /**
   * Compter le nombre de membres dans une famille
   * @param {number} utilisateurId - ID d'un membre de la famille
   * @returns {Promise<number>} - Nombre total de membres (parent + enfants)
   */
  async compterMembresFamille(utilisateurId) {
    const famille = await this.getFamille(utilisateurId);
    return 1 + (famille.enfants?.length || 0); // 1 parent + enfants
  }

  /**
   * Recuperer le tarif famille applicable
   * @returns {Promise<Object|null>} - Le tarif famille ou null
   */
  async getTarifFamille() {
    return await TarifCotisation.findOne({
      where: {
        actif: true,
        nom: { [require('sequelize').Op.like]: '%famille%' }
      }
    });
  }

  /**
   * Calculer le cout pour une famille
   * Compare cotisation individuelle vs cotisation famille
   * @param {number} parentId - ID du parent
   * @returns {Promise<Object>} - { nombreMembres, coutIndividuel, coutFamille, economie }
   */
  async calculerCoutFamille(parentId) {
    const famille = await this.getFamille(parentId);
    const nombreMembres = 1 + (famille.enfants?.length || 0);

    // Recuperer le tarif famille
    const tarifFamille = await this.getTarifFamille();

    // Recuperer un tarif individuel de reference
    const tarifIndividuel = await TarifCotisation.findOne({
      where: {
        actif: true,
        nom: { [require('sequelize').Op.like]: '%annuel%' },
        nom: { [require('sequelize').Op.notLike]: '%famille%' }
      },
      order: [['montant', 'ASC']]
    });

    const coutIndividuel = tarifIndividuel ? parseFloat(tarifIndividuel.montant) * nombreMembres : 0;
    const coutFamille = tarifFamille ? parseFloat(tarifFamille.montant) : coutIndividuel;
    const economie = coutIndividuel - coutFamille;

    return {
      nombreMembres,
      coutIndividuel,
      coutFamille,
      economie: economie > 0 ? economie : 0,
      tarifFamilleDisponible: !!tarifFamille,
      tarifFamille: tarifFamille ? {
        id: tarifFamille.id,
        nom: tarifFamille.nom,
        montant: parseFloat(tarifFamille.montant)
      } : null
    };
  }

  /**
   * Rechercher des utilisateurs disponibles pour liaison
   * Exclut les utilisateurs deja enfants et l'utilisateur lui-meme
   * @param {string} query - Terme de recherche
   * @param {number} excludeId - ID a exclure (l'utilisateur courant)
   * @param {number} limit - Nombre max de resultats
   * @returns {Promise<Array>}
   */
  async rechercherUtilisateursDisponibles(query, excludeId = null, limit = 10) {
    const { Op } = require('sequelize');

    const where = {
      est_compte_enfant: false, // Exclure les enfants existants
      statut: 'actif'
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    if (query && query.length >= 2) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${query}%` } },
        { prenom: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { code_barre: { [Op.like]: `%${query}%` } }
      ];
    }

    return await Utilisateur.findAll({
      where,
      attributes: ['id', 'nom', 'prenom', 'email', 'date_naissance', 'code_barre'],
      limit,
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
  }

  /**
   * Transferer la responsabilite d'un enfant a un autre parent
   * @param {number} enfantId - ID de l'enfant
   * @param {number} nouveauParentId - ID du nouveau parent
   * @param {string} typeLien - Type de lien
   * @returns {Promise<Object>}
   */
  async transfererResponsabilite(enfantId, nouveauParentId, typeLien = 'parent') {
    // Delier d'abord
    await this.delierEnfant(enfantId);
    // Puis relier au nouveau parent
    return await this.lierEnfant(enfantId, nouveauParentId, typeLien);
  }
}

module.exports = new FamilleService();
