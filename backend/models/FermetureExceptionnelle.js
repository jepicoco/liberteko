const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FermetureExceptionnelle = sequelize.define('FermetureExceptionnelle', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      comment: 'NULL = fermeture pour tous les sites'
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    motif: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ex: Jour férié, Vacances été, Travaux'
    },
    type: {
      type: DataTypes.ENUM('ponctuel', 'ferie', 'vacances', 'autre'),
      allowNull: false,
      defaultValue: 'ponctuel',
      comment: 'Type de fermeture pour filtrage et statistiques'
    },
    recurrent_annuel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true = se répète chaque année (ex: 25 décembre)'
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
    tableName: 'fermetures_exceptionnelles',
    timestamps: false,
    hooks: {
      beforeUpdate: (fermeture) => {
        fermeture.updated_at = new Date();
      },
      // S'assurer que date_fin >= date_debut
      beforeValidate: (fermeture) => {
        if (fermeture.date_fin < fermeture.date_debut) {
          throw new Error('La date de fin doit être postérieure ou égale à la date de début');
        }
      }
    },
    indexes: [
      {
        fields: ['site_id']
      },
      {
        fields: ['date_debut', 'date_fin']
      },
      {
        fields: ['type']
      }
    ]
  });

  // Types de fermeture
  FermetureExceptionnelle.TYPES = {
    PONCTUEL: 'ponctuel',
    FERIE: 'ferie',
    VACANCES: 'vacances',
    AUTRE: 'autre'
  };

  FermetureExceptionnelle.TYPES_LABELS = {
    'ponctuel': 'Fermeture ponctuelle',
    'ferie': 'Jour férié',
    'vacances': 'Vacances',
    'autre': 'Autre'
  };

  // Instance methods
  FermetureExceptionnelle.prototype.getTypeLabel = function() {
    return FermetureExceptionnelle.TYPES_LABELS[this.type] || this.type;
  };

  FermetureExceptionnelle.prototype.getDuree = function() {
    const debut = new Date(this.date_debut);
    const fin = new Date(this.date_fin);
    const diffTime = Math.abs(fin - debut);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  FermetureExceptionnelle.prototype.estJourUnique = function() {
    return this.date_debut === this.date_fin;
  };

  // Vérifie si une date donnée est concernée par cette fermeture
  FermetureExceptionnelle.prototype.concerneDate = function(date) {
    const dateStr = date instanceof Date
      ? date.toISOString().substring(0, 10)
      : date;

    if (this.recurrent_annuel) {
      // Pour les fermetures récurrentes, on compare mois et jour seulement
      const moisJour = dateStr.substring(5); // 'MM-DD'
      const debutMoisJour = this.date_debut.substring(5);
      const finMoisJour = this.date_fin.substring(5);
      return moisJour >= debutMoisJour && moisJour <= finMoisJour;
    } else {
      return dateStr >= this.date_debut && dateStr <= this.date_fin;
    }
  };

  // Vérifie si la fermeture concerne un site donné
  FermetureExceptionnelle.prototype.concerneSite = function(siteId) {
    // Si site_id est null, concerne tous les sites
    return this.site_id === null || this.site_id === siteId;
  };

  // Class methods
  FermetureExceptionnelle.trouverPourDate = async function(date, siteId = null) {
    const dateStr = date instanceof Date
      ? date.toISOString().substring(0, 10)
      : date;

    const where = {
      date_debut: { [sequelize.Sequelize.Op.lte]: dateStr },
      date_fin: { [sequelize.Sequelize.Op.gte]: dateStr }
    };

    if (siteId !== null) {
      where[sequelize.Sequelize.Op.or] = [
        { site_id: null },
        { site_id: siteId }
      ];
    }

    return await this.findAll({ where });
  };

  return FermetureExceptionnelle;
};
