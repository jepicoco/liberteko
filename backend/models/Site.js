const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Site = sequelize.define('Site', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code unique ex: LUDO_PRINCIPAL, BIBLIO_MOBILE'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiché ex: Ludothèque, Bibliothèque'
    },
    type: {
      type: DataTypes.ENUM('fixe', 'mobile'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'fixe = adresse permanente, mobile = lieux variables'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Adresse pour sites fixes (pour mobiles, c'est dans horaires_ouverture)
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse complète pour sites fixes'
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pays: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'FR',
      comment: 'Code pays ISO 3166-1 alpha-2 (FR, CH, DE, BE)'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    // Association au compte bancaire
    compte_bancaire_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comptes_bancaires',
        key: 'id'
      },
      comment: 'Compte bancaire associé à ce site'
    },
    // Préparation Google
    google_place_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google Place ID pour synchronisation future'
    },
    // UI
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#0d6efd',
      comment: 'Couleur pour badge UI (hex)'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'building',
      comment: 'Nom icône Bootstrap ex: building, truck, book'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
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
    tableName: 'sites',
    timestamps: false,
    hooks: {
      beforeUpdate: (site) => {
        site.updated_at = new Date();
      },
      // Générer un code automatiquement si non fourni
      beforeCreate: (site) => {
        if (!site.code) {
          const prefix = site.type === 'mobile' ? 'MOBILE' : 'SITE';
          site.code = `${prefix}_${Date.now()}`;
        }
      }
    }
  });

  // Instance methods
  Site.prototype.estFixe = function() {
    return this.type === 'fixe';
  };

  Site.prototype.estMobile = function() {
    return this.type === 'mobile';
  };

  Site.prototype.getAdresseComplete = function() {
    if (!this.adresse) return null;
    const parts = [this.adresse];
    if (this.code_postal || this.ville) {
      parts.push([this.code_postal, this.ville].filter(Boolean).join(' '));
    }
    return parts.join(', ');
  };

  return Site;
};
