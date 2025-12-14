/**
 * Controleur pour les imports externes via API Key
 * Utilise par les extensions Chrome, etc.
 */

const { Jeu, Livre, Film, Disque, Editeur, GenreJeu, CategorieJeu } = require('../models');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');

// Dossier pour les images uploadees
const UPLOADS_DIR = path.join(__dirname, '../../frontend/uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');

/**
 * Verifie si un jeu existe par EAN
 */
const checkJeuByEan = async (req, res) => {
  try {
    const { ean } = req.params;

    if (!ean) {
      return res.status(400).json({
        success: false,
        error: 'EAN_REQUIRED',
        message: 'EAN requis'
      });
    }

    const jeu = await Jeu.findOne({
      where: { ean: ean },
      attributes: ['id', 'titre', 'ean', 'editeur', 'annee_sortie', 'image', 'quantite']
    });

    if (jeu) {
      return res.json({
        success: true,
        exists: true,
        data: jeu
      });
    }

    return res.json({
      success: true,
      exists: false
    });
  } catch (error) {
    logger.error('[External] checkJeuByEan error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la verification'
    });
  }
};

/**
 * Telecharge une image depuis une URL et la sauvegarde localement
 */
async function downloadImage(imageUrl, filename) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;

    // Assurer que le dossier existe
    fs.mkdir(IMAGES_DIR, { recursive: true }).then(() => {
      const filePath = path.join(IMAGES_DIR, filename);
      const file = require('fs').createWriteStream(filePath);

      const request = protocol.get(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      }, (response) => {
        // Suivre les redirections
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          file.close();
          fs.unlink(filePath).catch(() => {});
          return downloadImage(redirectUrl, filename).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(filePath).catch(() => {});
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(`/uploads/images/${filename}`);
        });
      });

      request.on('error', (err) => {
        file.close();
        fs.unlink(filePath).catch(() => {});
        reject(err);
      });

      request.on('timeout', () => {
        request.destroy();
        file.close();
        fs.unlink(filePath).catch(() => {});
        reject(new Error('Timeout'));
      });
    }).catch(reject);
  });
}

/**
 * Genere un nom de fichier unique pour une image
 */
function generateImageFilename(ean, originalUrl) {
  const ext = path.extname(originalUrl.split('?')[0]) || '.jpg';
  const timestamp = Date.now();
  return `jeu_${ean}_${timestamp}${ext}`;
}

/**
 * Cree ou met a jour un jeu depuis une source externe
 */
const createOrUpdateJeu = async (req, res) => {
  try {
    const data = req.body;

    // Validation minimale
    if (!data.titre) {
      return res.status(400).json({
        success: false,
        error: 'TITRE_REQUIRED',
        message: 'Le titre est requis'
      });
    }

    // Verifier si le jeu existe deja (par EAN ou par titre exact)
    let existingJeu = null;
    const eanValue = data.ean13 || data.ean;
    if (eanValue) {
      existingJeu = await Jeu.findOne({ where: { ean: eanValue } });
    }

    // Si une image URL est fournie, la telecharger
    let imagePath = data.image || null;
    if (data.image_url && !data.image) {
      try {
        const filename = generateImageFilename(eanValue || Date.now(), data.image_url);
        imagePath = await downloadImage(data.image_url, filename);
        logger.info(`[External] Image telechargee: ${imagePath}`);
      } catch (imgError) {
        logger.warn(`[External] Echec telechargement image: ${imgError.message}`);
        // Continuer sans image
      }
    }

    // Preparer les donnees du jeu (mapping MyLudo -> modele Jeu)
    const jeuData = {
      titre: data.titre,
      ean: eanValue || null,
      editeur: data.editeur || null,
      auteur: data.auteur || null,
      illustrateur: data.illustrateur || null,
      annee_sortie: data.annee_sortie || null,
      nb_joueurs_min: data.joueurs_min || data.nb_joueurs_min || null,
      nb_joueurs_max: data.joueurs_max || data.nb_joueurs_max || null,
      age_min: data.age_minimum || data.age_min || null,
      duree_partie: data.duree_partie || null,
      description: data.description || null,
      langues: data.langue || data.langues || null,
      categories: data.categories || null,
      mecanismes: data.mecanismes || null,
      themes: data.themes || null,
      prix_indicatif: data.prix || data.prix_indicatif || null,
      image_url: imagePath,
      notes: data.source ? `Import ${data.source}: ${data.source_url || data.url || ''}` : null
    };

    let jeu;
    let action;

    if (existingJeu) {
      // Mise a jour: ne mettre a jour que les champs non vides
      const updateData = {};
      for (const [key, value] of Object.entries(jeuData)) {
        if (value !== null && value !== undefined && value !== '') {
          // Ne pas ecraser l'image existante si pas de nouvelle image
          if (key === 'image_url' && !imagePath && existingJeu.image_url) {
            continue;
          }
          // Ne pas ecraser les notes existantes
          if (key === 'notes' && existingJeu.notes) {
            continue;
          }
          updateData[key] = value;
        }
      }

      await existingJeu.update(updateData);
      jeu = existingJeu;
      action = 'updated';

      logger.info(`[External] Jeu mis a jour: ${jeu.titre} (ID: ${jeu.id}) via ${req.apiKey.key_prefix}`);
    } else {
      // Creation
      jeu = await Jeu.create(jeuData);
      action = 'created';

      logger.info(`[External] Jeu cree: ${jeu.titre} (ID: ${jeu.id}) via ${req.apiKey.key_prefix}`);
    }

    return res.status(action === 'created' ? 201 : 200).json({
      success: true,
      action,
      data: {
        id: jeu.id,
        titre: jeu.titre,
        ean: jeu.ean,
        image_url: jeu.image_url
      }
    });

  } catch (error) {
    logger.error('[External] createOrUpdateJeu error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || 'Erreur lors de la creation/mise a jour'
    });
  }
};

