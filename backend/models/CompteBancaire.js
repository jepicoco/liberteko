const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompteBancaire = sequelize.define('CompteBancaire', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ex: Compte principal, Compte événementiel'
    },
    titulaire: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom du titulaire du compte'
    },
    banque: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nom de la banque'
    },
    iban: {
      type: DataTypes.STRING(34),
      allowNull: true,
      validate: {
        is: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i
      }
    },
    bic: {
      type: DataTypes.STRING(11),
      allowNull: true,
      validate: {
        is: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i
      }
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Compte par défaut pour les nouvelles opérations'
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
    tableName: 'comptes_bancaires',
    timestamps: false,
    hooks: {
      beforeUpdate: (compteBancaire) => {
        compteBancaire.updated_at = new Date();
      },
      // S'assurer qu'il n'y a qu'un seul compte par défaut
      afterSave: async (compteBancaire, options) => {
        if (compteBancaire.par_defaut) {
          await sequelize.models.CompteBancaire.update(
            { par_defaut: false },
            {
              where: {
                id: { [sequelize.Sequelize.Op.ne]: compteBancaire.id },
                par_defaut: true
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  // Instance methods
  CompteBancaire.prototype.getIbanFormate = function() {
    if (!this.iban) return null;
    // Format IBAN par groupes de 4 caractères
    return this.iban.replace(/(.{4})/g, '$1 ').trim();
  };

  return CompteBancaire;
};
