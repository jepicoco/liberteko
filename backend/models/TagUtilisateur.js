/**
 * Modele TagUtilisateur
 * Tags/etiquettes attribuables aux utilisateurs
 * Exemples: salarie, benevole actif, handicap, RSA, etudiant...
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TagUtilisateur = sequelize.define('TagUtilisateur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isUppercase: true
      },
      set(value) {
        this.setDataValue('code', value ? value.toUpperCase().replace(/\s+/g, '_') : value);
      }
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d',
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/
      }
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-tag'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'null = global, sinon specifique a une structure'
    }
  }, {
    tableName: 'tags_utilisateur',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  TagUtilisateur.getActifs = async function(structureId = null) {
    const where = { actif: true };
    if (structureId) {
      where[sequelize.Sequelize.Op.or] = [
        { structure_id: null },
        { structure_id: structureId }
      ];
    }
    return this.findAll({
      where,
      order: [['ordre', 'ASC'], ['libelle', 'ASC']]
    });
  };

  TagUtilisateur.getByCode = async function(code) {
    return this.findOne({
      where: { code: code.toUpperCase() }
    });
  };

  return TagUtilisateur;
};
