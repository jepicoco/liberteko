/**
 * Modele TypeSortie
 * Types de sortie pour le desherbage (rebus, don, vente)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeSortie = sequelize.define('TypeSortie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code unique du type (rebus, don, vente)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description detaillee'
    },
    compte_sortie: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte comptable pour cette sortie (ex: 6571, 6713, 7542)'
    },
    journal_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'OD',
      comment: 'Code journal comptable'
    },
    prefixe_piece: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'SOR',
      comment: 'Prefixe pour numero de piece comptable'
    },
    generer_ecritures: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Generer des ecritures comptables automatiquement'
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d',
      comment: 'Couleur pour affichage UI'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'box-arrow-right',
      comment: 'Icone Bootstrap Icons'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre dans les listes'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Type actif ou desactive'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure specifique ou NULL pour toutes'
    }
  }, {
    tableName: 'types_sortie',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['actif'] },
      { fields: ['structure_id'] }
    ]
  });

  // Associations
  TypeSortie.associate = function(models) {
    TypeSortie.hasMany(models.LotSortie, {
      foreignKey: 'type_sortie_id',
      as: 'lots'
    });

    if (models.Structure) {
      TypeSortie.belongsTo(models.Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }
  };

  // Methodes de classe
  TypeSortie.getActifs = async function(structureId = null) {
    const where = { actif: true };
    if (structureId) {
      where[sequelize.Sequelize.Op.or] = [
        { structure_id: null },
        { structure_id: structureId }
      ];
    }
    return this.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']]
    });
  };

  return TypeSortie;
};
