const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ElementEmplacement = sequelize.define('ElementEmplacement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    element_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'elements_plan',
        key: 'id'
      },
      comment: 'Element graphique du plan'
    },
    // Type de collection
    type_collection: {
      type: DataTypes.ENUM('jeu', 'livre', 'film', 'disque'),
      allowNull: false,
      comment: 'Type de collection'
    },
    // ID de l emplacement selon le type
    emplacement_jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_jeux',
        key: 'id'
      }
    },
    emplacement_livre_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_livres',
        key: 'id'
      }
    },
    emplacement_film_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_films',
        key: 'id'
      }
    },
    emplacement_disque_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_disques',
        key: 'id'
      }
    },
    // Position dans l element (si plusieurs emplacements)
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre de l emplacement dans l element'
    },
    // Libelle specifique (sinon herite de l emplacement)
    libelle_override: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Libelle personnalise pour cet element'
    }
  }, {
    tableName: 'elements_emplacements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'elem_empl_idx',
        fields: ['element_plan_id', 'type_collection']
      }
    ]
  });

  /**
   * Recupere l'ID de l'emplacement selon le type
   */
  ElementEmplacement.prototype.getEmplacementId = function() {
    switch (this.type_collection) {
      case 'jeu': return this.emplacement_jeu_id;
      case 'livre': return this.emplacement_livre_id;
      case 'film': return this.emplacement_film_id;
      case 'disque': return this.emplacement_disque_id;
      default: return null;
    }
  };

  return ElementEmplacement;
};
