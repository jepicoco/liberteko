const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Artiste = sequelize.define('Artiste', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nom_scene: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom de scene ou pseudonyme'
    },
    type: {
      type: DataTypes.ENUM('solo', 'groupe', 'orchestre', 'ensemble', 'autre'),
      defaultValue: 'solo'
    },
    pays: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    annee_formation: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    annee_dissolution: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    biographie: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'artistes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Artiste;
};
