const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      comment: 'Site associe (relation 1-1)'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom du plan'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Dimensions par defaut du canvas (en pixels)
    largeur_defaut: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1200,
      comment: 'Largeur par defaut du canvas en pixels'
    },
    hauteur_defaut: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 800,
      comment: 'Hauteur par defaut du canvas en pixels'
    },
    // Echelle (ex: 1 pixel = 1 cm)
    echelle: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0,
      comment: 'Echelle du plan (1 unite = X cm)'
    },
    unite_echelle: {
      type: DataTypes.ENUM('cm', 'm', 'px'),
      allowNull: false,
      defaultValue: 'cm',
      comment: 'Unite de l echelle'
    },
    // Grille
    afficher_grille: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    taille_grille: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'Taille de la grille en pixels'
    },
    magnetisme_grille: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Activer le magnetisme a la grille'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Plan;
};
