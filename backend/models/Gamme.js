const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Gamme = sequelize.define('Gamme', {
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
    editeur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'editeurs',
        key: 'id'
      }
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
    tableName: 'gammes',
    timestamps: false
  });

  return Gamme;
};
