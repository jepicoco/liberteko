const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresCalendrier = sequelize.define('ParametresCalendrier', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      comment: 'NULL = paramètres globaux par défaut'
    },
    pays: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'FR',
      comment: 'Code pays ISO 3166-1 alpha-2 (FR, CH, DE, BE)'
    },
    zone_vacances: {
      type: DataTypes.CHAR(1),
      allowNull: true,
      validate: {
        isIn: [['A', 'B', 'C']]
      },
      comment: 'Zone académique France: A, B ou C (null si autre pays)'
    },
    ouvert_jours_feries: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Site ouvert les jours fériés'
    },
    ouvert_vacances: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Site ouvert pendant les vacances scolaires'
    },
    horaires_vacances_identiques: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'true = mêmes horaires que période normale, false = horaires spécifiques vacances'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'parametres_calendrier',
    timestamps: false,
    hooks: {
      beforeUpdate: (parametres) => {
        parametres.updated_at = new Date();
      }
    }
  });

  // Pays supportés
  ParametresCalendrier.PAYS = {
    FRANCE: 'FR',
    SUISSE: 'CH',
    ALLEMAGNE: 'DE',
    BELGIQUE: 'BE'
  };

  ParametresCalendrier.PAYS_LABELS = {
    'FR': 'France',
    'CH': 'Suisse',
    'DE': 'Allemagne',
    'BE': 'Belgique'
  };

  // Zones académiques France
  ParametresCalendrier.ZONES_VACANCES = {
    A: 'A',
    B: 'B',
    C: 'C'
  };

  ParametresCalendrier.ZONES_DESCRIPTIONS = {
    'A': 'Zone A (Lyon, Grenoble, Clermont-Ferrand, ...)',
    'B': 'Zone B (Strasbourg, Nancy, Rennes, Nantes, ...)',
    'C': 'Zone C (Paris, Versailles, Créteil, Montpellier, Toulouse, ...)'
  };

  // Instance methods
  ParametresCalendrier.prototype.getPaysLabel = function() {
    return ParametresCalendrier.PAYS_LABELS[this.pays] || this.pays;
  };

  ParametresCalendrier.prototype.getZoneDescription = function() {
    if (!this.zone_vacances) return null;
    return ParametresCalendrier.ZONES_DESCRIPTIONS[this.zone_vacances] || `Zone ${this.zone_vacances}`;
  };

  ParametresCalendrier.prototype.supportsAutoVacances = function() {
    // Seule la France supporte l'import automatique des vacances
    return this.pays === 'FR';
  };

  // Class methods
  ParametresCalendrier.getGlobal = async function() {
    let global = await this.findOne({ where: { site_id: null } });
    if (!global) {
      // Créer les paramètres globaux par défaut
      global = await this.create({
        site_id: null,
        pays: 'FR',
        zone_vacances: 'B',
        ouvert_jours_feries: false,
        ouvert_vacances: true
      });
    }
    return global;
  };

  ParametresCalendrier.getPourSite = async function(siteId) {
    // Chercher les paramètres spécifiques au site
    let parametres = await this.findOne({ where: { site_id: siteId } });
    if (!parametres) {
      // Sinon retourner les paramètres globaux
      parametres = await this.getGlobal();
    }
    return parametres;
  };

  return ParametresCalendrier;
};
