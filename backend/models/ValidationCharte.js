/**
 * Model ValidationCharte
 * Suivi des validations de charte avec OTP et audit trail
 */

const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const ValidationCharte = sequelize.define('ValidationCharte', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    charte_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    charte_version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Version de la charte au moment de la validation'
    },
    // Token pour acces au lien
    token_acces: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'Token hashe pour acces au lien de validation'
    },
    token_acces_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration du token (7 jours)'
    },
    // OTP
    code_otp: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: 'Code OTP 6 chiffres'
    },
    code_otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration du code OTP (15 min)'
    },
    canal_otp: {
      type: DataTypes.ENUM('email', 'sms'),
      allowNull: true,
      comment: 'Canal utilise pour envoyer le code'
    },
    tentatives_otp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de tentatives de saisie du code'
    },
    // Statut
    statut: {
      type: DataTypes.ENUM('en_attente', 'lue', 'otp_envoye', 'validee', 'expiree'),
      allowNull: false,
      defaultValue: 'en_attente'
    },
    // Audit trail
    date_envoi_lien: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_lecture: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_demande_otp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_validation: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ip_validation: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP de validation (IPv4 ou IPv6)'
    },
    user_agent_validation: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'User agent du navigateur'
    },
    // Lien avec cotisation
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    date_fin_grace: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fin de la periode de grace'
    }
  }, {
    tableName: 'validations_charte',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // === Constantes ===
  ValidationCharte.TOKEN_EXPIRATION_DAYS = 7;
  ValidationCharte.OTP_EXPIRATION_MINUTES = 15;
  ValidationCharte.MAX_OTP_TENTATIVES = 5;
  ValidationCharte.MAX_OTP_ENVOIS_PAR_HEURE = 3;

  // === Methodes d'instance ===

  /**
   * Genere un token d'acces unique
   * @returns {Promise<string>} Token non hashe (a envoyer par email)
   */
  ValidationCharte.prototype.genererToken = async function() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    this.token_acces = hashedToken;
    this.token_acces_expires = new Date(
      Date.now() + ValidationCharte.TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );
    this.date_envoi_lien = new Date();

    await this.save();
    return token; // Retourne le token non hashe
  };

  /**
   * Genere un code OTP 6 chiffres
   * @param {string} canal - 'email' ou 'sms'
   * @returns {Promise<string>} Code OTP
   */
  ValidationCharte.prototype.genererOTP = async function(canal) {
    // Generer un code a 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    this.code_otp = code;
    this.code_otp_expires = new Date(
      Date.now() + ValidationCharte.OTP_EXPIRATION_MINUTES * 60 * 1000
    );
    this.canal_otp = canal;
    this.date_demande_otp = new Date();
    this.statut = 'otp_envoye';
    this.tentatives_otp = 0;

    await this.save();
    return code;
  };

  /**
   * Valide le code OTP saisi
   * @param {string} code - Code saisi par l'utilisateur
   * @param {string} ip - Adresse IP
   * @param {string} userAgent - User agent du navigateur
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  ValidationCharte.prototype.validerOTP = async function(code, ip, userAgent) {
    // Verifier le nombre de tentatives
    if (this.tentatives_otp >= ValidationCharte.MAX_OTP_TENTATIVES) {
      return { success: false, error: 'Nombre maximum de tentatives atteint' };
    }

    // Incrementer les tentatives
    this.tentatives_otp += 1;
    await this.save();

    // Verifier l'expiration
    if (!this.code_otp_expires || new Date() > this.code_otp_expires) {
      this.statut = 'expiree';
      await this.save();
      return { success: false, error: 'Code expire' };
    }

    // Verifier le code
    if (this.code_otp !== code) {
      const tentativesRestantes = ValidationCharte.MAX_OTP_TENTATIVES - this.tentatives_otp;
      return {
        success: false,
        error: `Code incorrect. ${tentativesRestantes} tentative(s) restante(s)`
      };
    }

    // Validation reussie
    this.statut = 'validee';
    this.date_validation = new Date();
    this.ip_validation = ip;
    this.user_agent_validation = userAgent ? userAgent.substring(0, 500) : null;
    this.code_otp = null; // Effacer le code apres utilisation
    this.token_acces = null; // Effacer le token

    await this.save();
    return { success: true };
  };

  /**
   * Marque la charte comme lue
   */
  ValidationCharte.prototype.marquerCommeLue = async function() {
    if (this.statut === 'en_attente') {
      this.statut = 'lue';
      this.date_lecture = new Date();
      await this.save();
    }
    return this;
  };

  /**
   * Verifie si le token est valide
   */
  ValidationCharte.prototype.tokenEstValide = function() {
    if (!this.token_acces || !this.token_acces_expires) {
      return false;
    }
    return new Date() < this.token_acces_expires;
  };

  /**
   * Verifie si l'OTP peut etre renvoye
   */
  ValidationCharte.prototype.peutRenvoyerOTP = async function() {
    // Compter les envois dans la derniere heure
    const uneHeureAvant = new Date(Date.now() - 60 * 60 * 1000);

    const nbEnvois = await ValidationCharte.count({
      where: {
        utilisateur_id: this.utilisateur_id,
        date_demande_otp: { [Op.gte]: uneHeureAvant }
      }
    });

    return nbEnvois < ValidationCharte.MAX_OTP_ENVOIS_PAR_HEURE;
  };

  /**
   * Verifie si on est en periode de grace
   */
  ValidationCharte.prototype.estEnPeriodeGrace = function() {
    if (!this.date_fin_grace) {
      return false;
    }
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const finGrace = new Date(this.date_fin_grace);
    return aujourdhui <= finGrace;
  };

  /**
   * Calcule les jours restants de la periode de grace
   */
  ValidationCharte.prototype.joursGraceRestants = function() {
    if (!this.date_fin_grace) {
      return 0;
    }
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const finGrace = new Date(this.date_fin_grace);
    const diff = finGrace - aujourdhui;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // === Methodes statiques ===

  /**
   * Trouve une validation par token (non hashe)
   * @param {string} token - Token non hashe
   * @returns {Promise<ValidationCharte|null>}
   */
  ValidationCharte.findByToken = async function(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return await this.findOne({
      where: {
        token_acces: hashedToken,
        token_acces_expires: { [Op.gt]: new Date() },
        statut: { [Op.ne]: 'validee' }
      }
    });
  };

  /**
   * Trouve la derniere validation en attente pour un utilisateur
   * @param {number} utilisateurId
   * @returns {Promise<ValidationCharte|null>}
   */
  ValidationCharte.findEnAttenteForUser = async function(utilisateurId) {
    return await this.findOne({
      where: {
        utilisateur_id: utilisateurId,
        statut: { [Op.in]: ['en_attente', 'lue', 'otp_envoye'] }
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Verifie si un utilisateur est bloque (periode de grace depassee)
   * @param {number} utilisateurId
   * @returns {Promise<boolean>}
   */
  ValidationCharte.estBloquePourUser = async function(utilisateurId) {
    const validation = await this.findOne({
      where: {
        utilisateur_id: utilisateurId,
        statut: { [Op.in]: ['en_attente', 'lue', 'otp_envoye'] }
      },
      order: [['created_at', 'DESC']]
    });

    if (!validation) {
      return false;
    }

    // Si pas de date de fin de grace, pas de blocage
    if (!validation.date_fin_grace) {
      return false;
    }

    // Bloquer si on a depasse la periode de grace
    return !validation.estEnPeriodeGrace();
  };

  return ValidationCharte;
};
