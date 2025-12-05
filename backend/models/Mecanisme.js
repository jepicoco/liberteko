const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mecanisme = sequelize.define('Mecanisme', {
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
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'mecanismes',
    timestamps: false
  });

  return Mecanisme;
};
