const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmplacementJeu = sequelize.define('EmplacementJeu', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code court (A1, B2, etc.)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      comment: 'Site/local concerne'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'emplacements_jeux',
    timestamps: false
  });

  return EmplacementJeu;
};
