/**
 * Controleur pour la gestion des cles API
 * Permet de creer, lister, activer/desactiver et supprimer des cles API
 * pour les extensions externes (Chrome, etc.)
 */

const { ApiKey } = require('../models');
const logger = require('../utils/logger');

/**
 * Liste toutes les cles API
 */
const listerCles = async (req, res) => {
  try {
    const cles = await ApiKey.findAll({
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['key_hash'] }
    });

    // Ajouter les stats pour chaque cle
    const clesAvecStats = cles.map(cle => ({
      ...cle.toJSON(),
      stats: cle.getStats()
    }));

    res.json({
      success: true,
      data: clesAvecStats
    });
  } catch (error) {
    logger.error('Erreur listerCles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des cles API'
    });
  }
};

/**
 * Obtient les details d'une cle API
 */
const obtenirCle = async (req, res) => {
  try {
    const { id } = req.params;

    const cle = await ApiKey.findByPk(id, {
      attributes: { exclude: ['key_hash'] }
    });

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    res.json({
      success: true,
      data: {
        ...cle.toJSON(),
        stats: cle.getStats()
      }
    });
  } catch (error) {
    logger.error('Erreur obtenirCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation de la cle API'
    });
  }
};

/**
 * Cree une nouvelle cle API
 * ATTENTION: La cle en clair n'est retournee qu'une seule fois
 */
const creerCle = async (req, res) => {
  try {
    const {
      nom,
      description,
      permissions,
      collections_autorisees,
      limite_requetes,
      periode_limite,
      ip_autorisees,
      date_expiration
    } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom est requis'
      });
    }

    const userId = req.user?.id || null;

    const result = await ApiKey.creerCle({
      nom,
      description,
      permissions,
      collections_autorisees,
      limite_requetes,
      periode_limite,
      ip_autorisees,
      date_expiration
    }, userId);

    logger.info(`Nouvelle cle API creee: ${nom} (${result.apiKey.key_prefix})`);

    // SECURITY: Prevent caching of sensitive API key response
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.status(201).json({
      success: true,
      message: 'Cle API creee avec succes',
      data: {
        id: result.apiKey.id,
        nom: result.apiKey.nom,
        key_prefix: result.apiKey.key_prefix,
        // La cle en clair - A AFFICHER UNE SEULE FOIS
        cle: result.cleEnClair,
        permissions: result.apiKey.permissions,
        collections_autorisees: result.apiKey.collections_autorisees
      },
      warning: 'ATTENTION: Copiez cette cle maintenant. Elle ne sera plus jamais affichee.'
    });
  } catch (error) {
    logger.error('Erreur creerCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation de la cle API'
    });
  }
};

/**
 * Met a jour une cle API
 */
const mettreAJourCle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      description,
      permissions,
      collections_autorisees,
      limite_requetes,
      periode_limite,
      ip_autorisees,
      date_expiration
    } = req.body;

    const cle = await ApiKey.findByPk(id);

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    // Mise a jour des champs
    if (nom !== undefined) cle.nom = nom;
    if (description !== undefined) cle.description = description;
    if (permissions !== undefined) cle.permissions = permissions;
    if (collections_autorisees !== undefined) cle.collections_autorisees = collections_autorisees;
    if (limite_requetes !== undefined) cle.limite_requetes = limite_requetes;
    if (periode_limite !== undefined) cle.periode_limite = periode_limite;
    if (ip_autorisees !== undefined) cle.ip_autorisees = ip_autorisees;
    if (date_expiration !== undefined) cle.date_expiration = date_expiration;

    await cle.save();

    logger.info(`Cle API mise a jour: ${cle.nom} (${cle.key_prefix})`);

    res.json({
      success: true,
      message: 'Cle API mise a jour',
      data: {
        ...cle.toJSON(),
        key_hash: undefined,
        stats: cle.getStats()
      }
    });
  } catch (error) {
    logger.error('Erreur mettreAJourCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour de la cle API'
    });
  }
};

/**
 * Active une cle API
 */
const activerCle = async (req, res) => {
  try {
    const { id } = req.params;

    const cle = await ApiKey.findByPk(id);

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    await cle.activer();

    logger.info(`Cle API activee: ${cle.nom} (${cle.key_prefix})`);

    res.json({
      success: true,
      message: 'Cle API activee',
      data: { actif: true }
    });
  } catch (error) {
    logger.error('Erreur activerCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation de la cle API'
    });
  }
};

/**
 * Desactive une cle API
 */
const desactiverCle = async (req, res) => {
  try {
    const { id } = req.params;

    const cle = await ApiKey.findByPk(id);

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    await cle.desactiver();

    logger.info(`Cle API desactivee: ${cle.nom} (${cle.key_prefix})`);

    res.json({
      success: true,
      message: 'Cle API desactivee',
      data: { actif: false }
    });
  } catch (error) {
    logger.error('Erreur desactiverCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la desactivation de la cle API'
    });
  }
};

/**
 * Supprime une cle API
 */
const supprimerCle = async (req, res) => {
  try {
    const { id } = req.params;

    const cle = await ApiKey.findByPk(id);

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    const nom = cle.nom;
    const prefix = cle.key_prefix;

    await cle.destroy();

    logger.info(`Cle API supprimee: ${nom} (${prefix})`);

    res.json({
      success: true,
      message: 'Cle API supprimee'
    });
  } catch (error) {
    logger.error('Erreur supprimerCle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la cle API'
    });
  }
};

/**
 * Obtient les permissions disponibles
 */
const obtenirPermissions = async (req, res) => {
  try {
    const permissions = ApiKey.getPermissionsDisponibles();
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Erreur obtenirPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des permissions'
    });
  }
};

/**
 * Reset le compteur de requetes d'une cle
 */
const resetCompteur = async (req, res) => {
  try {
    const { id } = req.params;

    const cle = await ApiKey.findByPk(id);

    if (!cle) {
      return res.status(404).json({
        success: false,
        message: 'Cle API non trouvee'
      });
    }

    await cle.resetCompteur();

    logger.info(`Compteur reset pour cle API: ${cle.nom} (${cle.key_prefix})`);

    res.json({
      success: true,
      message: 'Compteur reinitialise',
      data: cle.getStats()
    });
  } catch (error) {
    logger.error('Erreur resetCompteur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du reset du compteur'
    });
  }
};

module.exports = {
  listerCles,
  obtenirCle,
  creerCle,
  mettreAJourCle,
  activerCle,
  desactiverCle,
  supprimerCle,
  obtenirPermissions,
  resetCompteur
};
