/**
 * Associations Disques (normalisation)
 * Disque <-> Format, Label, Emplacement, Artiste, Genre
 */

function setupDisquesAssociations(models) {
  const {
    Disque,
    FormatDisque,
    LabelDisque,
    EmplacementDisque,
    Artiste,
    DisqueArtiste,
    GenreMusical,
    DisqueGenre
  } = models;

  // ========================================
  // Disque <-> FormatDisque (Many-to-One)
  // ========================================

  FormatDisque.hasMany(Disque, {
    foreignKey: 'format_id',
    as: 'disques'
  });

  Disque.belongsTo(FormatDisque, {
    foreignKey: 'format_id',
    as: 'formatRef'
  });

  // ========================================
  // Disque <-> LabelDisque (Many-to-One)
  // ========================================

  LabelDisque.hasMany(Disque, {
    foreignKey: 'label_id',
    as: 'disques'
  });

  Disque.belongsTo(LabelDisque, {
    foreignKey: 'label_id',
    as: 'labelRef'
  });

  // ========================================
  // Disque <-> EmplacementDisque (Many-to-One)
  // ========================================

  EmplacementDisque.hasMany(Disque, {
    foreignKey: 'emplacement_id',
    as: 'disques'
  });

  Disque.belongsTo(EmplacementDisque, {
    foreignKey: 'emplacement_id',
    as: 'emplacementRef'
  });

  // ========================================
  // Disque <-> Artiste (Many-to-Many avec role)
  // ========================================

  Disque.belongsToMany(Artiste, {
    through: DisqueArtiste,
    foreignKey: 'disque_id',
    otherKey: 'artiste_id',
    as: 'artistesRef'
  });

  Artiste.belongsToMany(Disque, {
    through: DisqueArtiste,
    foreignKey: 'artiste_id',
    otherKey: 'disque_id',
    as: 'disques'
  });

  // ========================================
  // Disque <-> GenreMusical (Many-to-Many)
  // ========================================

  Disque.belongsToMany(GenreMusical, {
    through: DisqueGenre,
    foreignKey: 'disque_id',
    otherKey: 'genre_id',
    as: 'genresRef'
  });

  GenreMusical.belongsToMany(Disque, {
    through: DisqueGenre,
    foreignKey: 'genre_id',
    otherKey: 'disque_id',
    as: 'disques'
  });
}

module.exports = setupDisquesAssociations;
