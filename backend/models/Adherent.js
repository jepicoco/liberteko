const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const Adherent = sequelize.define('Adherent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      comment: 'Format: ADH00000001'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/
      }
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_fin_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif', 'suspendu'),
      allowNull: false,
      defaultValue: 'actif'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL ou chemin vers la photo'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adhesion_association: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Adhérent est-il membre de l\'association (pour réduction cotisation)'
    },
    role: {
      type: DataTypes.ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur'),
      allowNull: false,
      defaultValue: 'usager',
      comment: 'Rôle de l\'utilisateur dans le système'
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Token de reinitialisation de mot de passe'
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date expiration du token reset'
    },
    password_created: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Mot de passe deja cree par usager'
    }
  }, {
    tableName: 'adherents',
    timestamps: false,
    hooks: {
      beforeCreate: async (adherent) => {
        if (adherent.password) {
          const salt = await bcrypt.genSalt(10);
          adherent.password = await bcrypt.hash(adherent.password, salt);
        }
        // Generate code_barre after creation (will be updated in afterCreate)
      },
      afterCreate: async (adherent) => {
        // Generate barcode: ADH + 8-digit padded ID
        if (!adherent.code_barre) {
          const paddedId = String(adherent.id).padStart(8, '0');
          adherent.code_barre = `ADH${paddedId}`;
          // Use update without hooks to avoid re-hashing password
          await adherent.update({ code_barre: adherent.code_barre }, { hooks: false });
        }
      },
      beforeUpdate: async (adherent) => {
        if (adherent.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          adherent.password = await bcrypt.hash(adherent.password, salt);
        }
      }
    }
  });

  // Instance methods
  Adherent.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  Adherent.prototype.generateAuthToken = function() {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        statut: this.statut
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  };

  Adherent.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.password_reset_token;
    delete values.password_reset_expires;
    return values;
  };

  // Genere un token de reset password valide 24h
  Adherent.prototype.generatePasswordResetToken = async function() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    this.password_reset_token = hashedToken;
    this.password_reset_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.save({ hooks: false });

    return token; // Retourne le token non-hashe pour l'email
  };

  // Verifie si le token de reset est valide
  Adherent.findByResetToken = async function(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return await this.findOne({
      where: {
        password_reset_token: hashedToken,
        password_reset_expires: { [sequelize.Sequelize.Op.gt]: new Date() }
      }
    });
  };

  return Adherent;
};
