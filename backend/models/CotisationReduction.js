/**
 * Modèle CotisationReduction
 * Réductions appliquées à une cotisation
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CotisationReduction = sequelize.define('CotisationReduction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Cotisation concernée'
    },
    regle_reduction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Règle de réduction appliquée (null si manuelle)'
    },
    type_source: {
      type: DataTypes.ENUM(
        'commune', 'quotient_familial', 'statut_social', 'multi_enfants',
        'fidelite', 'partenariat', 'handicap', 'age', 'manuel', 'code_reduction'
      ),
      allowNull: false,
      comment: 'Source de la réduction'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé affiché'
    },
    type_calcul: {
      type: DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      comment: 'Type de calcul'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valeur de la réduction (montant ou pourcentage)'
    },
    montant_reduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant effectif de la réduction en euros'
    },
    ordre_application: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre dans lequel la réduction a été appliquée'
    },
    base_calcul: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Montant sur lequel la réduction a été calculée'
    },
    contexte_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Données contextuelles (QF utilisé, commune, etc.)'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Section analytique pour la réduction'
    },
    regroupement_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Regroupement analytique pour la réduction'
    }
  }, {
    tableName: 'cotisation_reductions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Crée une réduction à partir d'une règle
   * @param {Object} cotisation - Cotisation concernée
   * @param {Object} regle - Règle de réduction
   * @param {number} baseCalcul - Montant de base pour le calcul
   * @param {number} ordre - Ordre d'application
   * @param {Object} contexte - Données contextuelles
   * @returns {CotisationReduction}
   */
  CotisationReduction.createFromRegle = async function(cotisation, regle, baseCalcul, ordre, contexte = {}) {
    const montantReduction = regle.calculerMontant(baseCalcul);

    return await this.create({
      cotisation_id: cotisation.id,
      regle_reduction_id: regle.id,
      type_source: regle.type_source,
      libelle: regle.libelle,
      type_calcul: regle.type_calcul,
      valeur: regle.valeur,
      montant_reduction: montantReduction,
      ordre_application: ordre,
      base_calcul: baseCalcul,
      contexte_json: contexte,
      section_analytique_id: regle.section_analytique_id,
      regroupement_analytique_id: regle.regroupement_analytique_id
    });
  };

  /**
   * Crée une réduction manuelle
   * @param {Object} params - Paramètres de la réduction
   * @returns {CotisationReduction}
   */
  CotisationReduction.createManuelle = async function(params) {
    const montantReduction = params.type_calcul === 'pourcentage'
      ? (params.base_calcul * params.valeur / 100)
      : params.valeur;

    return await this.create({
      cotisation_id: params.cotisation_id,
      regle_reduction_id: null,
      type_source: 'manuel',
      libelle: params.libelle || 'Réduction manuelle',
      type_calcul: params.type_calcul,
      valeur: params.valeur,
      montant_reduction: montantReduction,
      ordre_application: params.ordre_application || 999,
      base_calcul: params.base_calcul,
      contexte_json: params.contexte_json,
      section_analytique_id: params.section_analytique_id,
      regroupement_analytique_id: params.regroupement_analytique_id
    });
  };

  /**
   * Récupère les réductions d'une cotisation ordonnées
   * @param {number} cotisationId - ID de la cotisation
   * @returns {CotisationReduction[]}
   */
  CotisationReduction.getByCotisation = async function(cotisationId) {
    return await this.findAll({
      where: { cotisation_id: cotisationId },
      order: [['ordre_application', 'ASC']],
      include: [
        {
          model: sequelize.models.RegleReduction,
          as: 'regle',
          required: false
        },
        {
          model: sequelize.models.SectionAnalytique,
          as: 'sectionAnalytique',
          required: false
        }
      ]
    });
  };

  /**
   * Calcule le total des réductions pour une cotisation
   * @param {number} cotisationId - ID de la cotisation
   * @returns {number}
   */
  CotisationReduction.getTotalReductions = async function(cotisationId) {
    const result = await this.findOne({
      where: { cotisation_id: cotisationId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('montant_reduction')), 'total']
      ],
      raw: true
    });

    return parseFloat(result?.total || 0);
  };

  return CotisationReduction;
};
