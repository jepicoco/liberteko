/**
 * Routes de gestion des factures pour les usagers
 * Permet aux usagers de consulter leurs factures et reglements
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  Facture, LigneFacture, ReglementFacture,
  ModePaiement, ParametresStructure
} = require('../models');
const { authUsager } = require('../middleware/usagerAuth');
const pdfService = require('../services/pdfService');

// Toutes les routes necessitent une authentification usager
router.use(authUsager);

/**
 * @route   GET /api/usager/factures
 * @desc    Liste des factures de l'usager connecte
 * @access  Private (usager)
 * @query   ?statut=emise|reglee|annulee&page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      utilisateur_id: req.usagerId,
      statut: { [Op.ne]: 'brouillon' } // Ne pas montrer les brouillons
    };

    if (statut) {
      where.statut = statut;
    }

    const { count, rows } = await Facture.findAndCountAll({
      where,
      include: [
        {
          model: LigneFacture,
          as: 'lignes',
          attributes: ['id', 'description', 'quantite', 'prix_unitaire_ht', 'montant_ttc']
        },
        {
          model: ReglementFacture,
          as: 'reglements',
          where: { annule: false },
          required: false,
          attributes: ['id', 'date_reglement', 'montant', 'mode_paiement', 'reference']
        }
      ],
      order: [['date_emission', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const factures = rows.map(facture => {
      const json = facture.toJSON();
      return {
        id: json.id,
        numero: json.numero,
        type_document: json.type_document,
        date_emission: json.date_emission,
        date_echeance: json.date_echeance,
        montant_ht: json.montant_ht,
        montant_tva: json.montant_tva,
        montant_ttc: json.montant_ttc,
        montant_regle: json.montant_regle,
        reste_a_payer: parseFloat(json.montant_ttc) - parseFloat(json.montant_regle),
        statut: json.statut,
        nb_lignes: json.lignes.length,
        nb_reglements: json.reglements.length
      };
    });

    res.json({
      factures,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste factures usager:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation des factures'
    });
  }
});

/**
 * @route   GET /api/usager/factures/resume
 * @desc    Resume des factures (totaux, impayees)
 * @access  Private (usager)
 */
router.get('/resume', async (req, res) => {
  try {
    const factures = await Facture.findAll({
      where: {
        utilisateur_id: req.usagerId,
        statut: { [Op.ne]: 'brouillon' }
      },
      attributes: ['id', 'type_document', 'montant_ttc', 'montant_regle', 'statut']
    });

    const resume = {
      total_factures: 0,
      total_avoirs: 0,
      montant_total_factures: 0,
      montant_total_avoirs: 0,
      montant_regle: 0,
      montant_impaye: 0,
      nb_factures_impayees: 0
    };

    factures.forEach(f => {
      if (f.type_document === 'avoir') {
        resume.total_avoirs++;
        resume.montant_total_avoirs += parseFloat(f.montant_ttc);
      } else {
        resume.total_factures++;
        resume.montant_total_factures += parseFloat(f.montant_ttc);
        resume.montant_regle += parseFloat(f.montant_regle);

        const resteAPayer = parseFloat(f.montant_ttc) - parseFloat(f.montant_regle);
        if (resteAPayer > 0.01 && f.statut !== 'annulee') {
          resume.montant_impaye += resteAPayer;
          resume.nb_factures_impayees++;
        }
      }
    });

    res.json(resume);
  } catch (error) {
    console.error('Erreur resume factures:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation du resume'
    });
  }
});

/**
 * @route   GET /api/usager/factures/:id
 * @desc    Detail d'une facture
 * @access  Private (usager)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await Facture.findOne({
      where: {
        id,
        utilisateur_id: req.usagerId,
        statut: { [Op.ne]: 'brouillon' }
      },
      include: [
        {
          model: LigneFacture,
          as: 'lignes',
          order: [['ordre', 'ASC']]
        },
        {
          model: ReglementFacture,
          as: 'reglements',
          where: { annule: false },
          required: false,
          order: [['date_reglement', 'DESC']]
        },
        {
          model: Facture,
          as: 'factureOrigine',
          attributes: ['id', 'numero']
        },
        {
          model: Facture,
          as: 'avoirs',
          attributes: ['id', 'numero', 'montant_ttc', 'date_emission']
        }
      ]
    });

    if (!facture) {
      return res.status(404).json({
        error: 'Non trouve',
        message: 'Facture non trouvee'
      });
    }

    res.json(facture);
  } catch (error) {
    console.error('Erreur detail facture:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation de la facture'
    });
  }
});

/**
 * @route   GET /api/usager/factures/:id/pdf
 * @desc    Telecharger le PDF d'une facture
 * @access  Private (usager)
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await Facture.findOne({
      where: {
        id,
        utilisateur_id: req.usagerId,
        statut: { [Op.ne]: 'brouillon' }
      },
      include: [
        { model: LigneFacture, as: 'lignes', order: [['ordre', 'ASC']] },
        { model: ReglementFacture, as: 'reglements', where: { annule: false }, required: false },
        { model: Facture, as: 'factureOrigine', attributes: ['id', 'numero'] }
      ]
    });

    if (!facture) {
      return res.status(404).json({
        error: 'Non trouve',
        message: 'Facture non trouvee'
      });
    }

    // Recuperer les parametres de la structure
    const structure = await ParametresStructure.findOne() || {};

    // Generer le PDF
    const pdfBuffer = await pdfService.genererFacturePDF(facture, structure);

    // Definir les headers
    const typeDoc = facture.type_document === 'avoir' ? 'Avoir' : 'Facture';
    const filename = `${typeDoc}_${facture.numero.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur PDF facture usager:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la generation du PDF'
    });
  }
});

/**
 * @route   GET /api/usager/reglements
 * @desc    Liste de tous les reglements de l'usager
 * @access  Private (usager)
 */
router.get('/tous/reglements', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Recuperer les factures de l'usager avec leurs reglements
    const factures = await Facture.findAll({
      where: {
        utilisateur_id: req.usagerId,
        statut: { [Op.ne]: 'brouillon' }
      },
      attributes: ['id', 'numero', 'type_document'],
      include: [
        {
          model: ReglementFacture,
          as: 'reglements',
          where: { annule: false },
          required: true
        }
      ]
    });

    // Aplatir tous les reglements
    let tousReglements = [];
    factures.forEach(f => {
      f.reglements.forEach(r => {
        tousReglements.push({
          id: r.id,
          facture_id: f.id,
          facture_numero: f.numero,
          type_document: f.type_document,
          date_reglement: r.date_reglement,
          montant: r.montant,
          mode_paiement: r.mode_paiement,
          reference: r.reference
        });
      });
    });

    // Trier par date decroissante
    tousReglements.sort((a, b) => new Date(b.date_reglement) - new Date(a.date_reglement));

    // Pagination manuelle
    const total = tousReglements.length;
    const reglementsPagines = tousReglements.slice(offset, offset + parseInt(limit));

    res.json({
      reglements: reglementsPagines,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste reglements usager:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation des reglements'
    });
  }
});

module.exports = router;
