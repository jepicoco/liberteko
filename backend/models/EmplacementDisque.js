const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmplacementDisque = sequelize.define('EmplacementDisque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'emplacements_disques',
    timestamps: false
  });

  return EmplacementDisque;
};
