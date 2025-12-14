/**
 * Contrôleur pour la gestion des factures
 */

const FactureService = require('../services/factureService');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');

const factureController = {
  /**
   * Liste les factures avec filtres
   */
  async getFactures(req, res) {
    try {
      const { utilisateur_id, statut, type, date_debut, date_fin, recherche, limit = 50, offset = 0 } = req.query;

      const result = await FactureService.getFactures({
        utilisateurId: utilisateur_id,
        statut,
        type,
        dateDebut: date_debut,
        dateFin: date_fin,
        recherche,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        factures: result.rows,
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      logger.error('Erreur getFactures:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Récupère une facture par ID
   */
  async getFactureById(req, res) {
    try {
      const { id } = req.params;
      const facture = await FactureService.getFactureById(id);

      if (!facture) {
        return res.status(404).json({ error: 'Facture non trouvée' });
      }

      res.json(facture);
    } catch (error) {
      logger.error('Erreur getFactureById:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crée une nouvelle facture
   */
  async creerFacture(req, res) {
    try {
      const facture = await FactureService.creerFacture(req.body, req.user.id);
      logger.info(`Facture créée: ${facture.numero}`, { userId: req.user.id });
      res.status(201).json(facture);
    } catch (error) {
      logger.error('Erreur creerFacture:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crée une facture depuis une cotisation
   */
  async creerDepuisCotisation(req, res) {
    try {
      const { cotisation_id } = req.body;

      if (!cotisation_id) {
        return res.status(400).json({ error: 'ID de cotisation requis' });
      }

      const facture = await FactureService.creerDepuisCotisation(cotisation_id, req.user.id);
      logger.info(`Facture créée depuis cotisation ${cotisation_id}: ${facture.numero}`, { userId: req.user.id });
      res.status(201).json(facture);
    } catch (error) {
      logger.error('Erreur creerDepuisCotisation:', error);
      if (error.message.includes('existe déjà') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Met à jour une facture
   */
  async mettreAJour(req, res) {
    try {
      const { id } = req.params;
      const facture = await FactureService.mettreAJour(id, req.body);
      logger.info(`Facture mise à jour: ${facture.numero}`, { userId: req.user.id });
      res.json(facture);
    } catch (error) {
      logger.error('Erreur mettreAJour:', error);
      if (error.message.includes('brouillon') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Ajoute une ligne à la facture
   */
  async ajouterLigne(req, res) {
    try {
      const { id } = req.params;
      const ligne = await FactureService.ajouterLigne(id, req.body);
      res.status(201).json(ligne);
    } catch (error) {
      logger.error('Erreur ajouterLigne:', error);
      if (error.message.includes('émise') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Modifie une ligne
   */
  async modifierLigne(req, res) {
    try {
      const { ligneId } = req.params;
      const ligne = await FactureService.modifierLigne(ligneId, req.body);
      res.json(ligne);
    } catch (error) {
      logger.error('Erreur modifierLigne:', error);
      if (error.message.includes('émise') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Supprime une ligne
   */
  async supprimerLigne(req, res) {
    try {
      const { ligneId } = req.params;
      await FactureService.supprimerLigne(ligneId);
      res.json({ message: 'Ligne supprimée' });
    } catch (error) {
      logger.error('Erreur supprimerLigne:', error);
      if (error.message.includes('émise') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Émet une facture
   */
  async emettre(req, res) {
    try {
      const { id } = req.params;
      const facture = await FactureService.emettre(id);
      logger.info(`Facture émise: ${facture.numero}`, { userId: req.user.id });
      res.json(facture);
    } catch (error) {
      logger.error('Erreur emettre:', error);
      if (error.message.includes('lignes') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Enregistre un règlement
   */
  async enregistrerReglement(req, res) {
    try {
      const { id } = req.params;
      const reglement = await FactureService.enregistrerReglement(id, req.body, req.user.id);
      logger.info(`Règlement enregistré pour facture ${id}`, { userId: req.user.id, montant: req.body.montant });
      res.status(201).json(reglement);
    } catch (error) {
      logger.error('Erreur enregistrerReglement:', error);
      if (error.message.includes('brouillon') || error.message.includes('annulée') || error.message.includes('dépasse')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Annule un règlement
   */
  async annulerReglement(req, res) {
    try {
      const { reglementId } = req.params;
      const { motif } = req.body;
      const reglement = await FactureService.annulerReglement(reglementId, motif);
      logger.info(`Règlement annulé: ${reglementId}`, { userId: req.user.id, motif });
      res.json(reglement);
    } catch (error) {
      logger.error('Erreur annulerReglement:', error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Annule une facture
   */
  async annuler(req, res) {
    try {
      const { id } = req.params;
      const facture = await FactureService.annuler(id);
      logger.info(`Facture annulée: ${facture.numero}`, { userId: req.user.id });
      res.json(facture);
    } catch (error) {
      logger.error('Erreur annuler:', error);
      if (error.message.includes('règlements') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crée un avoir
   */
  async creerAvoir(req, res) {
    try {
      const { id } = req.params;
      const avoir = await FactureService.creerAvoir(id, req.body, req.user.id);
      logger.info(`Avoir créé: ${avoir.numero} pour facture ${id}`, { userId: req.user.id });
      res.status(201).json(avoir);
    } catch (error) {
      logger.error('Erreur creerAvoir:', error);
      if (error.message.includes('facture') || error.message.includes('non trouvée')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Statistiques de facturation
   */
  async getStatistiques(req, res) {
    try {
      const { date_debut, date_fin, exercice } = req.query;
      const stats = await FactureService.getStatistiques({
        dateDebut: date_debut,
        dateFin: date_fin,
        exercice: exercice ? parseInt(exercice) : undefined
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
      const { ModePaiement, TauxTVA, CompteBancaire } = require('../models');

      const [modesPaiement, tauxTVA, comptesBancaires] = await Promise.all([
        ModePaiement.findAll({ where: { actif: true }, order: [['nom', 'ASC']] }),
        TauxTVA.findAll({ where: { actif: true }, order: [['taux', 'ASC']] }),
        CompteBancaire.findAll({ where: { actif: true }, order: [['nom', 'ASC']] })
      ]);

      res.json({
        modesPaiement,
        tauxTVA,
        comptesBancaires
      });
    } catch (error) {
      logger.error('Erreur getReferences:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Génère et télécharge le PDF d'une facture
   */
  async telechargerPDF(req, res) {
    try {
      const { id } = req.params;
      const { ParametresStructure } = require('../models');

      // Récupérer la facture complète
      const facture = await FactureService.getFactureById(id);
      if (!facture) {
        return res.status(404).json({ error: 'Facture non trouvée' });
      }

      // Récupérer les paramètres de la structure
      const structure = await ParametresStructure.findOne() || {};

      // Générer le PDF
      const pdfBuffer = await pdfService.genererFacturePDF(facture, structure);

      // Définir les headers pour le téléchargement
      const typeDoc = facture.type_document === 'avoir' ? 'Avoir' : 'Facture';
      const filename = `${typeDoc}_${facture.numero.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      logger.info(`PDF facture téléchargé: ${facture.numero}`, { userId: req.user.id });
    } catch (error) {
      logger.error('Erreur telechargerPDF:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = factureController;
