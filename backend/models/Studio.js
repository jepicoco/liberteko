const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Studio = sequelize.define('Studio', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    pays: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    site_web: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'studios',
    timestamps: false
  });

  return Studio;
};
