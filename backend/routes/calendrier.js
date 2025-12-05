/**
 * Routes Calendrier
 * Gestion des vacances scolaires et jours fériés
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const vacancesService = require('../services/vacancesScolairesService');
const joursFeriesService = require('../services/joursFeriesService');
const { ParametresCalendrier, FermetureExceptionnelle } = require('../models');

// Protection de toutes les routes
router.use(verifyToken);

// ==================== Vacances Scolaires (France uniquement) ====================

/**
 * GET /api/calendrier/vacances/zones
 * Liste les zones académiques françaises
 */
router.get('/vacances/zones', (req, res) => {
  res.json(vacancesService.getZonesAcademiques());
});

/**
 * GET /api/calendrier/vacances
 * Récupère les vacances scolaires pour une zone et année
 * Query: zone (A, B, C), annee_scolaire (ex: 2024-2025)
 */
router.get('/vacances', async (req, res) => {
  try {
    const { zone, annee_scolaire } = req.query;

    if (!zone) {
      return res.status(400).json({ error: 'La zone est requise (A, B ou C)' });
    }

    const anneeScolaire = annee_scolaire || vacancesService.getAnneeScolaireCourante();
    const vacances = await vacancesService.getVacancesScolaires(zone, anneeScolaire);

    res.json({
      zone,
      annee_scolaire: anneeScolaire,
      vacances
    });
  } catch (error) {
    console.error('Erreur get vacances:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendrier/vacances/import
 * Importe les vacances scolaires comme fermetures exceptionnelles
 * Body: site_id (optionnel), zone, annee_scolaire
 */
router.post('/vacances/import', async (req, res) => {
  try {
    const { site_id, zone, annee_scolaire } = req.body;

    if (!zone) {
      return res.status(400).json({ error: 'La zone est requise (A, B ou C)' });
    }

    const anneeScolaire = annee_scolaire || vacancesService.getAnneeScolaireCourante();
    const result = await vacancesService.importerVacances(site_id || null, zone, anneeScolaire);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur import vacances:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Jours Fériés ====================

/**
 * GET /api/calendrier/jours-feries/pays
 * Liste les pays supportés
 */
router.get('/jours-feries/pays', (req, res) => {
  res.json(joursFeriesService.getPaysSupportes());
});

/**
 * GET /api/calendrier/jours-feries
 * Récupère les jours fériés pour un pays et une année
 * Query: pays (FR, CH, DE, BE), annee (ex: 2025)
 */
router.get('/jours-feries', (req, res) => {
  try {
    const { pays, annee } = req.query;

    if (!pays) {
      return res.status(400).json({ error: 'Le pays est requis (FR, CH, DE, BE)' });
    }

    const anneeInt = parseInt(annee) || new Date().getFullYear();
    const jours = joursFeriesService.getJoursFeries(pays, anneeInt);

    res.json({
      pays,
      annee: anneeInt,
      jours_feries: jours
    });
  } catch (error) {
    console.error('Erreur get jours fériés:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendrier/jours-feries/import
 * Importe les jours fériés comme fermetures exceptionnelles
 * Body: site_id (optionnel), pays, annee
 */
router.post('/jours-feries/import', async (req, res) => {
  try {
    const { site_id, pays, annee } = req.body;

    if (!pays) {
      return res.status(400).json({ error: 'Le pays est requis (FR, CH, DE, BE)' });
    }

    const anneeInt = parseInt(annee) || new Date().getFullYear();
    const result = await joursFeriesService.importerJoursFeries(site_id || null, pays, anneeInt);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur import jours fériés:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendrier/jours-feries/verifier
 * Vérifie si une date est un jour férié
 * Query: date (YYYY-MM-DD), pays
 */
router.get('/jours-feries/verifier', (req, res) => {
  try {
    const { date, pays } = req.query;

    if (!date || !pays) {
      return res.status(400).json({ error: 'Date et pays sont requis' });
    }

    const jourFerie = joursFeriesService.estJourFerie(date, pays);

    res.json({
      date,
      pays,
      est_ferie: !!jourFerie,
      jour_ferie: jourFerie
    });
  } catch (error) {
    console.error('Erreur vérification jour férié:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Paramètres Calendrier ====================

/**
 * GET /api/calendrier/parametres
 * Récupère les paramètres calendrier globaux ou pour un site
 * Query: site_id (optionnel)
 */
router.get('/parametres', async (req, res) => {
  try {
    const { site_id } = req.query;

    let parametres;
    if (site_id) {
      parametres = await ParametresCalendrier.getPourSite(parseInt(site_id));
    } else {
      parametres = await ParametresCalendrier.getGlobal();
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur get parametres calendrier:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendrier/site/:siteId
 * Récupère les paramètres calendrier pour un site spécifique
 */
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;

    // Chercher les paramètres spécifiques au site
    let parametres = await ParametresCalendrier.findOne({
      where: { site_id: parseInt(siteId) }
    });

    if (!parametres) {
      // Retourner les paramètres globaux par défaut
      parametres = await ParametresCalendrier.getGlobal();
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur get parametres site:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/calendrier/site/:siteId
 * Met à jour les paramètres calendrier pour un site spécifique
 */
router.put('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { ouvert_jours_feries, ouvert_vacances, horaires_vacances_identiques, pays, zone_vacances } = req.body;

    let parametres = await ParametresCalendrier.findOne({
      where: { site_id: parseInt(siteId) }
    });

    if (!parametres) {
      // Créer les paramètres pour ce site
      parametres = await ParametresCalendrier.create({
        site_id: parseInt(siteId),
        pays: pays || 'FR',
        zone_vacances: zone_vacances || null,
        ouvert_jours_feries: ouvert_jours_feries || false,
        ouvert_vacances: ouvert_vacances !== false,
        horaires_vacances_identiques: horaires_vacances_identiques !== false
      });
    } else {
      // Mettre à jour
      await parametres.update({
        pays: pays !== undefined ? pays : parametres.pays,
        zone_vacances: zone_vacances !== undefined ? zone_vacances : parametres.zone_vacances,
        ouvert_jours_feries: ouvert_jours_feries !== undefined ? ouvert_jours_feries : parametres.ouvert_jours_feries,
        ouvert_vacances: ouvert_vacances !== undefined ? ouvert_vacances : parametres.ouvert_vacances,
        horaires_vacances_identiques: horaires_vacances_identiques !== undefined ? horaires_vacances_identiques : parametres.horaires_vacances_identiques
      });
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur update parametres site:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/calendrier/parametres
 * Met à jour les paramètres calendrier
 * Body: site_id (optionnel), pays, zone_vacances, ouvert_jours_feries, ouvert_vacances
 */
router.put('/parametres', async (req, res) => {
  try {
    const { site_id, pays, zone_vacances, ouvert_jours_feries, ouvert_vacances, horaires_vacances_identiques } = req.body;

    let parametres = await ParametresCalendrier.findOne({
      where: { site_id: site_id || null }
    });

    if (!parametres) {
      // Créer si n'existe pas
      parametres = await ParametresCalendrier.create({
        site_id: site_id || null,
        pays: pays || 'FR',
        zone_vacances,
        ouvert_jours_feries: ouvert_jours_feries || false,
        ouvert_vacances: ouvert_vacances !== false,
        horaires_vacances_identiques: horaires_vacances_identiques !== false
      });
    } else {
      // Mettre à jour
      await parametres.update({
        pays: pays !== undefined ? pays : parametres.pays,
        zone_vacances: zone_vacances !== undefined ? zone_vacances : parametres.zone_vacances,
        ouvert_jours_feries: ouvert_jours_feries !== undefined ? ouvert_jours_feries : parametres.ouvert_jours_feries,
        ouvert_vacances: ouvert_vacances !== undefined ? ouvert_vacances : parametres.ouvert_vacances,
        horaires_vacances_identiques: horaires_vacances_identiques !== undefined ? horaires_vacances_identiques : parametres.horaires_vacances_identiques
      });
    }

    res.json(parametres);
  } catch (error) {
    console.error('Erreur update parametres calendrier:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Fermetures globales ====================

/**
 * GET /api/calendrier/fermetures
 * Récupère toutes les fermetures globales (site_id = null)
 * Query: annee, type
 */
router.get('/fermetures', async (req, res) => {
  try {
    const { annee, type } = req.query;
    const { Op } = require('sequelize');

    const where = { site_id: null };

    if (type) {
      where.type = type;
    }

    if (annee) {
      where[Op.or] = [
        { date_debut: { [Op.between]: [`${annee}-01-01`, `${annee}-12-31`] } },
        { date_fin: { [Op.between]: [`${annee}-01-01`, `${annee}-12-31`] } }
      ];
    }

    const fermetures = await FermetureExceptionnelle.findAll({
      where,
      order: [['date_debut', 'ASC']]
    });

    res.json(fermetures);
  } catch (error) {
    console.error('Erreur get fermetures globales:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendrier/fermetures
 * Ajoute une fermeture globale (tous les sites)
 * Body: date_debut, date_fin, motif, type, recurrent_annuel
 */
router.post('/fermetures', async (req, res) => {
  try {
    const { date_debut, date_fin, motif, type, recurrent_annuel } = req.body;

    if (!date_debut) {
      return res.status(400).json({ error: 'La date de début est requise' });
    }

    const fermeture = await FermetureExceptionnelle.create({
      site_id: null, // Global
      date_debut,
      date_fin: date_fin || date_debut,
      motif,
      type: type || 'ponctuel',
      recurrent_annuel: recurrent_annuel || false
    });

    res.status(201).json(fermeture);
  } catch (error) {
    console.error('Erreur création fermeture globale:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/calendrier/fermetures/:id
 * Supprime une fermeture
 */
router.delete('/fermetures/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const fermeture = await FermetureExceptionnelle.findByPk(id);
    if (!fermeture) {
      return res.status(404).json({ error: 'Fermeture non trouvée' });
    }

    await fermeture.destroy();
    res.json({ message: 'Fermeture supprimée' });
  } catch (error) {
    console.error('Erreur suppression fermeture:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
