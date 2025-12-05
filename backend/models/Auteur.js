const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Auteur = sequelize.define('Auteur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Nom complet ou nom de famille'
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nationalite: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'auteurs',
    timestamps: false
  });

  return Auteur;
};
