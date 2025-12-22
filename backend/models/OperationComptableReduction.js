/**
 * Modele OperationComptableReduction
 *
 * Operations comptables specifiques aux reductions de cotisations.
 * Permet de ventiler les reductions par type pour l'export comptable.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OperationComptableReduction = sequelize.define('OperationComptableReduction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    compte_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    journal_code: {
      type: DataTypes.STRING(10),
      defaultValue: 'VT'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'operations_comptables_reduction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return OperationComptableReduction;
};
