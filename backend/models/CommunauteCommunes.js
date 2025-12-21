/**
 * Model CommunauteCommunes
 * Groupement de communes (EPCI, intercommunalites)
 * Permet de definir des reductions pour toutes les communes d'une communaute
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunauteCommunes = sequelize.define('CommunauteCommunes', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique de la communaute (ex: CC_THONON)'
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Nom de la communaute de communes'
    },
    code_siren: {
      type: DataTypes.STRING(15),
      allowNull: true,
      comment: 'Code SIREN de l\'EPCI'
    },
    type_epci: {
      type: DataTypes.ENUM('CC', 'CA', 'CU', 'ME'),
      allowNull: true,
      defaultValue: 'CC',
      comment: 'Type: CC=Communaute de Communes, CA=Agglomeration, CU=Urbaine, ME=Metropole'
    },
    departement: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: 'Departement principal'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description ou notes'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure proprietaire (multi-structures)'
    }
  }, {
    tableName: 'communautes_communes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_cc_code', fields: ['code'], unique: true },
      { name: 'idx_cc_nom', fields: ['nom'] },
      { name: 'idx_cc_structure', fields: ['structure_id'] }
    ]
  });

  return CommunauteCommunes;
};