/**
 * Upload d'une image en base64
 */
const uploadImageBase64 = async (req, res) => {
  try {
    const { image, filename, collection, item_id } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'IMAGE_REQUIRED',
        message: 'Image en base64 requise'
      });
    }

    // Extraire le type et les donnees
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'Format base64 invalide'
      });
    }

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Generer le nom de fichier
    const finalFilename = filename || `${collection || 'upload'}_${item_id || Date.now()}_${Date.now()}.${ext}`;
    const filePath = path.join(IMAGES_DIR, finalFilename);

    // Assurer que le dossier existe
    await fs.mkdir(IMAGES_DIR, { recursive: true });

    // Sauvegarder
    await fs.writeFile(filePath, buffer);

    const relativePath = `/uploads/images/${finalFilename}`;

    // Si un item_id est specifie, mettre a jour l'enregistrement
    if (item_id && collection) {
      const Model = {
        jeu: Jeu,
        livre: Livre,
        film: Film,
        disque: Disque
      }[collection];

      if (Model) {
        await Model.update({ image_url: relativePath }, { where: { id: item_id } });
      }
    }

    logger.info(`[External] Image uploadee: ${relativePath} via ${req.apiKey.key_prefix}`);

    return res.json({
      success: true,
      data: {
        path: relativePath,
        filename: finalFilename
      }
    });

  } catch (error) {
    logger.error('[External] uploadImageBase64 error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de l\'upload'
    });
  }
};

/**
 * Upload d'une image depuis une URL
 */
const uploadImageFromUrl = async (req, res) => {
  try {
    const { url, collection, item_id } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL_REQUIRED',
        message: 'URL de l\'image requise'
      });
    }

    // Generer le nom de fichier
    const filename = generateImageFilename(item_id || Date.now(), url);

    // Telecharger
    const relativePath = await downloadImage(url, filename);

    // Si un item_id est specifie, mettre a jour l'enregistrement
    if (item_id && collection) {
      const Model = {
        jeu: Jeu,
        livre: Livre,
        film: Film,
        disque: Disque
      }[collection];

      if (Model) {
        await Model.update({ image_url: relativePath }, { where: { id: item_id } });
      }
    }

    logger.info(`[External] Image telechargee depuis URL: ${relativePath} via ${req.apiKey.key_prefix}`);

    return res.json({
      success: true,
      data: {
        path: relativePath,
        filename
      }
    });

  } catch (error) {
    logger.error('[External] uploadImageFromUrl error:', error);
    return res.status(500).json({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: 'Echec du telechargement de l\'image'
    });
  }
};

/**
 * Obtient les statistiques de la cle API
 */
const getApiKeyStats = async (req, res) => {
  try {
    const stats = req.apiKey.getStats();

    return res.json({
      success: true,
      data: {
        key_prefix: req.apiKey.key_prefix,
        nom: req.apiKey.nom,
        ...stats
      }
    });
  } catch (error) {
    logger.error('[External] getApiKeyStats error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la recuperation des stats'
    });
  }
};

module.exports = {
  checkJeuByEan,
  createOrUpdateJeu,
  uploadImageBase64,
  uploadImageFromUrl,
  getApiKeyStats
};
