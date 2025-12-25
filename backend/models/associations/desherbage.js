/**
 * Associations pour le module Desherbage (lots de sortie)
 * TypeSortie, LotSortie, ArticleSortie
 */

function setupDesherbageAssociations(models) {
  const {
    TypeSortie,
    LotSortie,
    ArticleSortie,
    Structure,
    Utilisateur
  } = models;

  // TypeSortie associations
  if (TypeSortie) {
    TypeSortie.hasMany(LotSortie, {
      foreignKey: 'type_sortie_id',
      as: 'lots'
    });

    if (Structure) {
      TypeSortie.belongsTo(Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }
  }

  // LotSortie associations
  if (LotSortie) {
    LotSortie.belongsTo(TypeSortie, {
      foreignKey: 'type_sortie_id',
      as: 'typeSortie'
    });

    LotSortie.hasMany(ArticleSortie, {
      foreignKey: 'lot_sortie_id',
      as: 'articles'
    });

    if (Structure) {
      LotSortie.belongsTo(Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }

    if (Utilisateur) {
      LotSortie.belongsTo(Utilisateur, {
        foreignKey: 'cree_par',
        as: 'createur'
      });

      LotSortie.belongsTo(Utilisateur, {
        foreignKey: 'valide_par',
        as: 'validateur'
      });
    }
  }

  // ArticleSortie associations
  if (ArticleSortie) {
    ArticleSortie.belongsTo(LotSortie, {
      foreignKey: 'lot_sortie_id',
      as: 'lot'
    });

    if (Utilisateur) {
      ArticleSortie.belongsTo(Utilisateur, {
        foreignKey: 'annule_par',
        as: 'annuleur'
      });
    }
  }
}

module.exports = setupDesherbageAssociations;
