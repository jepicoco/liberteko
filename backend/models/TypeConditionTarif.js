/**
 * Modele TypeConditionTarif
 *
 * Types de conditions disponibles pour les arbres de decision tarifaires.
 * Table de reference contenant les types comme COMMUNE, QF, AGE, etc.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeConditionTarif = sequelize.define('TypeConditionTarif', {
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
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    config_schema: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const value = this.getDataValue('config_schema');
        if (!value) return null;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            return null;
          }
        }
        return value;
      }
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'types_condition_tarif',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return TypeConditionTarif;
};
