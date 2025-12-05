const sequelize = require('../config/sequelize');

// Import model definitions
const AdherentModel = require('./Adherent');
const JeuModel = require('./Jeu');
const EmpruntModel = require('./Emprunt');
const TarifCotisationModel = require('./TarifCotisation');
const CotisationModel = require('./Cotisation');
const ParametresStructureModel = require('./ParametresStructure');
const ModePaiementModel = require('./ModePaiement');
const CodeReductionModel = require('./CodeReduction');
const ConfigurationEmailModel = require('./ConfigurationEmail');
const ConfigurationSMSModel = require('./ConfigurationSMS');
const TemplateMessageModel = require('./TemplateMessage');
const EmailLogModel = require('./EmailLog');
const SmsLogModel = require('./SmsLog');
const EventTriggerModel = require('./EventTrigger');
const AdherentArchiveModel = require('./AdherentArchive');
const ArchiveAccessLogModel = require('./ArchiveAccessLog');
const CompteBancaireModel = require('./CompteBancaire');
const SiteModel = require('./Site');
const HoraireOuvertureModel = require('./HoraireOuverture');
const FermetureExceptionnelleModel = require('./FermetureExceptionnelle');
const ParametresCalendrierModel = require('./ParametresCalendrier');
const ParametresFrontModel = require('./ParametresFront');

// Initialize models
const Adherent = AdherentModel(sequelize);
const Jeu = JeuModel(sequelize);
const Emprunt = EmpruntModel(sequelize);
const TarifCotisation = TarifCotisationModel(sequelize);
const Cotisation = CotisationModel(sequelize);
const ParametresStructure = ParametresStructureModel(sequelize);
const ModePaiement = ModePaiementModel(sequelize);
const CodeReduction = CodeReductionModel(sequelize);
const ConfigurationEmail = ConfigurationEmailModel(sequelize);
const ConfigurationSMS = ConfigurationSMSModel(sequelize);
const TemplateMessage = TemplateMessageModel(sequelize);
const EmailLog = EmailLogModel(sequelize);
const SmsLog = SmsLogModel(sequelize);
const EventTrigger = EventTriggerModel(sequelize);
const AdherentArchive = AdherentArchiveModel(sequelize);
const ArchiveAccessLog = ArchiveAccessLogModel(sequelize);
const CompteBancaire = CompteBancaireModel(sequelize);
const Site = SiteModel(sequelize);
const HoraireOuverture = HoraireOuvertureModel(sequelize);
const FermetureExceptionnelle = FermetureExceptionnelleModel(sequelize);
const ParametresCalendrier = ParametresCalendrierModel(sequelize);
const ParametresFront = ParametresFrontModel(sequelize);

// Define associations
// Adherent <-> Emprunt (One-to-Many)
Adherent.hasMany(Emprunt, {
  foreignKey: 'adherent_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// Jeu <-> Emprunt (One-to-Many)
Jeu.hasMany(Emprunt, {
  foreignKey: 'jeu_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Jeu, {
  foreignKey: 'jeu_id',
  as: 'jeu'
});

// Adherent <-> Cotisation (One-to-Many)
Adherent.hasMany(Cotisation, {
  foreignKey: 'adherent_id',
  as: 'cotisations'
});

Cotisation.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// TarifCotisation <-> Cotisation (One-to-Many)
TarifCotisation.hasMany(Cotisation, {
  foreignKey: 'tarif_cotisation_id',
  as: 'cotisations'
});

Cotisation.belongsTo(TarifCotisation, {
  foreignKey: 'tarif_cotisation_id',
  as: 'tarif'
});

// CodeReduction <-> Cotisation (One-to-Many)
CodeReduction.hasMany(Cotisation, {
  foreignKey: 'code_reduction_id',
  as: 'cotisations'
});

Cotisation.belongsTo(CodeReduction, {
  foreignKey: 'code_reduction_id',
  as: 'codeReduction'
});

// Adherent <-> EmailLog (One-to-Many)
Adherent.hasMany(EmailLog, {
  foreignKey: 'adherent_id',
  as: 'emailLogs'
});

EmailLog.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// Adherent <-> SmsLog (One-to-Many)
Adherent.hasMany(SmsLog, {
  foreignKey: 'adherent_id',
  as: 'smsLogs'
});

SmsLog.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// CompteBancaire <-> Site (One-to-Many)
CompteBancaire.hasMany(Site, {
  foreignKey: 'compte_bancaire_id',
  as: 'sites'
});

Site.belongsTo(CompteBancaire, {
  foreignKey: 'compte_bancaire_id',
  as: 'compteBancaire'
});

// Site <-> HoraireOuverture (One-to-Many)
Site.hasMany(HoraireOuverture, {
  foreignKey: 'site_id',
  as: 'horaires'
});

HoraireOuverture.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Site <-> FermetureExceptionnelle (One-to-Many)
// Note: site_id peut être NULL (fermeture globale)
Site.hasMany(FermetureExceptionnelle, {
  foreignKey: 'site_id',
  as: 'fermetures'
});

FermetureExceptionnelle.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Site <-> ParametresCalendrier (One-to-One)
// Note: site_id peut être NULL (paramètres globaux)
Site.hasOne(ParametresCalendrier, {
  foreignKey: 'site_id',
  as: 'parametresCalendrier'
});

ParametresCalendrier.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  Adherent,
  Jeu,
  Emprunt,
  TarifCotisation,
  Cotisation,
  ParametresStructure,
  ModePaiement,
  CodeReduction,
  ConfigurationEmail,
  ConfigurationSMS,
  TemplateMessage,
  EmailLog,
  SmsLog,
  EventTrigger,
  AdherentArchive,
  ArchiveAccessLog,
  CompteBancaire,
  Site,
  HoraireOuverture,
  FermetureExceptionnelle,
  ParametresCalendrier,
  ParametresFront
};
