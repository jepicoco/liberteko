const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HoraireOuverture = sequelize.define('HoraireOuverture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sites',
        key: 'id'
      }
    },
    jour_semaine: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=lundi, 1=mardi, 2=mercredi, 3=jeudi, 4=vendredi, 5=samedi, 6=dimanche'
    },
    heure_debut: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Heure d\'ouverture ex: 09:00'
    },
    heure_fin: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Heure de fermeture ex: 12:00'
    },
    recurrence: {
      type: DataTypes.ENUM('toutes', 'paires', 'impaires'),
      allowNull: false,
      defaultValue: 'toutes',
      comment: 'toutes=chaque semaine, paires=semaines paires, impaires=semaines impaires'
    },
    periode: {
      type: DataTypes.ENUM('normale', 'vacances'),
      allowNull: false,
      defaultValue: 'normale',
      comment: 'normale=hors vacances, vacances=pendant vacances scolaires'
    },
    // Pour sites mobiles : lieu spécifique par créneau
    lieu_specifique: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom du lieu pour sites mobiles ex: Salle des fêtes'
    },
    adresse_specifique: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse complète pour ce créneau (sites mobiles)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'horaires_ouverture',
    timestamps: false,
    hooks: {
      beforeUpdate: (horaire) => {
        horaire.updated_at = new Date();
      }
    },
    indexes: [
      {
        fields: ['site_id', 'jour_semaine']
      }
    ]
  });

  // Constantes pour les jours
  HoraireOuverture.JOURS = {
    LUNDI: 0,
    MARDI: 1,
    MERCREDI: 2,
    JEUDI: 3,
    VENDREDI: 4,
    SAMEDI: 5,
    DIMANCHE: 6
  };

  HoraireOuverture.JOURS_LABELS = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche'
  ];

  // Instance methods
  HoraireOuverture.prototype.getJourLabel = function() {
    return HoraireOuverture.JOURS_LABELS[this.jour_semaine] || 'Inconnu';
  };

  HoraireOuverture.prototype.getRecurrenceLabel = function() {
    const labels = {
      'toutes': 'Toutes les semaines',
      'paires': 'Semaines paires',
      'impaires': 'Semaines impaires'
    };
    return labels[this.recurrence] || this.recurrence;
  };

  HoraireOuverture.prototype.getPlageHoraire = function() {
    return `${this.heure_debut.substring(0, 5)} - ${this.heure_fin.substring(0, 5)}`;
  };

  // Vérifie si ce créneau est actif pour une date donnée
  HoraireOuverture.prototype.estActifPourDate = function(date) {
    if (!this.actif) return false;

    // Vérifier le jour de la semaine (JS: 0=dimanche, donc on ajuste)
    const jourJS = date.getDay();
    const jourSemaine = jourJS === 0 ? 6 : jourJS - 1;
    if (this.jour_semaine !== jourSemaine) return false;

    // Vérifier la récurrence paire/impaire
    if (this.recurrence !== 'toutes') {
      const numeroSemaine = getNumeroSemaine(date);
      const estPaire = numeroSemaine % 2 === 0;
      if (this.recurrence === 'paires' && !estPaire) return false;
      if (this.recurrence === 'impaires' && estPaire) return false;
    }

    return true;
  };

  // Vérifie si une heure donnée est dans ce créneau
  HoraireOuverture.prototype.contientHeure = function(heure) {
    // heure au format 'HH:MM' ou 'HH:MM:SS'
    const heureNormalisee = heure.substring(0, 5);
    const debut = this.heure_debut.substring(0, 5);
    const fin = this.heure_fin.substring(0, 5);
    return heureNormalisee >= debut && heureNormalisee < fin;
  };

  return HoraireOuverture;
};

// Helper: Calcul du numéro de semaine ISO
function getNumeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
