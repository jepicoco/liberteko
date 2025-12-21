/**
 * Associations Core
 * Utilisateur, Emprunt, Cotisation, Communications, Sites, Horaires
 */

function setupCoreAssociations(models) {
  const {
    Utilisateur,
    Commune,
    Emprunt,
    Jeu,
    Livre,
    Film,
    Disque,
    Cotisation,
    TarifCotisation,
    CodeReduction,
    EmailLog,
    SmsLog,
    CompteBancaire,
    Site,
    HoraireOuverture,
    FermetureExceptionnelle,
    ParametresCalendrier
  } = models;

  // ========================================
  // Utilisateur (self-referencing pour famille)
  // ========================================

  Utilisateur.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_parent_id',
    as: 'parent'
  });

  Utilisateur.hasMany(Utilisateur, {
    foreignKey: 'utilisateur_parent_id',
    as: 'enfants'
  });

  // ========================================
  // Utilisateur <-> Commune
  // ========================================

  Utilisateur.belongsTo(Commune, {
    foreignKey: 'commune_id',
    as: 'communeResidence'
  });

  Utilisateur.belongsTo(Commune, {
    foreignKey: 'commune_prise_en_charge_id',
    as: 'communePriseEnCharge'
  });

  // ========================================
  // Utilisateur <-> Emprunt
  // ========================================

  Utilisateur.hasMany(Emprunt, {
    foreignKey: 'utilisateur_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // ========================================
  // Collections <-> Emprunt (directement sur l'article)
  // ========================================

  Jeu.hasMany(Emprunt, {
    foreignKey: 'jeu_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Jeu, {
    foreignKey: 'jeu_id',
    as: 'jeu'
  });

  Livre.hasMany(Emprunt, {
    foreignKey: 'livre_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Livre, {
    foreignKey: 'livre_id',
    as: 'livre'
  });

  Film.hasMany(Emprunt, {
    foreignKey: 'film_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Film, {
    foreignKey: 'film_id',
    as: 'film'
  });

  Disque.hasMany(Emprunt, {
    foreignKey: 'disque_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Disque, {
    foreignKey: 'disque_id',
    as: 'disque'
  });

  // ========================================
  // Utilisateur <-> Cotisation
  // ========================================

  Utilisateur.hasMany(Cotisation, {
    foreignKey: 'utilisateur_id',
    as: 'cotisations'
  });

  Cotisation.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // ========================================
  // TarifCotisation <-> Cotisation
  // ========================================

  TarifCotisation.hasMany(Cotisation, {
    foreignKey: 'tarif_cotisation_id',
    as: 'cotisations'
  });

  Cotisation.belongsTo(TarifCotisation, {
    foreignKey: 'tarif_cotisation_id',
    as: 'tarif'
  });

  // ========================================
  // CodeReduction <-> Cotisation
  // ========================================

  CodeReduction.hasMany(Cotisation, {
    foreignKey: 'code_reduction_id',
    as: 'cotisations'
  });

  Cotisation.belongsTo(CodeReduction, {
    foreignKey: 'code_reduction_id',
    as: 'codeReduction'
  });

  // ========================================
  // Utilisateur <-> Communications
  // ========================================

  Utilisateur.hasMany(EmailLog, {
    foreignKey: 'utilisateur_id',
    as: 'emailLogs'
  });

  EmailLog.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  Utilisateur.hasMany(SmsLog, {
    foreignKey: 'utilisateur_id',
    as: 'smsLogs'
  });

  SmsLog.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  // ========================================
  // Sites et Horaires
  // ========================================

  CompteBancaire.hasMany(Site, {
    foreignKey: 'compte_bancaire_id',
    as: 'sites'
  });

  Site.belongsTo(CompteBancaire, {
    foreignKey: 'compte_bancaire_id',
    as: 'compteBancaire'
  });

  Site.hasMany(HoraireOuverture, {
    foreignKey: 'site_id',
    as: 'horaires'
  });

  HoraireOuverture.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasMany(FermetureExceptionnelle, {
    foreignKey: 'site_id',
    as: 'fermetures'
  });

  FermetureExceptionnelle.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasOne(ParametresCalendrier, {
    foreignKey: 'site_id',
    as: 'parametresCalendrier'
  });

  ParametresCalendrier.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });
}

module.exports = setupCoreAssociations;
