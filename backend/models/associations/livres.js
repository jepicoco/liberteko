/**
 * Associations Livres (normalisation)
 * Livre <-> Format, Collection, Emplacement, Auteur, Editeur, Genre, Theme, Langue
 */

function setupLivresAssociations(models) {
  const {
    Livre,
    FormatLivre,
    CollectionLivre,
    EmplacementLivre,
    Editeur,
    Site,
    Auteur,
    LivreAuteur,
    LivreEditeur,
    GenreLitteraire,
    LivreGenre,
    Theme,
    LivreTheme,
    Langue,
    LivreLangue
  } = models;

  // ========================================
  // Livre <-> FormatLivre (Many-to-One)
  // ========================================

  FormatLivre.hasMany(Livre, {
    foreignKey: 'format_id',
    as: 'livres'
  });

  Livre.belongsTo(FormatLivre, {
    foreignKey: 'format_id',
    as: 'formatRef'
  });

  // ========================================
  // Livre <-> CollectionLivre (Many-to-One)
  // ========================================

  CollectionLivre.hasMany(Livre, {
    foreignKey: 'collection_id',
    as: 'livres'
  });

  Livre.belongsTo(CollectionLivre, {
    foreignKey: 'collection_id',
    as: 'collectionRef'
  });

  // ========================================
  // Livre <-> EmplacementLivre (Many-to-One)
  // ========================================

  EmplacementLivre.hasMany(Livre, {
    foreignKey: 'emplacement_id',
    as: 'livres'
  });

  Livre.belongsTo(EmplacementLivre, {
    foreignKey: 'emplacement_id',
    as: 'emplacementRef'
  });

  // ========================================
  // CollectionLivre <-> Editeur (Many-to-One)
  // ========================================

  Editeur.hasMany(CollectionLivre, {
    foreignKey: 'editeur_id',
    as: 'collectionsLivres'
  });

  CollectionLivre.belongsTo(Editeur, {
    foreignKey: 'editeur_id',
    as: 'editeur'
  });

  // ========================================
  // EmplacementLivre <-> Site (Many-to-One)
  // ========================================

  Site.hasMany(EmplacementLivre, {
    foreignKey: 'site_id',
    as: 'emplacementsLivres'
  });

  EmplacementLivre.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  // ========================================
  // Livre <-> Auteur (Many-to-Many)
  // ========================================

  Livre.belongsToMany(Auteur, {
    through: LivreAuteur,
    foreignKey: 'livre_id',
    otherKey: 'auteur_id',
    as: 'auteursRef'
  });

  Auteur.belongsToMany(Livre, {
    through: LivreAuteur,
    foreignKey: 'auteur_id',
    otherKey: 'livre_id',
    as: 'livres'
  });

  // ========================================
  // Livre <-> Editeur (Many-to-Many)
  // ========================================

  Livre.belongsToMany(Editeur, {
    through: LivreEditeur,
    foreignKey: 'livre_id',
    otherKey: 'editeur_id',
    as: 'editeursRef'
  });

  Editeur.belongsToMany(Livre, {
    through: LivreEditeur,
    foreignKey: 'editeur_id',
    otherKey: 'livre_id',
    as: 'livres'
  });

  // ========================================
  // Livre <-> GenreLitteraire (Many-to-Many)
  // ========================================

  Livre.belongsToMany(GenreLitteraire, {
    through: LivreGenre,
    foreignKey: 'livre_id',
    otherKey: 'genre_id',
    as: 'genresRef'
  });

  GenreLitteraire.belongsToMany(Livre, {
    through: LivreGenre,
    foreignKey: 'genre_id',
    otherKey: 'livre_id',
    as: 'livres'
  });

  // ========================================
  // Livre <-> Theme (Many-to-Many)
  // ========================================

  Livre.belongsToMany(Theme, {
    through: LivreTheme,
    foreignKey: 'livre_id',
    otherKey: 'theme_id',
    as: 'themesRef'
  });

  Theme.belongsToMany(Livre, {
    through: LivreTheme,
    foreignKey: 'theme_id',
    otherKey: 'livre_id',
    as: 'livres'
  });

  // ========================================
  // Livre <-> Langue (Many-to-Many)
  // ========================================

  Livre.belongsToMany(Langue, {
    through: LivreLangue,
    foreignKey: 'livre_id',
    otherKey: 'langue_id',
    as: 'languesRef'
  });

  Langue.belongsToMany(Livre, {
    through: LivreLangue,
    foreignKey: 'langue_id',
    otherKey: 'livre_id',
    as: 'livres'
  });
}

module.exports = setupLivresAssociations;
