const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FormatDisque = sequelize.define('FormatDisque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
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
    tableName: 'formats_disques',
    timestamps: false
  });

  return FormatDisque;
};
