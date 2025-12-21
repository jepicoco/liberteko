/**
 * Associations Prolongations et Reservations
 * Gestion des demandes de prolongation et reservations d'articles
 */

function setupProlongationsReservationsAssociations(models) {
  const {
    Utilisateur,
    Emprunt,
    Prolongation,
    Reservation,
    Jeu,
    Livre,
    Film,
    Disque
  } = models;

  // ========================================
  // PROLONGATIONS
  // ========================================

  // Emprunt <-> Prolongation (One-to-Many)
  Emprunt.hasMany(Prolongation, {
    foreignKey: 'emprunt_id',
    as: 'prolongations'
  });

  Prolongation.belongsTo(Emprunt, {
    foreignKey: 'emprunt_id',
    as: 'emprunt'
  });

  // Utilisateur <-> Prolongation (demandeur)
  Utilisateur.hasMany(Prolongation, {
    foreignKey: 'utilisateur_id',
    as: 'prolongationsDemandees'
  });

  Prolongation.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'demandeur'
  });

  // Utilisateur <-> Prolongation (admin qui traite)
  Prolongation.belongsTo(Utilisateur, {
    foreignKey: 'traite_par',
    as: 'traitePar'
  });

  // ========================================
  // RESERVATIONS
  // ========================================

  // Utilisateur <-> Reservation
  Utilisateur.hasMany(Reservation, {
    foreignKey: 'utilisateur_id',
    as: 'reservations'
  });

  Reservation.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // Jeu <-> Reservation
  Jeu.hasMany(Reservation, {
    foreignKey: 'jeu_id',
    as: 'reservations'
  });

  Reservation.belongsTo(Jeu, {
    foreignKey: 'jeu_id',
    as: 'jeu'
  });

  // Livre <-> Reservation
  Livre.hasMany(Reservation, {
    foreignKey: 'livre_id',
    as: 'reservations'
  });

  Reservation.belongsTo(Livre, {
    foreignKey: 'livre_id',
    as: 'livre'
  });

  // Film <-> Reservation
  Film.hasMany(Reservation, {
    foreignKey: 'film_id',
    as: 'reservations'
  });

  Reservation.belongsTo(Film, {
    foreignKey: 'film_id',
    as: 'film'
  });

  // Disque <-> Reservation
  Disque.hasMany(Reservation, {
    foreignKey: 'cd_id',
    as: 'reservations'
  });

  Reservation.belongsTo(Disque, {
    foreignKey: 'cd_id',
    as: 'disque'
  });

  // Emprunt <-> Reservation (apres conversion)
  Reservation.belongsTo(Emprunt, {
    foreignKey: 'emprunt_id',
    as: 'emprunt'
  });

  Emprunt.hasOne(Reservation, {
    foreignKey: 'emprunt_id',
    as: 'reservationOrigine'
  });
}

module.exports = setupProlongationsReservationsAssociations;
