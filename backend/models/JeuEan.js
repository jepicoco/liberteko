/**
 * Modele JeuEan
 * Table de liaison pour stocker plusieurs EAN par jeu
 * Permet le scan code-barres avec n'importe quel EAN alternatif
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuEan = sequelize.define('JeuEan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    ean: {
      type: DataTypes.STRING(13),
      allowNull: false,
      unique: true,
      comment: 'Code EAN-13 (unique globalement)'
    },
    principal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'EAN principal affiche par defaut'
    },
    source: {
      type: DataTypes.ENUM('import', 'manuel', 'bgg', 'upcitemdb'),
      defaultValue: 'import',
      comment: 'Origine de l\'EAN'
    }
  }, {
    tableName: 'jeu_eans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return JeuEan;
};
