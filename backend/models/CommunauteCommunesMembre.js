/**
 * Model CommunauteCommunesMembre
 * Table de liaison entre CommunauteCommunes et Commune
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunauteCommunesMembre = sequelize.define('CommunauteCommunesMembre', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    communaute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference a la communaute de communes'
    },
    commune_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference a la commune membre'
    }
  }, {
    tableName: 'communautes_communes_membres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { name: 'idx_ccm_communaute', fields: ['communaute_id'] },
      { name: 'idx_ccm_commune', fields: ['commune_id'] },
      { name: 'idx_ccm_unique', fields: ['communaute_id', 'commune_id'], unique: true }
    ]
  });

  return CommunauteCommunesMembre;
};
