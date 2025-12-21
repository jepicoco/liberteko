/**
 * Associations Caisse et Factures
 * Caisse, Sessions, Mouvements, Factures, Lignes, Reglements
 */

function setupCaisseFacturesAssociations(models) {
  const {
    Utilisateur,
    Cotisation,
    Emprunt,
    EcritureComptable,
    ModePaiement,
    CompteBancaire,
    SectionAnalytique,
    Site,
    Caisse,
    SessionCaisse,
    MouvementCaisse,
    Facture,
    LigneFacture,
    ReglementFacture
  } = models;

  // ========================================
  // CAISSE
  // ========================================

  // Caisse <-> Site
  Caisse.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasMany(Caisse, {
    foreignKey: 'site_id',
    as: 'caisses'
  });

  // Caisse <-> Utilisateur (responsable)
  Caisse.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_responsable_id',
    as: 'responsable'
  });

  Utilisateur.hasMany(Caisse, {
    foreignKey: 'utilisateur_responsable_id',
    as: 'caissesResponsable'
  });

  // Caisse <-> SessionCaisse
  Caisse.hasMany(SessionCaisse, {
    foreignKey: 'caisse_id',
    as: 'sessions'
  });

  SessionCaisse.belongsTo(Caisse, {
    foreignKey: 'caisse_id',
    as: 'caisse'
  });

  // SessionCaisse <-> Utilisateur (ouverture)
  SessionCaisse.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  Utilisateur.hasMany(SessionCaisse, {
    foreignKey: 'utilisateur_id',
    as: 'sessionsOuvertes'
  });

  // SessionCaisse <-> Utilisateur (cloture)
  SessionCaisse.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_cloture_id',
    as: 'utilisateurCloture'
  });

  Utilisateur.hasMany(SessionCaisse, {
    foreignKey: 'utilisateur_cloture_id',
    as: 'sessionsCloturees'
  });

  // SessionCaisse <-> MouvementCaisse
  SessionCaisse.hasMany(MouvementCaisse, {
    foreignKey: 'session_caisse_id',
    as: 'mouvements'
  });

  MouvementCaisse.belongsTo(SessionCaisse, {
    foreignKey: 'session_caisse_id',
    as: 'session'
  });

  // MouvementCaisse <-> Utilisateur (adherent)
  MouvementCaisse.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  Utilisateur.hasMany(MouvementCaisse, {
    foreignKey: 'utilisateur_id',
    as: 'mouvementsCaisse'
  });

  // MouvementCaisse <-> Utilisateur (operateur)
  MouvementCaisse.belongsTo(Utilisateur, {
    foreignKey: 'operateur_id',
    as: 'operateur'
  });

  Utilisateur.hasMany(MouvementCaisse, {
    foreignKey: 'operateur_id',
    as: 'mouvementsOperes'
  });

  // MouvementCaisse <-> Cotisation
  MouvementCaisse.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });

  Cotisation.hasMany(MouvementCaisse, {
    foreignKey: 'cotisation_id',
    as: 'mouvementsCaisse'
  });

  // MouvementCaisse <-> Emprunt
  MouvementCaisse.belongsTo(Emprunt, {
    foreignKey: 'emprunt_id',
    as: 'emprunt'
  });

  Emprunt.hasMany(MouvementCaisse, {
    foreignKey: 'emprunt_id',
    as: 'mouvementsCaisse'
  });

  // MouvementCaisse <-> EcritureComptable
  MouvementCaisse.belongsTo(EcritureComptable, {
    foreignKey: 'ecriture_comptable_id',
    as: 'ecritureComptable'
  });

  EcritureComptable.hasMany(MouvementCaisse, {
    foreignKey: 'ecriture_comptable_id',
    as: 'mouvementsCaisse'
  });

  // ========================================
  // FACTURES
  // ========================================

  // Facture <-> Utilisateur (client)
  Facture.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'client'
  });

  Utilisateur.hasMany(Facture, {
    foreignKey: 'utilisateur_id',
    as: 'factures'
  });

  // Facture <-> Utilisateur (createur)
  Facture.belongsTo(Utilisateur, {
    foreignKey: 'cree_par_id',
    as: 'createur'
  });

  // Facture <-> Cotisation
  Facture.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });

  Cotisation.hasOne(Facture, {
    foreignKey: 'cotisation_id',
    as: 'facture'
  });

  // Facture <-> Facture (avoir -> facture origine)
  Facture.belongsTo(Facture, {
    foreignKey: 'facture_avoir_reference_id',
    as: 'factureOrigine'
  });

  Facture.hasMany(Facture, {
    foreignKey: 'facture_avoir_reference_id',
    as: 'avoirs'
  });

  // Facture <-> EcritureComptable
  Facture.belongsTo(EcritureComptable, {
    foreignKey: 'ecriture_comptable_id',
    as: 'ecritureComptable'
  });

  EcritureComptable.hasMany(Facture, {
    foreignKey: 'ecriture_comptable_id',
    as: 'factures'
  });

  // Facture <-> LigneFacture
  Facture.hasMany(LigneFacture, {
    foreignKey: 'facture_id',
    as: 'lignes'
  });

  LigneFacture.belongsTo(Facture, {
    foreignKey: 'facture_id',
    as: 'facture'
  });

  // LigneFacture <-> SectionAnalytique
  LigneFacture.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'sectionAnalytique'
  });

  SectionAnalytique.hasMany(LigneFacture, {
    foreignKey: 'section_analytique_id',
    as: 'lignesFacture'
  });

  // LigneFacture <-> Cotisation
  LigneFacture.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });

  // ========================================
  // REGLEMENTS FACTURES
  // ========================================

  Facture.hasMany(ReglementFacture, {
    foreignKey: 'facture_id',
    as: 'reglements'
  });

  ReglementFacture.belongsTo(Facture, {
    foreignKey: 'facture_id',
    as: 'facture'
  });

  ReglementFacture.belongsTo(ModePaiement, {
    foreignKey: 'mode_paiement_id',
    as: 'modePaiement'
  });

  ReglementFacture.belongsTo(MouvementCaisse, {
    foreignKey: 'mouvement_caisse_id',
    as: 'mouvementCaisse'
  });

  MouvementCaisse.hasOne(ReglementFacture, {
    foreignKey: 'mouvement_caisse_id',
    as: 'reglementFacture'
  });

  ReglementFacture.belongsTo(CompteBancaire, {
    foreignKey: 'compte_bancaire_id',
    as: 'compteBancaire'
  });

  ReglementFacture.belongsTo(Utilisateur, {
    foreignKey: 'enregistre_par_id',
    as: 'enregistrePar'
  });
}

module.exports = setupCaisseFacturesAssociations;
