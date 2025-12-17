/**
 * Service de validation de charte usager
 * Gestion du flow complet: initiation, token, OTP, validation
 */

const { ValidationCharte, CharteUsager, Utilisateur, ParametresFront, Cotisation } = require('../models');
const { Op } = require('sequelize');
const eventTriggerService = require('./eventTriggerService');
const logger = require('../utils/logger');

const charteValidationService = {
  /**
   * Initie une validation de charte pour un utilisateur
   * @param {number} utilisateurId
   * @param {number|null} cotisationId - ID de la cotisation declenchante (optionnel)
   * @returns {Promise<{success: boolean, validation?: ValidationCharte, token?: string, error?: string}>}
   */
  async initierValidation(utilisateurId, cotisationId = null) {
    try {
      // Recuperer la charte active
      const charteActive = await CharteUsager.getActive();
      if (!charteActive) {
        return { success: false, error: 'Aucune charte active' };
      }

      // Recuperer l'utilisateur
      const utilisateur = await Utilisateur.findByPk(utilisateurId);
      if (!utilisateur) {
        return { success: false, error: 'Utilisateur non trouve' };
      }

      // Verifier si une validation en attente existe deja
      const validationExistante = await ValidationCharte.findEnAttenteForUser(utilisateurId);
      if (validationExistante) {
        // Regenerer un token si l'ancien a expire
        if (!validationExistante.tokenEstValide()) {
          const token = await validationExistante.genererToken();
          return { success: true, validation: validationExistante, token };
        }
        return {
          success: false,
          error: 'Une validation est deja en cours',
          validation: validationExistante
        };
      }

      // Recuperer les parametres pour la periode de grace
      const params = await ParametresFront.getParametres();
      const dateFinGrace = this.calculerDateFinGrace(new Date(), params.charte_grace_jours);

      // Creer la validation
      const validation = await ValidationCharte.create({
        utilisateur_id: utilisateurId,
        charte_id: charteActive.id,
        charte_version: charteActive.version,
        statut: 'en_attente',
        cotisation_id: cotisationId,
        date_fin_grace: dateFinGrace
      });

      // Generer le token d'acces
      const token = await validation.genererToken();

      // Declencher l'event trigger pour envoyer l'email
      try {
        await eventTriggerService.trigger('CHARTE_VALIDATION_REQUESTED', {
          utilisateur,
          charte: charteActive,
          validation,
          token,
          lien_validation: `${process.env.APP_URL || ''}/usager/charte.html?token=${token}`,
          date_fin_grace: dateFinGrace
        });
      } catch (triggerError) {
        logger.error('Erreur trigger CHARTE_VALIDATION_REQUESTED', { error: triggerError.message });
      }

      logger.info('Validation charte initiee', {
        utilisateurId,
        validationId: validation.id,
        charteVersion: charteActive.version
      });

      return { success: true, validation, token };
    } catch (error) {
      logger.error('Erreur initierValidation', { error: error.message, utilisateurId });
      return { success: false, error: error.message };
    }
  },

  /**
   * Verifie un token et retourne la validation associee
   * @param {string} token - Token non hashe
   * @returns {Promise<{success: boolean, validation?: ValidationCharte, charte?: CharteUsager, error?: string}>}
   */
  async verifierToken(token) {
    const validation = await ValidationCharte.findByToken(token);

    if (!validation) {
      return { success: false, error: 'Lien invalide ou expire' };
    }

    const charte = await CharteUsager.findByPk(validation.charte_id);
    if (!charte) {
      return { success: false, error: 'Charte non trouvee' };
    }

    return { success: true, validation, charte };
  },

  /**
   * Marque la charte comme lue
   * @param {string} token
   * @returns {Promise<{success: boolean, validation?: ValidationCharte, error?: string}>}
   */
  async marquerCommeLue(token) {
    const result = await this.verifierToken(token);
    if (!result.success) {
      return result;
    }

    await result.validation.marquerCommeLue();
    return { success: true, validation: result.validation };
  },

  /**
   * Demande l'envoi d'un code OTP
   * @param {string} token
   * @param {string} canal - 'email' ou 'sms'
   * @returns {Promise<{success: boolean, canal?: string, error?: string}>}
   */
  async demanderOTP(token, canal) {
    try {
      const result = await this.verifierToken(token);
      if (!result.success) {
        return result;
      }

      const validation = result.validation;

      // Verifier si on peut renvoyer un OTP (limite par heure)
      const peutRenvoyer = await validation.peutRenvoyerOTP();
      if (!peutRenvoyer) {
        return {
          success: false,
          error: 'Trop de codes demandes. Veuillez attendre avant de redemander.'
        };
      }

      // Verifier que le canal est autorise
      const params = await ParametresFront.getParametres();
      if (canal === 'sms' && !params.charte_otp_sms) {
        return { success: false, error: 'La validation par SMS n\'est pas activee' };
      }
      if (canal === 'email' && !params.charte_otp_email) {
        return { success: false, error: 'La validation par email n\'est pas activee' };
      }

      // Recuperer l'utilisateur
      const utilisateur = await Utilisateur.findByPk(validation.utilisateur_id);
      if (!utilisateur) {
        return { success: false, error: 'Utilisateur non trouve' };
      }

      // Verifier que le canal est possible pour cet utilisateur
      if (canal === 'sms' && !utilisateur.telephone) {
        return { success: false, error: 'Aucun numero de telephone renseigne' };
      }
      if (canal === 'email' && !utilisateur.email) {
        return { success: false, error: 'Aucune adresse email renseignee' };
      }

      // Generer le code OTP
      const code = await validation.genererOTP(canal);

      // Envoyer le code via le trigger approprie
      const triggerCode = canal === 'sms' ? 'CHARTE_OTP_SMS' : 'CHARTE_OTP_EMAIL';
      try {
        await eventTriggerService.trigger(triggerCode, {
          utilisateur,
          code_otp: code,
          validation
        });
      } catch (triggerError) {
        logger.error(`Erreur trigger ${triggerCode}`, { error: triggerError.message });
        return { success: false, error: 'Erreur lors de l\'envoi du code' };
      }

      logger.info('OTP envoye pour validation charte', {
        validationId: validation.id,
        canal,
        utilisateurId: utilisateur.id
      });

      return { success: true, canal };
    } catch (error) {
      logger.error('Erreur demanderOTP', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  /**
   * Valide le code OTP saisi
   * @param {string} token
   * @param {string} code - Code OTP saisi
   * @param {string} ip - Adresse IP du client
   * @param {string} userAgent - User agent du navigateur
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async validerOTP(token, code, ip, userAgent) {
    try {
      const result = await this.verifierToken(token);
      if (!result.success) {
        return result;
      }

      const validation = result.validation;
      const charte = result.charte;

      // Valider le code
      const validationResult = await validation.validerOTP(code, ip, userAgent);

      if (!validationResult.success) {
        return validationResult;
      }

      // Mettre a jour l'utilisateur
      const utilisateur = await Utilisateur.findByPk(validation.utilisateur_id);
      if (utilisateur) {
        await utilisateur.marquerCharteValidee(validation.charte_version);
      }

      // Incrementer le compteur de signatures sur la charte
      await charte.incrementerSignatures();

      // Declencher l'event trigger de confirmation
      try {
        await eventTriggerService.trigger('CHARTE_VALIDATED', {
          utilisateur,
          charte,
          validation
        });
      } catch (triggerError) {
        logger.error('Erreur trigger CHARTE_VALIDATED', { error: triggerError.message });
      }

      logger.info('Charte validee', {
        validationId: validation.id,
        utilisateurId: utilisateur.id,
        charteVersion: charte.version,
        ip
      });

      return { success: true };
    } catch (error) {
      logger.error('Erreur validerOTP', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  /**
   * Calcule la date de fin de periode de grace
   * @param {Date} dateDebut
   * @param {number} joursGrace
   * @returns {string} Date au format YYYY-MM-DD
   */
  calculerDateFinGrace(dateDebut, joursGrace) {
    const date = new Date(dateDebut);
    date.setDate(date.getDate() + joursGrace);
    return date.toISOString().split('T')[0];
  },

  /**
   * Verifie si un utilisateur est en periode de grace
   * @param {number} utilisateurId
   * @returns {Promise<{enGrace: boolean, joursRestants: number, validation?: ValidationCharte}>}
   */
  async estEnPeriodeGrace(utilisateurId) {
    const validation = await ValidationCharte.findEnAttenteForUser(utilisateurId);

    if (!validation) {
      return { enGrace: false, joursRestants: 0 };
    }

    const enGrace = validation.estEnPeriodeGrace();
    const joursRestants = validation.joursGraceRestants();

    return { enGrace, joursRestants, validation };
  },

  /**
   * Verifie si un utilisateur est bloque pour emprunt
   * @param {number} utilisateurId
   * @returns {Promise<boolean>}
   */
  async estBloquePourEmprunt(utilisateurId) {
    // Verifier si le systeme de charte est actif
    const params = await ParametresFront.getParametres();
    if (!params.charte_active) {
      return false;
    }

    // Verifier bypass admin
    const utilisateur = await Utilisateur.findByPk(utilisateurId);
    if (!utilisateur) {
      return false;
    }
    if (utilisateur.bypass_charte) {
      return false;
    }

    // Verifier si l'utilisateur a une validation en attente
    return await ValidationCharte.estBloquePourUser(utilisateurId);
  },

  /**
   * Verifie si une revalidation est necessaire (nouvelle version de charte)
   * @param {number} utilisateurId
   * @returns {Promise<boolean>}
   */
  async verifierRevalidationNecessaire(utilisateurId) {
    // Verifier si le systeme de charte est actif
    const params = await ParametresFront.getParametres();
    if (!params.charte_active) {
      return false;
    }

    // Recuperer la charte active
    const charteActive = await CharteUsager.getActive();
    if (!charteActive) {
      return false;
    }

    // Recuperer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(utilisateurId);
    if (!utilisateur) {
      return false;
    }

    // Verifier si une validation est deja en cours
    const validationEnCours = await ValidationCharte.findEnAttenteForUser(utilisateurId);
    if (validationEnCours) {
      return false; // Deja en cours
    }

    // Utiliser la methode du model
    return utilisateur.doitValiderCharte(charteActive.version);
  },

  /**
   * Recupere le statut de validation pour un utilisateur
   * @param {number} utilisateurId
   * @returns {Promise<Object>}
   */
  async getStatutValidation(utilisateurId) {
    const params = await ParametresFront.getParametres();

    if (!params.charte_active) {
      return {
        systemeActif: false,
        validationRequise: false
      };
    }

    const charteActive = await CharteUsager.getActive();
    if (!charteActive) {
      return {
        systemeActif: true,
        validationRequise: false,
        message: 'Aucune charte active'
      };
    }

    const utilisateur = await Utilisateur.findByPk(utilisateurId);
    if (!utilisateur) {
      return {
        systemeActif: true,
        validationRequise: false,
        error: 'Utilisateur non trouve'
      };
    }

    if (utilisateur.bypass_charte) {
      return {
        systemeActif: true,
        validationRequise: false,
        bypass: true
      };
    }

    const validationEnCours = await ValidationCharte.findEnAttenteForUser(utilisateurId);

    if (validationEnCours) {
      const enGrace = validationEnCours.estEnPeriodeGrace();
      const joursRestants = validationEnCours.joursGraceRestants();
      const bloque = !enGrace;

      return {
        systemeActif: true,
        validationRequise: true,
        enCours: true,
        statut: validationEnCours.statut,
        enGrace,
        joursRestants,
        bloque,
        dateFinGrace: validationEnCours.date_fin_grace
      };
    }

    const doitValider = utilisateur.doitValiderCharte(charteActive.version);

    return {
      systemeActif: true,
      validationRequise: doitValider,
      charteValidee: utilisateur.charte_validee,
      versionValidee: utilisateur.charte_version_validee,
      versionActive: charteActive.version,
      dateValidation: utilisateur.date_validation_charte
    };
  },

  /**
   * Recupere les canaux OTP disponibles
   * @param {number} utilisateurId
   * @returns {Promise<Object>}
   */
  async getCanauxDisponibles(utilisateurId) {
    const params = await ParametresFront.getParametres();
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    const canaux = [];

    if (params.charte_otp_email && utilisateur?.email) {
      canaux.push({
        code: 'email',
        label: 'Email',
        destination: this.masquerEmail(utilisateur.email)
      });
    }

    if (params.charte_otp_sms && utilisateur?.telephone) {
      canaux.push({
        code: 'sms',
        label: 'SMS',
        destination: this.masquerTelephone(utilisateur.telephone)
      });
    }

    return {
      canaux,
      preference: params.charte_otp_preference,
      choixUsager: params.charte_otp_preference === 'choix_usager'
    };
  },

  /**
   * Masque une adresse email pour l'affichage
   * @param {string} email
   * @returns {string}
   */
  masquerEmail(email) {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  },

  /**
   * Masque un numero de telephone pour l'affichage
   * @param {string} telephone
   * @returns {string}
   */
  masquerTelephone(telephone) {
    if (!telephone) return '';
    const digits = telephone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `***${digits.slice(-4)}`;
  }
};

module.exports = charteValidationService;
