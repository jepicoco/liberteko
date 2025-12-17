/**
 * Controller pour la validation de charte usager
 * Flow public: affichage, lecture, OTP, confirmation
 */

const charteValidationService = require('../services/charteValidationService');
const logger = require('../utils/logger');

const charteValidationController = {
  /**
   * GET /api/charte/valider/:token
   * Affiche la charte associee au token
   */
  async getCharte(req, res) {
    try {
      const { token } = req.params;

      const result = await charteValidationService.verifierToken(token);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      const { validation, charte } = result;

      // Recuperer les canaux OTP disponibles
      const canauxResult = await charteValidationService.getCanauxDisponibles(validation.utilisateur_id);

      res.json({
        charte: {
          id: charte.id,
          titre: charte.titre,
          contenu: charte.contenu,
          version: charte.version,
          date_publication: charte.date_publication
        },
        validation: {
          id: validation.id,
          statut: validation.statut,
          date_lecture: validation.date_lecture,
          date_fin_grace: validation.date_fin_grace
        },
        canaux: canauxResult.canaux,
        preference: canauxResult.preference,
        choixUsager: canauxResult.choixUsager
      });
    } catch (error) {
      logger.error('Erreur getCharte validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/charte/valider/:token/lue
   * Marque la charte comme lue
   */
  async marquerLue(req, res) {
    try {
      const { token } = req.params;

      const result = await charteValidationService.marquerCommeLue(token);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        statut: result.validation.statut,
        date_lecture: result.validation.date_lecture
      });
    } catch (error) {
      logger.error('Erreur marquerLue validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/charte/valider/:token/otp
   * Demande l'envoi d'un code OTP
   */
  async demanderOTP(req, res) {
    try {
      const { token } = req.params;
      const { canal } = req.body;

      if (!canal || !['email', 'sms'].includes(canal)) {
        return res.status(400).json({ error: 'Canal invalide. Utilisez "email" ou "sms"' });
      }

      const result = await charteValidationService.demanderOTP(token, canal);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: `Code envoye par ${canal}`,
        canal: result.canal
      });
    } catch (error) {
      logger.error('Erreur demanderOTP validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/charte/valider/:token/confirmer
   * Valide le code OTP et finalise la validation
   */
  async confirmerOTP(req, res) {
    try {
      const { token } = req.params;
      const { code } = req.body;

      if (!code || code.length !== 6) {
        return res.status(400).json({ error: 'Code invalide. Le code doit contenir 6 chiffres' });
      }

      // Recuperer l'IP et le user agent
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                 req.headers['x-real-ip'] ||
                 req.connection?.remoteAddress ||
                 req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await charteValidationService.validerOTP(token, code, ip, userAgent);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: 'Charte validee avec succes',
        success: true
      });
    } catch (error) {
      logger.error('Erreur confirmerOTP validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * GET /api/usager/charte/statut
   * Recupere le statut de validation pour l'utilisateur connecte
   */
  async getStatut(req, res) {
    try {
      const utilisateurId = req.user?.id;

      if (!utilisateurId) {
        return res.status(401).json({ error: 'Non authentifie' });
      }

      const statut = await charteValidationService.getStatutValidation(utilisateurId);
      res.json(statut);
    } catch (error) {
      logger.error('Erreur getStatut validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * GET /api/usager/charte/canaux
   * Recupere les canaux OTP disponibles pour l'utilisateur connecte
   */
  async getCanaux(req, res) {
    try {
      const utilisateurId = req.user?.id;

      if (!utilisateurId) {
        return res.status(401).json({ error: 'Non authentifie' });
      }

      const result = await charteValidationService.getCanauxDisponibles(utilisateurId);
      res.json(result);
    } catch (error) {
      logger.error('Erreur getCanaux validation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/usager/charte/initier
   * Initie une nouvelle validation pour l'utilisateur connecte
   * (si necessaire suite a nouvelle version de charte)
   */
  async initierValidation(req, res) {
    try {
      const utilisateurId = req.user?.id;

      if (!utilisateurId) {
        return res.status(401).json({ error: 'Non authentifie' });
      }

      // Verifier si une validation est necessaire
      const necessaire = await charteValidationService.verifierRevalidationNecessaire(utilisateurId);
      if (!necessaire) {
        return res.status(400).json({ error: 'Aucune validation necessaire' });
      }

      const result = await charteValidationService.initierValidation(utilisateurId, null);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: 'Validation initiee',
        lien_validation: `${process.env.APP_URL || ''}/usager/charte.html?token=${result.token}`
      });
    } catch (error) {
      logger.error('Erreur initierValidation', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

module.exports = charteValidationController;
