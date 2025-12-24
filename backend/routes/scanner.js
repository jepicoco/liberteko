/**
 * Routes Scanner
 *
 * Endpoints pour la validation des emprunts et le statut usager
 */

const express = require('express');
const router = express.Router();
const scannerValidationService = require('../services/scannerValidationService');
const eventTriggerService = require('../services/eventTriggerService');
const { Utilisateur, Reservation, Emprunt } = require('../models');
const { Op } = require('sequelize');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes scanner necessitent une authentification
router.use(verifyToken);

/**
 * POST /api/scanner/validate-loan
 *
 * Valide un emprunt avant creation
 * Retourne les blocages, avertissements et informations
 */
router.post('/validate-loan', async (req, res) => {
  try {
    const { utilisateur_id, article_id, article_type, structure_id } = req.body;

    // Validation des parametres
    if (!utilisateur_id || !article_id || !article_type) {
      return res.status(400).json({
        error: 'Parametres manquants: utilisateur_id, article_id, article_type requis'
      });
    }

    // Utiliser la structure du contexte si non fournie
    const structureId = structure_id || req.structureId || 1;

    const result = await scannerValidationService.validateEmprunt({
      utilisateurId: utilisateur_id,
      articleId: article_id,
      articleType: article_type,
      structureId
    });

    res.json(result);
  } catch (error) {
    console.error('[Scanner] Erreur validate-loan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/user-status/:utilisateurId
 *
 * Recupere le statut complet d'un utilisateur pour le scanner
 * (cotisation, adhesion, limites, reservations)
 */
router.get('/user-status/:utilisateurId', async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    const status = await scannerValidationService.getUserStatus(
      parseInt(utilisateurId),
      parseInt(structureId)
    );

    res.json(status);
  } catch (error) {
    console.error('[Scanner] Erreur user-status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/limits-summary/:utilisateurId
 *
 * Recupere le resume des limites d'emprunt pour un utilisateur
 */
router.get('/limits-summary/:utilisateurId', async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    const summary = await scannerValidationService.getLimitsSummary(
      parseInt(utilisateurId),
      parseInt(structureId)
    );

    res.json(summary);
  } catch (error) {
    console.error('[Scanner] Erreur limits-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/send-reminder
 *
 * Envoie un rappel par email (cotisation ou adhesion)
 */
router.post('/send-reminder', async (req, res) => {
  try {
    const { utilisateur_id, type, structure_id } = req.body;

    if (!utilisateur_id || !type) {
      return res.status(400).json({
        error: 'Parametres manquants: utilisateur_id, type requis'
      });
    }

    const utilisateur = await Utilisateur.findByPk(utilisateur_id);
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Determiner le trigger a utiliser
    let triggerCode;
    if (type === 'cotisation') {
      triggerCode = 'COTISATION_RAPPEL';
    } else if (type === 'adhesion') {
      triggerCode = 'ADHESION_RAPPEL'; // A creer si necessaire
    } else {
      return res.status(400).json({ error: 'Type de rappel invalide' });
    }

    // Envoyer le rappel via event trigger
    try {
      await eventTriggerService.trigger(triggerCode, {
        utilisateur,
        structureId: structure_id || req.structureId
      });

      res.json({
        success: true,
        message: `Rappel ${type} envoye a ${utilisateur.email}`
      });
    } catch (triggerError) {
      console.error('[Scanner] Erreur trigger rappel:', triggerError);
      res.json({
        success: false,
        message: `Impossible d'envoyer le rappel: ${triggerError.message}`
      });
    }
  } catch (error) {
    console.error('[Scanner] Erreur send-reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/override-reservation
 *
 * Outrepasse une reservation et l'annule pour permettre l'emprunt
 */
router.post('/override-reservation', async (req, res) => {
  try {
    const { reservation_id, notify_user } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ error: 'reservation_id requis' });
    }

    const reservation = await Reservation.findByPk(reservation_id, {
      include: [{ model: Utilisateur, as: 'utilisateur' }]
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation introuvable' });
    }

    // Annuler la reservation
    reservation.statut = 'annulee';
    reservation.commentaire = (reservation.commentaire || '') +
      `\n[${new Date().toISOString()}] Annulee par outrepassement scanner`;
    await reservation.save();

    // Notifier l'usager si demande
    if (notify_user && reservation.utilisateur) {
      try {
        await eventTriggerService.trigger('RESERVATION_ANNULEE', {
          reservation,
          utilisateur: reservation.utilisateur,
          raison: 'Article emprunte par un autre usager'
        });
      } catch (notifyError) {
        console.error('[Scanner] Erreur notification annulation:', notifyError);
      }
    }

    res.json({
      success: true,
      message: 'Reservation annulee'
    });
  } catch (error) {
    console.error('[Scanner] Erreur override-reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/create-emprunt-with-validation
 *
 * Cree un emprunt apres validation, avec gestion des outrepassements
 */
router.post('/create-emprunt-with-validation', async (req, res) => {
  try {
    const {
      utilisateur_id,
      article_id,
      article_type,
      structure_id,
      date_retour_prevue,
      override_warnings,
      cancel_reservation_id,
      send_cotisation_reminder,
      send_adhesion_reminder
    } = req.body;

    // 1. Valider l'emprunt
    const structureId = structure_id || req.structureId || 1;
    const validation = await scannerValidationService.validateEmprunt({
      utilisateurId: utilisateur_id,
      articleId: article_id,
      articleType: article_type,
      structureId
    });

    // 2. Verifier si on peut continuer
    if (!validation.canProceed && !override_warnings) {
      return res.status(400).json({
        success: false,
        validation,
        message: 'Emprunt bloque par les validations'
      });
    }

    // 3. Gerer les actions annexes

    // Annuler la reservation si demande
    if (cancel_reservation_id) {
      const reservation = await Reservation.findByPk(cancel_reservation_id);
      if (reservation) {
        reservation.statut = 'annulee';
        reservation.commentaire = (reservation.commentaire || '') +
          `\n[${new Date().toISOString()}] Annulee par emprunt direct`;
        await reservation.save();
      }
    }

    // Envoyer les rappels si demandes
    if (send_cotisation_reminder && validation.utilisateur) {
      try {
        const utilisateur = await Utilisateur.findByPk(utilisateur_id);
        await eventTriggerService.trigger('COTISATION_RAPPEL', {
          utilisateur,
          structureId
        });
      } catch (e) {
        console.error('[Scanner] Erreur rappel cotisation:', e);
      }
    }

    if (send_adhesion_reminder && validation.utilisateur) {
      try {
        const utilisateur = await Utilisateur.findByPk(utilisateur_id);
        await eventTriggerService.trigger('ADHESION_RAPPEL', {
          utilisateur,
          structureId
        });
      } catch (e) {
        console.error('[Scanner] Erreur rappel adhesion:', e);
      }
    }

    // 4. Creer l'emprunt
    const foreignKey = `${article_type}_id`;
    const empruntData = {
      utilisateur_id,
      [foreignKey]: article_id,
      date_emprunt: new Date(),
      date_retour_prevue: date_retour_prevue || calculateReturnDate(),
      statut: 'en_cours',
      structure_id: structureId
    };

    const emprunt = await Emprunt.create(empruntData);

    // 5. Si l'article etait reserve par cet usager, convertir la reservation
    if (validation.reservation?.isCurrentUser && validation.reservation?.reservationId) {
      const reservation = await Reservation.findByPk(validation.reservation.reservationId);
      if (reservation) {
        reservation.statut = 'empruntee';
        reservation.emprunt_id = emprunt.id;
        reservation.date_conversion = new Date();
        await reservation.save();
      }
    }

    // 6. Mettre a jour le statut de l'article
    const config = scannerValidationService.MODULE_CONFIG[
      scannerValidationService.TYPE_TO_MODULE[article_type]
    ];
    if (config) {
      await config.model.update(
        { statut: 'emprunte' },
        { where: { id: article_id } }
      );
    }

    res.json({
      success: true,
      emprunt: {
        id: emprunt.id,
        date_retour_prevue: emprunt.date_retour_prevue
      },
      validation,
      overridden: !validation.canProceed && override_warnings
    });

  } catch (error) {
    console.error('[Scanner] Erreur create-emprunt:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calcule la date de retour par defaut (14 jours)
 */
function calculateReturnDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

module.exports = router;
