/**
 * Associations pour les Tags Utilisateur
 * Many-to-many entre Utilisateur et TagUtilisateur
 */

function setupTagsUtilisateurAssociations(models) {
  const { Utilisateur, TagUtilisateur, UtilisateurTag, Structure } = models;

  // Many-to-many: Utilisateur <-> TagUtilisateur via UtilisateurTag
  Utilisateur.belongsToMany(TagUtilisateur, {
    through: UtilisateurTag,
    foreignKey: 'utilisateur_id',
    otherKey: 'tag_utilisateur_id',
    as: 'tags'
  });

  TagUtilisateur.belongsToMany(Utilisateur, {
    through: UtilisateurTag,
    foreignKey: 'tag_utilisateur_id',
    otherKey: 'utilisateur_id',
    as: 'utilisateurs'
  });

  // TagUtilisateur peut etre lie a une Structure
  if (Structure) {
    TagUtilisateur.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });

    Structure.hasMany(TagUtilisateur, {
      foreignKey: 'structure_id',
      as: 'tagsUtilisateur'
    });
  }

  // Associations directes pour la table de jonction
  UtilisateurTag.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  UtilisateurTag.belongsTo(TagUtilisateur, {
    foreignKey: 'tag_utilisateur_id',
    as: 'tag'
  });
}

module.exports = setupTagsUtilisateurAssociations;
