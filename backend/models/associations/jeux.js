/**
 * Associations Jeux (normalisation)
 * Jeu <-> Gamme, Emplacement, Categorie, Theme, Mecanisme, Langue, Editeur, Auteur, Illustrateur
 */

function setupJeuxAssociations(models) {
  const {
    Jeu,
    Gamme,
    EmplacementJeu,
    Editeur,
    Site,
    Categorie,
    JeuCategorie,
    Theme,
    JeuTheme,
    Mecanisme,
    JeuMecanisme,
    Langue,
    JeuLangue,
    JeuEditeur,
    Auteur,
    JeuAuteur,
    Illustrateur,
    JeuIllustrateur
  } = models;

  // ========================================
  // Jeu <-> Gamme (Many-to-One)
  // ========================================

  Gamme.hasMany(Jeu, {
    foreignKey: 'gamme_id',
    as: 'jeux'
  });

  Jeu.belongsTo(Gamme, {
    foreignKey: 'gamme_id',
    as: 'gammeRef'
  });

  // ========================================
  // Jeu <-> EmplacementJeu (Many-to-One)
  // ========================================

  EmplacementJeu.hasMany(Jeu, {
    foreignKey: 'emplacement_id',
    as: 'jeux'
  });

  Jeu.belongsTo(EmplacementJeu, {
    foreignKey: 'emplacement_id',
    as: 'emplacementRef'
  });

  // ========================================
  // Gamme <-> Editeur (Many-to-One)
  // ========================================

  Editeur.hasMany(Gamme, {
    foreignKey: 'editeur_id',
    as: 'gammes'
  });

  Gamme.belongsTo(Editeur, {
    foreignKey: 'editeur_id',
    as: 'editeur'
  });

  // ========================================
  // EmplacementJeu <-> Site (Many-to-One)
  // ========================================

  Site.hasMany(EmplacementJeu, {
    foreignKey: 'site_id',
    as: 'emplacements'
  });

  EmplacementJeu.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  // ========================================
  // Jeu <-> Categorie (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Categorie, {
    through: JeuCategorie,
    foreignKey: 'jeu_id',
    otherKey: 'categorie_id',
    as: 'categoriesRef'
  });

  Categorie.belongsToMany(Jeu, {
    through: JeuCategorie,
    foreignKey: 'categorie_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Theme (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Theme, {
    through: JeuTheme,
    foreignKey: 'jeu_id',
    otherKey: 'theme_id',
    as: 'themesRef'
  });

  Theme.belongsToMany(Jeu, {
    through: JeuTheme,
    foreignKey: 'theme_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Mecanisme (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Mecanisme, {
    through: JeuMecanisme,
    foreignKey: 'jeu_id',
    otherKey: 'mecanisme_id',
    as: 'mecanismesRef'
  });

  Mecanisme.belongsToMany(Jeu, {
    through: JeuMecanisme,
    foreignKey: 'mecanisme_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Langue (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Langue, {
    through: JeuLangue,
    foreignKey: 'jeu_id',
    otherKey: 'langue_id',
    as: 'languesRef'
  });

  Langue.belongsToMany(Jeu, {
    through: JeuLangue,
    foreignKey: 'langue_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Editeur (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Editeur, {
    through: JeuEditeur,
    foreignKey: 'jeu_id',
    otherKey: 'editeur_id',
    as: 'editeursRef'
  });

  Editeur.belongsToMany(Jeu, {
    through: JeuEditeur,
    foreignKey: 'editeur_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Auteur (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Auteur, {
    through: JeuAuteur,
    foreignKey: 'jeu_id',
    otherKey: 'auteur_id',
    as: 'auteursRef'
  });

  Auteur.belongsToMany(Jeu, {
    through: JeuAuteur,
    foreignKey: 'auteur_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });

  // ========================================
  // Jeu <-> Illustrateur (Many-to-Many)
  // ========================================

  Jeu.belongsToMany(Illustrateur, {
    through: JeuIllustrateur,
    foreignKey: 'jeu_id',
    otherKey: 'illustrateur_id',
    as: 'illustrateursRef'
  });

  Illustrateur.belongsToMany(Jeu, {
    through: JeuIllustrateur,
    foreignKey: 'illustrateur_id',
    otherKey: 'jeu_id',
    as: 'jeux'
  });
}

module.exports = setupJeuxAssociations;
