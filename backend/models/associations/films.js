/**
 * Associations Films (normalisation)
 * Film <-> Support, Emplacement, Realisateur, Acteur, Genre, Theme, Langue, SousTitres, Studio
 */

function setupFilmsAssociations(models) {
  const {
    Film,
    SupportVideo,
    EmplacementFilm,
    Site,
    Realisateur,
    FilmRealisateur,
    Acteur,
    FilmActeur,
    GenreFilm,
    FilmGenre,
    Theme,
    FilmTheme,
    Langue,
    FilmLangue,
    FilmSousTitre,
    Studio,
    FilmStudio
  } = models;

  // ========================================
  // Film <-> SupportVideo (Many-to-One)
  // ========================================

  SupportVideo.hasMany(Film, {
    foreignKey: 'support_id',
    as: 'films'
  });

  Film.belongsTo(SupportVideo, {
    foreignKey: 'support_id',
    as: 'supportRef'
  });

  // ========================================
  // Film <-> EmplacementFilm (Many-to-One)
  // ========================================

  EmplacementFilm.hasMany(Film, {
    foreignKey: 'emplacement_id',
    as: 'films'
  });

  Film.belongsTo(EmplacementFilm, {
    foreignKey: 'emplacement_id',
    as: 'emplacementRef'
  });

  // ========================================
  // EmplacementFilm <-> Site (Many-to-One)
  // ========================================

  Site.hasMany(EmplacementFilm, {
    foreignKey: 'site_id',
    as: 'emplacementsFilms'
  });

  EmplacementFilm.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  // ========================================
  // Film <-> Realisateur (Many-to-Many)
  // ========================================

  Film.belongsToMany(Realisateur, {
    through: FilmRealisateur,
    foreignKey: 'film_id',
    otherKey: 'realisateur_id',
    as: 'realisateursRef'
  });

  Realisateur.belongsToMany(Film, {
    through: FilmRealisateur,
    foreignKey: 'realisateur_id',
    otherKey: 'film_id',
    as: 'films'
  });

  // ========================================
  // Film <-> Acteur (Many-to-Many avec role)
  // ========================================

  Film.belongsToMany(Acteur, {
    through: FilmActeur,
    foreignKey: 'film_id',
    otherKey: 'acteur_id',
    as: 'acteursRef'
  });

  Acteur.belongsToMany(Film, {
    through: FilmActeur,
    foreignKey: 'acteur_id',
    otherKey: 'film_id',
    as: 'films'
  });

  // ========================================
  // Film <-> GenreFilm (Many-to-Many)
  // ========================================

  Film.belongsToMany(GenreFilm, {
    through: FilmGenre,
    foreignKey: 'film_id',
    otherKey: 'genre_id',
    as: 'genresRef'
  });

  GenreFilm.belongsToMany(Film, {
    through: FilmGenre,
    foreignKey: 'genre_id',
    otherKey: 'film_id',
    as: 'films'
  });

  // ========================================
  // Film <-> Theme (Many-to-Many)
  // ========================================

  Film.belongsToMany(Theme, {
    through: FilmTheme,
    foreignKey: 'film_id',
    otherKey: 'theme_id',
    as: 'themesRef'
  });

  Theme.belongsToMany(Film, {
    through: FilmTheme,
    foreignKey: 'theme_id',
    otherKey: 'film_id',
    as: 'films'
  });

  // ========================================
  // Film <-> Langue (Many-to-Many - Audio)
  // ========================================

  Film.belongsToMany(Langue, {
    through: FilmLangue,
    foreignKey: 'film_id',
    otherKey: 'langue_id',
    as: 'languesRef'
  });

  Langue.belongsToMany(Film, {
    through: FilmLangue,
    foreignKey: 'langue_id',
    otherKey: 'film_id',
    as: 'films'
  });

  // ========================================
  // Film <-> Langue (Many-to-Many - Sous-titres)
  // ========================================

  Film.belongsToMany(Langue, {
    through: FilmSousTitre,
    foreignKey: 'film_id',
    otherKey: 'langue_id',
    as: 'sousTitresRef'
  });

  Langue.belongsToMany(Film, {
    through: FilmSousTitre,
    foreignKey: 'langue_id',
    otherKey: 'film_id',
    as: 'filmsSousTitres'
  });

  // ========================================
  // Film <-> Studio (Many-to-Many)
  // ========================================

  Film.belongsToMany(Studio, {
    through: FilmStudio,
    foreignKey: 'film_id',
    otherKey: 'studio_id',
    as: 'studiosRef'
  });

  Studio.belongsToMany(Film, {
    through: FilmStudio,
    foreignKey: 'studio_id',
    otherKey: 'film_id',
    as: 'films'
  });
}

module.exports = setupFilmsAssociations;
