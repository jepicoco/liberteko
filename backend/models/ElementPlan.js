const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ElementPlan = sequelize.define('ElementPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    etage_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'etages',
        key: 'id'
      },
      comment: 'Etage contenant cet element'
    },
    // Type d element
    type_element: {
      type: DataTypes.ENUM('mur', 'etagere', 'meuble', 'table', 'zone'),
      allowNull: false,
      comment: 'Type d element graphique'
    },
    // Geometrie (format SVG-like)
    // Pour lignes/murs: [{x, y}, {x, y}]
    // Pour rectangles: [{x, y}, {x, y}] (coin haut-gauche, coin bas-droit)
    // Pour polygones/zones: [{x, y}, {x, y}, ...]
    points: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Coordonnees des points [{x, y}, ...]'
    },
    // Rotation (en degres, centre = centre geometrique)
    rotation: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Rotation en degres'
    },
    // Style graphique
    style: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'Style: {couleur, epaisseur, remplissage, opacite, bordure, dashArray}'
    },
    // Libelle affiche
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Texte affiche sur l element'
    },
    // Position du libelle
    libelle_position: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Position du libelle {x, y, ancrage}'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description pour tooltip/popup'
    },
    // Calque (pour superposition)
    calque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Numero de calque (z-index)'
    },
    // Pour les zones: chevauchement autorise
    chevauchable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, peut chevaucher d autres elements (zones)'
    },
    // Verrouillage
    verrouille: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Element non modifiable'
    },
    // Visibilite publique
    visible_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Visible sur la vue publique'
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
    tableName: 'elements_plan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['etage_id', 'calque', 'ordre_affichage']
      },
      {
        fields: ['type_element']
      }
    ]
  });

  // Styles par defaut selon le type
  ElementPlan.getDefaultStyle = function(typeElement) {
    const styles = {
      mur: {
        couleur: '#333333',
        epaisseur: 6,
        remplissage: null,
        opacite: 1
      },
      etagere: {
        couleur: '#8B4513',
        epaisseur: 2,
        remplissage: '#DEB887',
        opacite: 0.8
      },
      meuble: {
        couleur: '#4a4a4a',
        epaisseur: 2,
        remplissage: '#a0a0a0',
        opacite: 0.7
      },
      table: {
        couleur: '#2c3e50',
        epaisseur: 2,
        remplissage: '#bdc3c7',
        opacite: 0.6
      },
      zone: {
        couleur: '#3498db',
        epaisseur: 2,
        remplissage: '#3498db',
        opacite: 0.3,
        dashArray: '5,5'
      }
    };
    return styles[typeElement] || styles.mur;
  };

  return ElementPlan;
};
