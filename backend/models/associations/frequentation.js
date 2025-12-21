/**
 * Associations Frequentation
 * Questionnaires, Enregistrements, Communes, Tablettes
 */

function setupFrequentationAssociations(models) {
  const {
    Utilisateur,
    Site,
    Commune,
    CommunauteCommunes,
    CommunauteCommunesMembre,
    Structure,
    QuestionnaireFrequentation,
    QuestionnaireCommuneFavorite,
    EnregistrementFrequentation,
    ApiKey,
    ApiKeyQuestionnaire,
    TabletPairingToken
  } = models;

  // ========================================
  // QuestionnaireFrequentation <-> Site
  // ========================================

  QuestionnaireFrequentation.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasMany(QuestionnaireFrequentation, {
    foreignKey: 'site_id',
    as: 'questionnairesFrequentation'
  });

  // ========================================
  // QuestionnaireFrequentation <-> Utilisateur (createur)
  // ========================================

  QuestionnaireFrequentation.belongsTo(Utilisateur, {
    foreignKey: 'cree_par',
    as: 'createur'
  });

  Utilisateur.hasMany(QuestionnaireFrequentation, {
    foreignKey: 'cree_par',
    as: 'questionnairesCreees'
  });

  // ========================================
  // QuestionnaireCommuneFavorite
  // ========================================

  QuestionnaireCommuneFavorite.belongsTo(QuestionnaireFrequentation, {
    foreignKey: 'questionnaire_id',
    as: 'questionnaire'
  });

  QuestionnaireFrequentation.hasMany(QuestionnaireCommuneFavorite, {
    foreignKey: 'questionnaire_id',
    as: 'communesFavorites'
  });

  QuestionnaireCommuneFavorite.belongsTo(Commune, {
    foreignKey: 'commune_id',
    as: 'commune'
  });

  Commune.hasMany(QuestionnaireCommuneFavorite, {
    foreignKey: 'commune_id',
    as: 'favoritesDans'
  });

  // ========================================
  // EnregistrementFrequentation
  // ========================================

  EnregistrementFrequentation.belongsTo(QuestionnaireFrequentation, {
    foreignKey: 'questionnaire_id',
    as: 'questionnaire'
  });

  QuestionnaireFrequentation.hasMany(EnregistrementFrequentation, {
    foreignKey: 'questionnaire_id',
    as: 'enregistrements'
  });

  EnregistrementFrequentation.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasMany(EnregistrementFrequentation, {
    foreignKey: 'site_id',
    as: 'enregistrementsFrequentation'
  });

  EnregistrementFrequentation.belongsTo(ApiKey, {
    foreignKey: 'api_key_id',
    as: 'tablette'
  });

  ApiKey.hasMany(EnregistrementFrequentation, {
    foreignKey: 'api_key_id',
    as: 'enregistrementsFrequentation'
  });

  EnregistrementFrequentation.belongsTo(Commune, {
    foreignKey: 'commune_id',
    as: 'commune'
  });

  Commune.hasMany(EnregistrementFrequentation, {
    foreignKey: 'commune_id',
    as: 'enregistrements'
  });

  // ========================================
  // ApiKeyQuestionnaire
  // ========================================

  ApiKeyQuestionnaire.belongsTo(ApiKey, {
    foreignKey: 'api_key_id',
    as: 'apiKey'
  });

  ApiKey.hasMany(ApiKeyQuestionnaire, {
    foreignKey: 'api_key_id',
    as: 'questionnairesLies'
  });

  ApiKeyQuestionnaire.belongsTo(QuestionnaireFrequentation, {
    foreignKey: 'questionnaire_id',
    as: 'questionnaire'
  });

  QuestionnaireFrequentation.hasMany(ApiKeyQuestionnaire, {
    foreignKey: 'questionnaire_id',
    as: 'tablettesLiees'
  });

  ApiKeyQuestionnaire.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  Site.hasMany(ApiKeyQuestionnaire, {
    foreignKey: 'site_id',
    as: 'tablettesFrequentation'
  });

  // ========================================
  // TabletPairingToken
  // ========================================

  TabletPairingToken.belongsTo(QuestionnaireFrequentation, {
    foreignKey: 'questionnaire_id',
    as: 'questionnaire'
  });

  QuestionnaireFrequentation.hasMany(TabletPairingToken, {
    foreignKey: 'questionnaire_id',
    as: 'pairingTokens'
  });

  TabletPairingToken.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
  });

  TabletPairingToken.belongsTo(ApiKey, {
    foreignKey: 'api_key_id',
    as: 'apiKey'
  });

  // ========================================
  // CommunauteCommunes <-> Structure
  // ========================================

  if (CommunauteCommunes && Structure) {
    CommunauteCommunes.belongsTo(Structure, {
      foreignKey: 'structure_id',
      as: 'structure'
    });

    Structure.hasMany(CommunauteCommunes, {
      foreignKey: 'structure_id',
      as: 'communautesCommunes'
    });
  }

  // ========================================
  // CommunauteCommunes <-> Communes (Many-to-Many)
  // ========================================

  if (CommunauteCommunes && CommunauteCommunesMembre && Commune) {
    CommunauteCommunes.hasMany(CommunauteCommunesMembre, {
      foreignKey: 'communaute_id',
      as: 'membres'
    });

    CommunauteCommunesMembre.belongsTo(CommunauteCommunes, {
      foreignKey: 'communaute_id',
      as: 'communaute'
    });

    CommunauteCommunesMembre.belongsTo(Commune, {
      foreignKey: 'commune_id',
      as: 'commune'
    });

    Commune.hasMany(CommunauteCommunesMembre, {
      foreignKey: 'commune_id',
      as: 'appartenances'
    });

    // Association directe Many-to-Many
    CommunauteCommunes.belongsToMany(Commune, {
      through: CommunauteCommunesMembre,
      foreignKey: 'communaute_id',
      otherKey: 'commune_id',
      as: 'communes'
    });

    Commune.belongsToMany(CommunauteCommunes, {
      through: CommunauteCommunesMembre,
      foreignKey: 'commune_id',
      otherKey: 'communaute_id',
      as: 'communautes'
    });
  }
}

module.exports = setupFrequentationAssociations;
