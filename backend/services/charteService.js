/**
 * Service de gestion des chartes usager
 * CRUD, versioning, activation et duplication
 */

const { CharteUsager } = require('../models');

const charteService = {
  /**
   * Recupere la charte active
   * @returns {Promise<CharteUsager|null>}
   */
  async getCharteActive() {
    return await CharteUsager.getActive();
  },

  /**
   * Recupere toutes les chartes
   * @param {Object} options - Options de pagination et tri
   * @returns {Promise<{rows: CharteUsager[], count: number}>}
   */
  async getAllChartes(options = {}) {
    const {
      page = 1,
      limit = 20,
      order = [['id', 'DESC']]
    } = options;

    const offset = (page - 1) * limit;

    return await CharteUsager.findAndCountAll({
      order,
      limit,
      offset
    });
  },

  /**
   * Recupere une charte par son ID
   * @param {number} id
   * @returns {Promise<CharteUsager|null>}
   */
  async getCharteById(id) {
    return await CharteUsager.findByPk(id);
  },

  /**
   * Cree une nouvelle charte
   * @param {Object} data - Donnees de la charte
   * @returns {Promise<CharteUsager>}
   */
  async createCharte(data) {
    const { titre, contenu, date_publication } = data;

    // Generer la prochaine version disponible
    const version = await CharteUsager.genererProchaineVersion();

    return await CharteUsager.create({
      version,
      titre,
      contenu,
      date_publication: date_publication || new Date(),
      est_active: false,
      est_verrouillee: false,
      nb_signatures: 0
    });
  },

  /**
   * Met a jour une charte existante
   * Refuse si la charte est verrouillee
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<{success: boolean, charte?: CharteUsager, error?: string}>}
   */
  async updateCharte(id, data) {
    const charte = await CharteUsager.findByPk(id);

    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    if (charte.est_verrouillee) {
      return {
        success: false,
        error: 'Cette charte est verrouillee car elle a deja ete signee. Dupliquez-la pour creer une nouvelle version.'
      };
    }

    const { titre, contenu, date_publication } = data;

    if (titre) charte.titre = titre;
    if (contenu) charte.contenu = contenu;
    if (date_publication) charte.date_publication = date_publication;

    await charte.save();
    return { success: true, charte };
  },

  /**
   * Supprime une charte
   * Refuse si la charte est verrouillee ou si c'est la charte active avec des signatures
   * @param {number} id
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteCharte(id) {
    const charte = await CharteUsager.findByPk(id);

    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    if (charte.est_verrouillee) {
      return {
        success: false,
        error: 'Cette charte est verrouillee et ne peut pas etre supprimee'
      };
    }

    // Autoriser la suppression d'une charte active si elle n'a pas de signatures
    if (charte.est_active && charte.nb_signatures > 0) {
      return {
        success: false,
        error: 'Impossible de supprimer la charte active car elle a des signatures. Activez une autre charte d\'abord.'
      };
    }

    await charte.destroy();
    return { success: true };
  },

  /**
   * Active une charte (desactive les autres)
   * @param {number} id
   * @returns {Promise<{success: boolean, charte?: CharteUsager, error?: string}>}
   */
  async activerCharte(id) {
    const charte = await CharteUsager.findByPk(id);

    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    await charte.activer();
    return { success: true, charte };
  },

  /**
   * Duplique une charte pour creer une nouvelle version
   * @param {number} id
   * @returns {Promise<{success: boolean, charte?: CharteUsager, error?: string}>}
   */
  async dupliquerCharte(id) {
    const charte = await CharteUsager.findByPk(id);

    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    const copie = await charte.dupliquer();
    return { success: true, charte: copie };
  },

  /**
   * Recupere les statistiques d'une charte
   * @param {number} id
   * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
   */
  async getCharteStats(id) {
    const charte = await CharteUsager.findByPk(id);

    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    // Compter les validations par statut
    const { ValidationCharte } = require('../models');
    const { Op } = require('sequelize');

    const validations = await ValidationCharte.findAll({
      where: { charte_id: id },
      attributes: ['statut']
    });

    const stats = {
      total: validations.length,
      en_attente: 0,
      lue: 0,
      otp_envoye: 0,
      validee: 0,
      expiree: 0
    };

    validations.forEach(v => {
      if (stats[v.statut] !== undefined) {
        stats[v.statut]++;
      }
    });

    return {
      success: true,
      stats: {
        ...stats,
        nb_signatures: charte.nb_signatures,
        est_verrouillee: charte.est_verrouillee,
        est_active: charte.est_active
      }
    };
  }
};

module.exports = charteService;
