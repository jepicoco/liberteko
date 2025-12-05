const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LabelDisque = sequelize.define('LabelDisque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    pays: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    site_web: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'labels_disques',
    timestamps: false
  });

  return LabelDisque;
};
