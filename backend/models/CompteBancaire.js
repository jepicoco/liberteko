const { DataTypes } = require('sequelize');
const crypto = require('crypto');

// Utilise la même clé de chiffrement que les emails
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  ? Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex')
  : null;

/**
 * Chiffre une valeur sensible (IBAN, BIC)
 */
function encryptValue(value) {
  if (!value || !ENCRYPTION_KEY) return value;
  // Si déjà chiffré (contient ':'), ne pas rechiffrer
  if (value.includes(':')) return value;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffre une valeur sensible
 */
function decryptValue(encryptedValue) {
  if (!encryptedValue || !ENCRYPTION_KEY) return encryptedValue;
  // Si pas chiffré (pas de ':'), retourner tel quel
  if (!encryptedValue.includes(':')) return encryptedValue;
  try {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur déchiffrement compte bancaire:', error.message);
    return null;
  }
}

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
      type: DataTypes.STRING(255), // Taille augmentée pour données chiffrées
      allowNull: true,
      set(value) {
        // Valider le format avant chiffrement
        if (value && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i.test(value)) {
          throw new Error('Format IBAN invalide');
        }
        this.setDataValue('iban', encryptValue(value));
      },
      get() {
        const val = this.getDataValue('iban');
        return decryptValue(val);
      }
    },
    bic: {
      type: DataTypes.STRING(255), // Taille augmentée pour données chiffrées
      allowNull: true,
      set(value) {
        // Valider le format avant chiffrement
        if (value && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(value)) {
          throw new Error('Format BIC invalide');
        }
        this.setDataValue('bic', encryptValue(value));
      },
      get() {
        const val = this.getDataValue('bic');
        return decryptValue(val);
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
