/**
 * System Controller
 * Gere les endpoints systeme (version, migrations)
 */

const path = require('path');
const fs = require('fs');
const migrationService = require('../services/migrationService');
const logger = require('../utils/logger');

/**
 * GET /api/system/version
 * Retourne la version de l'application (public)
 */
async function getVersion(req, res) {
  try {
    const versionPath = path.join(__dirname, '../../version.json');

    if (!fs.existsSync(versionPath)) {
      return res.json({
        version: 'unknown',
        buildDate: null
      });
    }

    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

    // Ajouter le nombre de migrations en attente pour les admins
    let pendingMigrations = null;
    if (req.user && req.user.role === 'administrateur') {
      pendingMigrations = await migrationService.getPendingCount();
    }

    res.json({
      ...versionData,
      pendingMigrations
    });

  } catch (error) {
    logger.error('Erreur getVersion:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture de la version' });
  }
}

/**
 * GET /api/system/migrations
 * Retourne le statut des migrations (admin only)
 */
async function getMigrations(req, res) {
  try {
    const status = await migrationService.getStatus();
    res.json(status);

  } catch (error) {
    logger.error('Erreur getMigrations:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des migrations' });
  }
}

/**
 * POST /api/system/migrations/run
 * Execute les migrations en attente (admin only)
 */
async function runMigrations(req, res) {
  try {
    logger.info('Execution des migrations demandee par', { userId: req.user?.id });

    const result = await migrationService.runPending();

    if (result.success) {
      logger.info('Migrations executees avec succes', {
        count: result.executed.length,
        batch: result.batch
      });
    } else {
      logger.error('Erreur lors des migrations', { errors: result.errors });
    }

    res.json(result);

  } catch (error) {
    logger.error('Erreur runMigrations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'execution des migrations',
      message: error.message
    });
  }
}

/**
 * GET /api/system/migrations/pending
 * Retourne le nombre de migrations en attente (pour indicateur)
 */
async function getPendingCount(req, res) {
  try {
    const count = await migrationService.getPendingCount();
    res.json({ pendingCount: count });

  } catch (error) {
    logger.error('Erreur getPendingCount:', error);
    res.status(500).json({ error: 'Erreur' });
  }
}

module.exports = {
  getVersion,
  getMigrations,
  runMigrations,
  getPendingCount
};
