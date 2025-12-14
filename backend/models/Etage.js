const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Etage = sequelize.define('Etage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      comment: 'Plan parent'
    },
    // Type d etage
    type: {
      type: DataTypes.ENUM('etage', 'annexe', 'exterieur'),
      allowNull: false,
      defaultValue: 'etage',
      comment: 'Type: etage normal, annexe (autre batiment), exterieur'
    },
    // Numero de l etage (-1 = sous-sol, 0 = RDC, 1 = 1er, etc.)
    numero: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Numero de l etage (null pour annexes)'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiche (ex: RDC, 1er etage, Annexe Nord)'
    },
    // Dimensions specifiques (sinon herite du plan)
    largeur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Largeur specifique (null = herite du plan)'
    },
    hauteur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Hauteur specifique (null = herite du plan)'
    },
    // Style
    couleur_fond: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#ffffff',
      comment: 'Couleur de fond du canvas'
    },
    image_fond_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL image de fond (plan cadastral, photo aerienne...)'
    },
    opacite_fond: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.3,
      comment: 'Opacite de l image de fond (0-1)'
    },
    // Pour les annexes/exterieurs : adresse
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse pour annexes externes'
    },
    coordonnees_gps: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Coordonnees GPS {lat, lng} pour annexes'
    },
    // Affichage
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'etages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['plan_id', 'ordre_affichage']
      }
    ]
  });

  return Etage;
};
