/**
 * Associations Codes-Barres Reserves
 * Lots, Codes utilisateurs/jeux/livres/films/disques
 */

function setupCodesBarresAssociations(models) {
  const {
    Utilisateur,
    Jeu,
    Livre,
    Film,
    Disque,
    LotCodesBarres,
    CodeBarreUtilisateur,
    CodeBarreJeu,
    CodeBarreLivre,
    CodeBarreFilm,
    CodeBarreDisque
  } = models;

  // ========================================
  // LotCodesBarres <-> Utilisateur (createur)
  // ========================================

  LotCodesBarres.belongsTo(Utilisateur, {
    foreignKey: 'cree_par',
    as: 'createur'
  });

  Utilisateur.hasMany(LotCodesBarres, {
    foreignKey: 'cree_par',
    as: 'lotsCodesBarres'
  });

  // ========================================
  // LotCodesBarres <-> CodeBarreUtilisateur
  // ========================================

  LotCodesBarres.hasMany(CodeBarreUtilisateur, {
    foreignKey: 'lot_id',
    as: 'codesUtilisateurs'
  });

  CodeBarreUtilisateur.belongsTo(LotCodesBarres, {
    foreignKey: 'lot_id',
    as: 'lot'
  });

  CodeBarreUtilisateur.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  Utilisateur.hasOne(CodeBarreUtilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'codeBarreReserve'
  });

  // ========================================
  // LotCodesBarres <-> CodeBarreJeu
  // ========================================

  LotCodesBarres.hasMany(CodeBarreJeu, {
    foreignKey: 'lot_id',
    as: 'codesJeux'
  });

  CodeBarreJeu.belongsTo(LotCodesBarres, {
    foreignKey: 'lot_id',
    as: 'lot'
  });

  CodeBarreJeu.belongsTo(Jeu, {
    foreignKey: 'jeu_id',
    as: 'jeu'
  });

  Jeu.hasOne(CodeBarreJeu, {
    foreignKey: 'jeu_id',
    as: 'codeBarreReserve'
  });

  // ========================================
  // LotCodesBarres <-> CodeBarreLivre
  // ========================================

  LotCodesBarres.hasMany(CodeBarreLivre, {
    foreignKey: 'lot_id',
    as: 'codesLivres'
  });

  CodeBarreLivre.belongsTo(LotCodesBarres, {
    foreignKey: 'lot_id',
    as: 'lot'
  });

  CodeBarreLivre.belongsTo(Livre, {
    foreignKey: 'livre_id',
    as: 'livre'
  });

  Livre.hasOne(CodeBarreLivre, {
    foreignKey: 'livre_id',
    as: 'codeBarreReserve'
  });

  // ========================================
  // LotCodesBarres <-> CodeBarreFilm
  // ========================================

  LotCodesBarres.hasMany(CodeBarreFilm, {
    foreignKey: 'lot_id',
    as: 'codesFilms'
  });

  CodeBarreFilm.belongsTo(LotCodesBarres, {
    foreignKey: 'lot_id',
    as: 'lot'
  });

  CodeBarreFilm.belongsTo(Film, {
    foreignKey: 'film_id',
    as: 'film'
  });

  Film.hasOne(CodeBarreFilm, {
    foreignKey: 'film_id',
    as: 'codeBarreReserve'
  });

  // ========================================
  // LotCodesBarres <-> CodeBarreDisque
  // ========================================

  LotCodesBarres.hasMany(CodeBarreDisque, {
    foreignKey: 'lot_id',
    as: 'codesDisques'
  });

  CodeBarreDisque.belongsTo(LotCodesBarres, {
    foreignKey: 'lot_id',
    as: 'lot'
  });

  CodeBarreDisque.belongsTo(Disque, {
    foreignKey: 'disque_id',
    as: 'disque'
  });

  Disque.hasOne(CodeBarreDisque, {
    foreignKey: 'disque_id',
    as: 'codeBarreReserve'
  });
}

module.exports = setupCodesBarresAssociations;
