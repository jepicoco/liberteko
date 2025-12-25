/**
 * Contrôleur pour la gestion des caisses
 */

const CaisseService = require('../services/caisseService');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const caisseController = {
  // ============================================
  // GESTION DES CAISSES
  // ============================================

  /**
   * Liste toutes les caisses
   */
  async getCaisses(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const caisses = await CaisseService.getCaisses({ includeInactive });
      res.json(caisses);
    } catch (error) {
      logger.error('Erreur getCaisses:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Récupère une caisse par son ID
   */
  async getCaisseById(req, res) {
    try {
      const { id } = req.params;
      const caisse = await CaisseService.getCaisseById(id);

      if (!caisse) {
        return res.status(404).json({ error: 'Caisse non trouvée' });
      }

      // Récupérer la session ouverte s'il y en a une
      const sessionOuverte = await CaisseService.getSessionOuverte(id);

      res.json({
        ...caisse.toJSON(),
        session_ouverte: sessionOuverte
      });
    } catch (error) {
      logger.error('Erreur getCaisseById:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crée une nouvelle caisse
   */
  async createCaisse(req, res) {
    try {
      const caisse = await CaisseService.createCaisse(req.body);
      logger.info(`Caisse créée: ${caisse.code}`, { userId: req.user.id });
      res.status(201).json(caisse);
    } catch (error) {
      logger.error('Erreur createCaisse:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Ce code de caisse existe déjà' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Met à jour une caisse
   */
  async updateCaisse(req, res) {
    try {
      const { id } = req.params;
      const caisse = await CaisseService.updateCaisse(id, req.body);
      logger.info(`Caisse mise à jour: ${caisse.code}`, { userId: req.user.id });
      res.json(caisse);
    } catch (error) {
      logger.error('Erreur updateCaisse:', error);
      if (error.message === 'Caisse non trouvée') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Désactive une caisse (soft delete)
   */
  async deleteCaisse(req, res) {
    try {
      const { id } = req.params;

      // Vérifier qu'il n'y a pas de session ouverte
      const hasSession = await CaisseService.hasSessionOuverte(id);
      if (hasSession) {
        return res.status(400).json({ error: 'Impossible de désactiver une caisse avec une session ouverte' });
      }

      const caisse = await CaisseService.updateCaisse(id, { actif: false });
      logger.info(`Caisse désactivée: ${caisse.code}`, { userId: req.user.id });
      res.json({ message: 'Caisse désactivée', caisse });
    } catch (error) {
      logger.error('Erreur deleteCaisse:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // ============================================
  // GESTION DES SESSIONS
  // ============================================

  /**
   * Ouvre une session de caisse
   */
  async ouvrirSession(req, res) {
    try {
      const { id } = req.params;
      const { commentaire } = req.body;

      const session = await CaisseService.ouvrirSession(id, req.user.id, { commentaire });
      logger.info(`Session ouverte pour caisse ${id}`, { userId: req.user.id, sessionId: session.id });
      res.status(201).json(session);
    } catch (error) {
      logger.error('Erreur ouvrirSession:', error);
      if (error.message.includes('déjà ouverte') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Récupère la session ouverte d'une caisse
   */
  async getSessionOuverte(req, res) {
    try {
      const { id } = req.params;
      const session = await CaisseService.getSessionOuverte(id);

      if (!session) {
        return res.status(404).json({ error: 'Aucune session ouverte' });
      }

      // Récupérer les totaux
      const totaux = await CaisseService.getTotauxSession(session.id);

      res.json({
        ...session.toJSON(),
        totaux
      });
    } catch (error) {
      logger.error('Erreur getSessionOuverte:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Clôture une session
   */
  async cloturerSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { solde_cloture_reel, detail_comptage, commentaire } = req.body;

      const session = await CaisseService.cloturerSession(sessionId, req.user.id, {
        solde_cloture_reel,
        detail_comptage,
        commentaire
      });

      logger.info(`Session clôturée: ${sessionId}`, { userId: req.user.id, ecart: session.ecart });
      res.json(session);
    } catch (error) {
      logger.error('Erreur cloturerSession:', error);
      if (error.message.includes('déjà clôturée') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Annule une session
   */
  async annulerSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { motif } = req.body;

      const session = await CaisseService.annulerSession(sessionId, req.user.id, motif);
      logger.info(`Session annulée: ${sessionId}`, { userId: req.user.id, motif });
      res.json({ message: 'Session annulée', session });
    } catch (error) {
      logger.error('Erreur annulerSession:', error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Historique des sessions d'une caisse
   */
  async getHistoriqueSessions(req, res) {
    try {
      const { id } = req.params;
      const { limit = 30, offset = 0 } = req.query;

      const sessions = await CaisseService.getHistoriqueSessions(id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(sessions);
    } catch (error) {
      logger.error('Erreur getHistoriqueSessions:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Détail d'une session
   */
  async getSessionById(req, res) {
    try {
      const { sessionId } = req.params;
      const { SessionCaisse, Utilisateur, Caisse } = require('../models');

      const session = await SessionCaisse.findByPk(sessionId, {
        include: [
          { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
          { model: Utilisateur, as: 'utilisateurCloture', attributes: ['id', 'nom', 'prenom'] },
          { model: Caisse, as: 'caisse' }
        ]
      });

      if (!session) {
        return res.status(404).json({ error: 'Session non trouvée' });
      }

      // Récupérer les mouvements et totaux
      const mouvements = await CaisseService.getMouvementsSession(sessionId);
      const totaux = await CaisseService.getTotauxSession(sessionId);

      res.json({
        ...session.toJSON(),
        mouvements,
        totaux
      });
    } catch (error) {
      logger.error('Erreur getSessionById:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // ============================================
  // GESTION DES MOUVEMENTS
  // ============================================

  /**
   * Enregistre un mouvement
   */
  async enregistrerMouvement(req, res) {
    try {
      const { sessionId } = req.params;
      const mouvement = await CaisseService.enregistrerMouvement(sessionId, req.user.id, req.body);

      logger.info(`Mouvement enregistré: ${mouvement.id}`, {
        userId: req.user.id,
        type: mouvement.type_mouvement,
        montant: mouvement.montant
      });

      res.status(201).json(mouvement);
    } catch (error) {
      logger.error('Erreur enregistrerMouvement:', error);
      if (error.message.includes('fermée') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Liste les mouvements d'une session
   */
  async getMouvementsSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { includeAnnules, limit = 100, offset = 0 } = req.query;

      const mouvements = await CaisseService.getMouvementsSession(sessionId, {
        includeAnnules: includeAnnules === 'true',
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(mouvements);
    } catch (error) {
      logger.error('Erreur getMouvementsSession:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Annule un mouvement
   */
  async annulerMouvement(req, res) {
    try {
      const { mouvementId } = req.params;
      const { motif } = req.body;

      const mouvement = await CaisseService.annulerMouvement(mouvementId, req.user.id, motif);
      logger.info(`Mouvement annulé: ${mouvementId}`, { userId: req.user.id, motif });
      res.json({ message: 'Mouvement annulé', mouvement });
    } catch (error) {
      logger.error('Erreur annulerMouvement:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // ============================================
  // STATISTIQUES
  // ============================================

  /**
   * Statistiques globales
   */
  async getStatistiques(req, res) {
    try {
      const { dateDebut, dateFin, caisseId } = req.query;

      const stats = await CaisseService.getStatistiques({
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : undefined,
        caisseId: caisseId ? parseInt(caisseId) : undefined
      });

      res.json(stats);
    } catch (error) {
      logger.error('Erreur getStatistiques:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Données de référence pour les formulaires
   */
  async getReferences(req, res) {
    try {
      const { ModePaiement, Site, Utilisateur } = require('../models');

      const [modesPaiement, sites, utilisateurs, comptesBancaires] = await Promise.all([
        ModePaiement.findAll({ where: { actif: true }, order: [['nom', 'ASC']] }),
        Site.findAll({ where: { actif: true }, order: [['nom', 'ASC']] }),
        Utilisateur.findAll({
          where: { actif: true, role: ['administrateur', 'gestionnaire', 'benevole'] },
          attributes: ['id', 'nom', 'prenom'],
          order: [['nom', 'ASC']]
        }),
        CaisseService.getComptesBancaires()
      ]);

      res.json({
        modesPaiement,
        sites,
        utilisateurs,
        comptesBancaires,
        categories: [
          { code: 'cotisation', libelle: 'Cotisation' },
          { code: 'location', libelle: 'Location' },
          { code: 'retard', libelle: 'Pénalité de retard' },
          { code: 'amende', libelle: 'Amende' },
          { code: 'vente', libelle: 'Vente' },
          { code: 'don', libelle: 'Don' },
          { code: 'caution', libelle: 'Caution' },
          { code: 'remboursement_caution', libelle: 'Remboursement caution' },
          { code: 'remise_banque', libelle: 'Remise en banque' },
          { code: 'approvisionnement', libelle: 'Approvisionnement' },
          { code: 'retrait', libelle: 'Retrait' },
          { code: 'autre', libelle: 'Autre' }
        ]
      });
    } catch (error) {
      logger.error('Erreur getReferences:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // ============================================
  // REMISE EN BANQUE
  // ============================================

  /**
   * Liste les mouvements disponibles pour une remise
   */
  async getMouvementsDisponiblesPourRemise(req, res) {
    try {
      const { id } = req.params;
      const { dateDebut, dateFin } = req.query;

      const mouvements = await CaisseService.getMouvementsDisponiblesPourRemise(id, {
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : undefined
      });

      res.json(mouvements);
    } catch (error) {
      logger.error('Erreur getMouvementsDisponiblesPourRemise:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crée une remise en banque
   */
  async creerRemise(req, res) {
    try {
      const { id } = req.params;
      const { mouvementIds, compteBancaireId, commentaire } = req.body;

      const remise = await CaisseService.creerRemise(id, mouvementIds, req.user.id, {
        compteBancaireId,
        commentaire,
        structureId: req.structureId
      });

      logger.info(`Remise créée: ${remise.numero_remise}`, {
        userId: req.user.id,
        montant: remise.montant_total,
        nbMouvements: remise.nb_mouvements
      });

      res.status(201).json(remise);
    } catch (error) {
      logger.error('Erreur creerRemise:', error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Liste les remises d'une caisse
   */
  async getRemises(req, res) {
    try {
      const { id } = req.params;
      const { limit = 30, offset = 0, statut } = req.query;

      const remises = await CaisseService.getHistoriqueRemises(id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        statut
      });

      res.json(remises);
    } catch (error) {
      logger.error('Erreur getRemises:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Récupère une remise par son ID
   */
  async getRemiseById(req, res) {
    try {
      const { remiseId } = req.params;
      const remise = await CaisseService.getRemiseById(remiseId);

      if (!remise) {
        return res.status(404).json({ error: 'Remise non trouvée' });
      }

      res.json(remise);
    } catch (error) {
      logger.error('Erreur getRemiseById:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Marque une remise comme déposée
   */
  async deposerRemise(req, res) {
    try {
      const { remiseId } = req.params;
      const { date_depot, compte_bancaire_id, commentaire } = req.body;

      const remise = await CaisseService.deposerRemise(remiseId, {
        date_depot: date_depot ? new Date(date_depot) : undefined,
        compte_bancaire_id,
        commentaire
      });

      logger.info(`Remise déposée: ${remise.numero_remise}`, { userId: req.user.id });
      res.json(remise);
    } catch (error) {
      logger.error('Erreur deposerRemise:', error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Valide une remise
   */
  async validerRemise(req, res) {
    try {
      const { remiseId } = req.params;
      const { bordereau_reference } = req.body;

      const remise = await CaisseService.validerRemise(remiseId, req.user.id, bordereau_reference);

      logger.info(`Remise validée: ${remise.numero_remise}`, {
        userId: req.user.id,
        bordereauRef: bordereau_reference
      });
      res.json(remise);
    } catch (error) {
      logger.error('Erreur validerRemise:', error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Annule une remise
   */
  async annulerRemise(req, res) {
    try {
      const { remiseId } = req.params;
      const { motif } = req.body;

      const remise = await CaisseService.annulerRemise(remiseId, req.user.id, motif);

      logger.info(`Remise annulée: ${remise.numero_remise}`, { userId: req.user.id, motif });
      res.json({ message: 'Remise annulée', remise });
    } catch (error) {
      logger.error('Erreur annulerRemise:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // ============================================
  // RAPPORTS PDF
  // ============================================

  /**
   * Génère un rapport PDF de session
   */
  async genererRapportSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { SessionCaisse, Caisse, Utilisateur, MouvementCaisse, ParametresStructure } = require('../models');

      // Charger la session avec ses relations
      const session = await SessionCaisse.findByPk(sessionId, {
        include: [
          { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
          { model: Utilisateur, as: 'utilisateurCloture', attributes: ['id', 'nom', 'prenom'] },
          { model: Caisse, as: 'caisse' }
        ]
      });

      if (!session) {
        return res.status(404).json({ error: 'Session non trouvée' });
      }

      // Charger les mouvements
      const mouvements = await MouvementCaisse.findAll({
        where: { session_caisse_id: sessionId, annule: false },
        order: [['date_mouvement', 'ASC']]
      });

      // Charger les paramètres structure
      const structure = await ParametresStructure.findOne() || {};

      // Générer le PDF
      const sessionData = {
        ...session.toJSON(),
        mouvements
      };

      const { filepath, filename } = await pdfService.genererRapportSession(
        sessionData,
        session.caisse,
        structure
      );

      // Envoyer le fichier
      res.download(filepath, filename, (err) => {
        if (err) {
          logger.error('Erreur envoi PDF session:', err);
        }
        // Supprimer le fichier temporaire après envoi
        fs.unlink(filepath, () => {});
      });

    } catch (error) {
      logger.error('Erreur genererRapportSession:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = caisseController;
