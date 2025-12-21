/**
 * ConfigurationQuotientFamilial - Groupes de tranches de quotient familial
 * Permet d'avoir plusieurs baremes (ex: bareme CAF, bareme municipal)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfigurationQuotientFamilial = sequelize.define('ConfigurationQuotientFamilial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique (ex: BAREME_CAF_2024)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche (ex: "Bareme CAF 2024")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Configuration par defaut pour les nouvelles cotisations'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure proprietaire (null = global ou organisation)'
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Organisation proprietaire (toutes les structures y ont acces)'
    }
  }, {
    tableName: 'configurations_quotient_familial',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Recupere la configuration par defaut
   * @param {number|null} structureId
   * @param {number|null} organisationId
   * @returns {Promise<ConfigurationQuotientFamilial|null>}
   */
  ConfigurationQuotientFamilial.getDefault = async function(structureId = null, organisationId = null) {
    const { Op } = sequelize.Sequelize;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }

    return await this.findOne({
      where: {
        actif: true,
        par_defaut: true,
        [Op.or]: orConditions
      },
      order: [
        // Priorite: structure > organisation > global
        [sequelize.literal('structure_id IS NULL'), 'ASC'],
        [sequelize.literal('organisation_id IS NULL'), 'ASC'],
        ['structure_id', 'DESC']
      ]
    });
  };

  /**
   * Trouve la tranche correspondant a un QF
   * @param {number} quotientFamilial
   * @returns {Promise<TrancheQuotientFamilial|null>}
   */
  ConfigurationQuotientFamilial.prototype.findTrancheForQF = async function(quotientFamilial) {
    if (quotientFamilial === null || quotientFamilial === undefined) {
      return null;
    }

    const TrancheQF = sequelize.models.TrancheQuotientFamilial;
    const { Op } = sequelize.Sequelize;

    return await TrancheQF.findOne({
      where: {
        configuration_qf_id: this.id,
        actif: true,
        borne_min: { [Op.lte]: quotientFamilial },
        [Op.or]: [
          { borne_max: null },
          { borne_max: { [Op.gt]: quotientFamilial } }
        ]
      },
      order: [['borne_min', 'ASC']]
    });
  };

  return ConfigurationQuotientFamilial;
};
