/**
 * Modèle HistoriqueQuotientFamilial
 * Historique des quotients familiaux pour chaque utilisateur
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HistoriqueQuotientFamilial = sequelize.define('HistoriqueQuotientFamilial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Utilisateur concerné'
    },
    quotient_familial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Valeur du quotient familial'
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de début de validité'
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin (NULL = en cours)'
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'manuel',
      comment: 'Source: manuel, caf, import, heritage'
    },
    justificatif: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chemin vers le fichier justificatif'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes ou commentaires'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Utilisateur ayant saisi cette entrée'
    }
  }, {
    tableName: 'historique_quotient_familial',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Récupère le QF actif pour un utilisateur à une date donnée
   * @param {number} utilisateurId - ID de l'utilisateur
   * @param {Date|string} date - Date de référence (défaut: aujourd'hui)
   * @returns {HistoriqueQuotientFamilial|null}
   */
  HistoriqueQuotientFamilial.getQFAtDate = async function(utilisateurId, date = new Date()) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    return await this.findOne({
      where: {
        utilisateur_id: utilisateurId,
        date_debut: { [sequelize.Sequelize.Op.lte]: dateStr },
        [sequelize.Sequelize.Op.or]: [
          { date_fin: null },
          { date_fin: { [sequelize.Sequelize.Op.gte]: dateStr } }
        ]
      },
      order: [['date_debut', 'DESC']]
    });
  };

  /**
   * Récupère le QF actuel (sans date de fin) pour un utilisateur
   * @param {number} utilisateurId - ID de l'utilisateur
   * @returns {HistoriqueQuotientFamilial|null}
   */
  HistoriqueQuotientFamilial.getCurrentQF = async function(utilisateurId) {
    return await this.findOne({
      where: {
        utilisateur_id: utilisateurId,
        date_fin: null
      },
      order: [['date_debut', 'DESC']]
    });
  };

  /**
   * Ajoute un nouveau QF pour un utilisateur (ferme automatiquement l'ancien)
   * @param {Object} data - Données du nouveau QF
   * @param {number} data.utilisateur_id - ID de l'utilisateur
   * @param {number} data.quotient_familial - Valeur du QF
   * @param {Date|string} data.date_debut - Date de début (défaut: aujourd'hui)
   * @param {string} data.source - Source (manuel, caf, import, heritage)
   * @param {string} data.justificatif - Chemin fichier justificatif
   * @param {string} data.notes - Notes
   * @param {number} data.created_by - ID de l'utilisateur qui crée
   * @param {Object} options - Options Sequelize (transaction, etc.)
   * @returns {HistoriqueQuotientFamilial}
   */
  HistoriqueQuotientFamilial.addNewQF = async function(data, options = {}) {
    const dateDebut = data.date_debut || new Date().toISOString().split('T')[0];

    // Fermer le QF précédent
    const currentQF = await this.getCurrentQF(data.utilisateur_id);
    if (currentQF) {
      // Date fin = veille de la nouvelle date début
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateFin.getDate() - 1);
      await currentQF.update({
        date_fin: dateFin.toISOString().split('T')[0]
      }, options);
    }

    // Créer le nouveau QF
    const newQF = await this.create({
      utilisateur_id: data.utilisateur_id,
      quotient_familial: data.quotient_familial,
      date_debut: dateDebut,
      date_fin: null,
      source: data.source || 'manuel',
      justificatif: data.justificatif || null,
      notes: data.notes || null,
      created_by: data.created_by || null
    }, options);

    // Mettre à jour le cache sur l'utilisateur
    const { Utilisateur } = sequelize.models;
    if (Utilisateur) {
      await Utilisateur.update(
        { quotient_familial: data.quotient_familial },
        { where: { id: data.utilisateur_id }, ...options }
      );
    }

    return newQF;
  };

  /**
   * Récupère l'historique complet d'un utilisateur
   * @param {number} utilisateurId - ID de l'utilisateur
   * @returns {HistoriqueQuotientFamilial[]}
   */
  HistoriqueQuotientFamilial.getHistorique = async function(utilisateurId) {
    return await this.findAll({
      where: { utilisateur_id: utilisateurId },
      order: [['date_debut', 'DESC']],
      include: [{
        model: sequelize.models.Utilisateur,
        as: 'createur',
        attributes: ['id', 'nom', 'prenom']
      }]
    });
  };

  return HistoriqueQuotientFamilial;
};
