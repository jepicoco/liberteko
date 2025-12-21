/**
 * Associations Thematiques IA
 * Thematique, Alias, Articles
 */

function setupThematiquesAssociations(models) {
  const {
    Thematique,
    ThematiqueAlias,
    ArticleThematique
  } = models;

  // ========================================
  // Thematique <-> Alias
  // ========================================

  Thematique.hasMany(ThematiqueAlias, {
    foreignKey: 'thematique_id',
    as: 'alias'
  });

  ThematiqueAlias.belongsTo(Thematique, {
    foreignKey: 'thematique_id',
    as: 'thematique'
  });

  // ========================================
  // Thematique <-> ArticleThematique
  // ========================================

  Thematique.hasMany(ArticleThematique, {
    foreignKey: 'thematique_id',
    as: 'articles'
  });

  ArticleThematique.belongsTo(Thematique, {
    foreignKey: 'thematique_id',
    as: 'thematique'
  });
}

module.exports = setupThematiquesAssociations;
