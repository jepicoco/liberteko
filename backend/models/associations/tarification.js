/**
 * Associations Tarification Avancee
 * TypeTarif, TarifTypeTarif, QF, Reductions, Historique
 */

function setupTarificationAssociations(models) {
  const {
    Utilisateur,
    Cotisation,
    Commune,
    TarifCotisation,
    TypeTarif,
    TarifTypeTarif,
    ConfigurationQuotientFamilial,
    TrancheQuotientFamilial,
    TrancheQFValeur,
    RegleReduction,
    HistoriqueQuotientFamilial,
    CotisationReduction,
    SectionAnalytique,
    RegroupementAnalytique,
    Structure,
    // Arbre de Decision
    TypeConditionTarif,
    OperationComptableReduction,
    ArbreDecision
  } = models;

  // ========================================
  // Structure <-> TarifCotisation
  // ========================================

  Structure.hasMany(TarifCotisation, {
    foreignKey: 'structure_id',
    as: 'tarifsCotisation'
  });

  TarifCotisation.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // TypeTarif associations
  // ========================================

  TarifCotisation.belongsTo(TypeTarif, {
    foreignKey: 'type_tarif_id',
    as: 'typeTarif'
  });

  TypeTarif.hasMany(TarifCotisation, {
    foreignKey: 'type_tarif_id',
    as: 'tarifsCotisation'
  });

  TypeTarif.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // TarifTypeTarif (liaison Many-to-Many avec montant)
  // ========================================

  TarifTypeTarif.belongsTo(TarifCotisation, {
    foreignKey: 'tarif_cotisation_id',
    as: 'tarifCotisation'
  });

  TarifTypeTarif.belongsTo(TypeTarif, {
    foreignKey: 'type_tarif_id',
    as: 'typeTarif'
  });

  TarifCotisation.hasMany(TarifTypeTarif, {
    foreignKey: 'tarif_cotisation_id',
    as: 'montantsParType'
  });

  TypeTarif.hasMany(TarifTypeTarif, {
    foreignKey: 'type_tarif_id',
    as: 'montantsDansTarifs'
  });

  // ========================================
  // ConfigurationQuotientFamilial
  // ========================================

  ConfigurationQuotientFamilial.hasMany(TrancheQuotientFamilial, {
    foreignKey: 'configuration_qf_id',
    as: 'tranches'
  });

  TrancheQuotientFamilial.belongsTo(ConfigurationQuotientFamilial, {
    foreignKey: 'configuration_qf_id',
    as: 'configuration'
  });

  ConfigurationQuotientFamilial.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // TrancheQFValeur (valeurs QF par type de tarif)
  // ========================================

  TrancheQFValeur.belongsTo(TrancheQuotientFamilial, {
    foreignKey: 'tranche_qf_id',
    as: 'tranche'
  });

  TrancheQFValeur.belongsTo(TypeTarif, {
    foreignKey: 'type_tarif_id',
    as: 'typeTarif'
  });

  TrancheQuotientFamilial.hasMany(TrancheQFValeur, {
    foreignKey: 'tranche_qf_id',
    as: 'valeursParType'
  });

  TypeTarif.hasMany(TrancheQFValeur, {
    foreignKey: 'type_tarif_id',
    as: 'valeursQF'
  });

  // ========================================
  // RegleReduction
  // ========================================

  RegleReduction.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  RegleReduction.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'sectionAnalytique'
  });

  RegleReduction.belongsTo(RegroupementAnalytique, {
    foreignKey: 'regroupement_analytique_id',
    as: 'regroupementAnalytique'
  });

  // ========================================
  // HistoriqueQuotientFamilial
  // ========================================

  Utilisateur.hasMany(HistoriqueQuotientFamilial, {
    foreignKey: 'utilisateur_id',
    as: 'historiqueQF'
  });

  HistoriqueQuotientFamilial.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  HistoriqueQuotientFamilial.belongsTo(Utilisateur, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  // ========================================
  // CotisationReduction
  // ========================================

  Cotisation.hasMany(CotisationReduction, {
    foreignKey: 'cotisation_id',
    as: 'reductions'
  });

  CotisationReduction.belongsTo(Cotisation, {
    foreignKey: 'cotisation_id',
    as: 'cotisation'
  });

  CotisationReduction.belongsTo(RegleReduction, {
    foreignKey: 'regle_reduction_id',
    as: 'regle'
  });

  CotisationReduction.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'sectionAnalytique'
  });

  CotisationReduction.belongsTo(RegroupementAnalytique, {
    foreignKey: 'regroupement_analytique_id',
    as: 'regroupementAnalytique'
  });

  // ========================================
  // Cotisation liens additionnels
  // ========================================

  Cotisation.belongsTo(HistoriqueQuotientFamilial, {
    foreignKey: 'historique_qf_id',
    as: 'historiqueQF'
  });

  Cotisation.belongsTo(TrancheQuotientFamilial, {
    foreignKey: 'tranche_qf_id',
    as: 'trancheQF'
  });

  Cotisation.belongsTo(Commune, {
    foreignKey: 'commune_id_snapshot',
    as: 'communeSnapshot'
  });

  Cotisation.belongsTo(TypeTarif, {
    foreignKey: 'type_tarif_id',
    as: 'typeTarif'
  });

  // ========================================
  // ArbreDecision (Arbre de decision tarifaire)
  // ========================================

  if (ArbreDecision) {
    TarifCotisation.hasOne(ArbreDecision, {
      foreignKey: 'tarif_cotisation_id',
      as: 'arbreDecision'
    });

    ArbreDecision.belongsTo(TarifCotisation, {
      foreignKey: 'tarif_cotisation_id',
      as: 'tarifCotisation'
    });

    ArbreDecision.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });
  }

  // ========================================
  // OperationComptableReduction
  // ========================================

  if (OperationComptableReduction) {
    OperationComptableReduction.belongsTo(SectionAnalytique, {
      foreignKey: 'section_analytique_id',
      as: 'sectionAnalytique'
    });

    OperationComptableReduction.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });

    // CotisationReduction -> OperationComptableReduction
    CotisationReduction.belongsTo(OperationComptableReduction, {
      foreignKey: 'operation_id',
      as: 'operationComptable'
    });

    OperationComptableReduction.hasMany(CotisationReduction, {
      foreignKey: 'operation_id',
      as: 'reductionsAppliquees'
    });
  }

  // ========================================
  // Cotisation -> ArbreDecision (trace)
  // ========================================

  if (ArbreDecision) {
    Cotisation.belongsTo(ArbreDecision, {
      foreignKey: 'arbre_decision_id',
      as: 'arbreDecisionUtilise',
      constraints: false // Optionnel, pas de FK stricte
    });
  }
}

module.exports = setupTarificationAssociations;
