/**
 * Controller pour les référentiels des Livres
 * CRUD pour genres, formats, collections, emplacements
 */

const { GenreLitteraire, FormatLivre, CollectionLivre, EmplacementLivre, LivreGenre, Livre } = require('../models');
const logger = require('../utils/logger');

// ========================================
// GENRES
// ========================================

const createGenre = async (req, res) => {
  try {
    const { nom, description, couleur, icone, actif = true } = req.body;

    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const genre = await GenreLitteraire.create({
      nom,
      description,
      couleur,
      icone,
      actif
    });

    logger.info('Genre livre cree', { id: genre.id, nom });
    res.status(201).json(genre);
  } catch (error) {
    logger.error('Erreur creation genre livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un genre avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, couleur, icone, actif } = req.body;

    const genre = await GenreLitteraire.findByPk(id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }

    await genre.update({
      nom: nom !== undefined ? nom : genre.nom,
      description: description !== undefined ? description : genre.description,
      couleur: couleur !== undefined ? couleur : genre.couleur,
      icone: icone !== undefined ? icone : genre.icone,
      actif: actif !== undefined ? actif : genre.actif
    });

    logger.info('Genre livre modifie', { id, nom: genre.nom });
    res.json(genre);
  } catch (error) {
    logger.error('Erreur modification genre livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un genre avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;

    const genre = await GenreLitteraire.findByPk(id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }

    // Verifier si le genre est utilise
    const count = await LivreGenre.count({ where: { genre_id: id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Ce genre est utilise par ${count} livre(s). Desactivez-le plutot que de le supprimer.`
      });
    }

    await genre.destroy();
    logger.info('Genre livre supprime', { id, nom: genre.nom });
    res.json({ message: 'Genre supprime' });
  } catch (error) {
    logger.error('Erreur suppression genre livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const toggleGenre = async (req, res) => {
  try {
    const { id } = req.params;

    const genre = await GenreLitteraire.findByPk(id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }

    await genre.update({ actif: !genre.actif });
    logger.info('Genre livre toggle', { id, actif: genre.actif });
    res.json(genre);
  } catch (error) {
    logger.error('Erreur toggle genre livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ========================================
// FORMATS
// ========================================

const createFormat = async (req, res) => {
  try {
    const { nom, description, actif = true } = req.body;

    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const format = await FormatLivre.create({
      nom,
      description,
      actif
    });

    logger.info('Format livre cree', { id: format.id, nom });
    res.status(201).json(format);
  } catch (error) {
    logger.error('Erreur creation format livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un format avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateFormat = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, actif } = req.body;

    const format = await FormatLivre.findByPk(id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }

    await format.update({
      nom: nom !== undefined ? nom : format.nom,
      description: description !== undefined ? description : format.description,
      actif: actif !== undefined ? actif : format.actif
    });

    logger.info('Format livre modifie', { id, nom: format.nom });
    res.json(format);
  } catch (error) {
    logger.error('Erreur modification format livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un format avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteFormat = async (req, res) => {
  try {
    const { id } = req.params;

    const format = await FormatLivre.findByPk(id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }

    // Verifier si le format est utilise
    const count = await Livre.count({ where: { format_id: id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Ce format est utilise par ${count} livre(s). Desactivez-le plutot que de le supprimer.`
      });
    }

    await format.destroy();
    logger.info('Format livre supprime', { id, nom: format.nom });
    res.json({ message: 'Format supprime' });
  } catch (error) {
    logger.error('Erreur suppression format livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const toggleFormat = async (req, res) => {
  try {
    const { id } = req.params;

    const format = await FormatLivre.findByPk(id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }

    await format.update({ actif: !format.actif });
    logger.info('Format livre toggle', { id, actif: format.actif });
    res.json(format);
  } catch (error) {
    logger.error('Erreur toggle format livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ========================================
// COLLECTIONS
// ========================================

const createCollection = async (req, res) => {
  try {
    const { nom, description, actif = true } = req.body;

    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const collection = await CollectionLivre.create({
      nom,
      description,
      actif
    });

    logger.info('Collection livre creee', { id: collection.id, nom });
    res.status(201).json(collection);
  } catch (error) {
    logger.error('Erreur creation collection livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Une collection avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, actif } = req.body;

    const collection = await CollectionLivre.findByPk(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection non trouvee' });
    }

    await collection.update({
      nom: nom !== undefined ? nom : collection.nom,
      description: description !== undefined ? description : collection.description,
      actif: actif !== undefined ? actif : collection.actif
    });

    logger.info('Collection livre modifiee', { id, nom: collection.nom });
    res.json(collection);
  } catch (error) {
    logger.error('Erreur modification collection livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Une collection avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await CollectionLivre.findByPk(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection non trouvee' });
    }

    // Verifier si la collection est utilisee
    const count = await Livre.count({ where: { collection_id: id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Cette collection est utilisee par ${count} livre(s). Desactivez-la plutot que de la supprimer.`
      });
    }

    await collection.destroy();
    logger.info('Collection livre supprimee', { id, nom: collection.nom });
    res.json({ message: 'Collection supprimee' });
  } catch (error) {
    logger.error('Erreur suppression collection livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const toggleCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await CollectionLivre.findByPk(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection non trouvee' });
    }

    await collection.update({ actif: !collection.actif });
    logger.info('Collection livre toggle', { id, actif: collection.actif });
    res.json(collection);
  } catch (error) {
    logger.error('Erreur toggle collection livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ========================================
// EMPLACEMENTS
// ========================================

const createEmplacement = async (req, res) => {
  try {
    const { libelle, code, description, couleur, icone, site_id, actif = true } = req.body;

    if (!libelle) {
      return res.status(400).json({ error: 'Le libelle est requis' });
    }

    const emplacement = await EmplacementLivre.create({
      libelle,
      code,
      description,
      couleur,
      icone,
      site_id: site_id || null,
      actif
    });

    logger.info('Emplacement livre cree', { id: emplacement.id, libelle });
    res.status(201).json(emplacement);
  } catch (error) {
    logger.error('Erreur creation emplacement livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un emplacement avec ce libelle/code existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { libelle, code, description, couleur, icone, site_id, actif } = req.body;

    const emplacement = await EmplacementLivre.findByPk(id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }

    await emplacement.update({
      libelle: libelle !== undefined ? libelle : emplacement.libelle,
      code: code !== undefined ? code : emplacement.code,
      description: description !== undefined ? description : emplacement.description,
      couleur: couleur !== undefined ? couleur : emplacement.couleur,
      icone: icone !== undefined ? icone : emplacement.icone,
      site_id: site_id !== undefined ? site_id : emplacement.site_id,
      actif: actif !== undefined ? actif : emplacement.actif
    });

    logger.info('Emplacement livre modifie', { id, libelle: emplacement.libelle });
    res.json(emplacement);
  } catch (error) {
    logger.error('Erreur modification emplacement livre:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un emplacement avec ce libelle/code existe deja' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteEmplacement = async (req, res) => {
  try {
    const { id } = req.params;

    const emplacement = await EmplacementLivre.findByPk(id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }

    // Verifier si l'emplacement est utilise
    const count = await Livre.count({ where: { emplacement_id: id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Cet emplacement est utilise par ${count} livre(s). Desactivez-le plutot que de le supprimer.`
      });
    }

    await emplacement.destroy();
    logger.info('Emplacement livre supprime', { id, libelle: emplacement.libelle });
    res.json({ message: 'Emplacement supprime' });
  } catch (error) {
    logger.error('Erreur suppression emplacement livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const toggleEmplacement = async (req, res) => {
  try {
    const { id } = req.params;

    const emplacement = await EmplacementLivre.findByPk(id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }

    await emplacement.update({ actif: !emplacement.actif });
    logger.info('Emplacement livre toggle', { id, actif: emplacement.actif });
    res.json(emplacement);
  } catch (error) {
    logger.error('Erreur toggle emplacement livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  // Genres
  createGenre,
  updateGenre,
  deleteGenre,
  toggleGenre,
  // Formats
  createFormat,
  updateFormat,
  deleteFormat,
  toggleFormat,
  // Collections
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollection,
  // Emplacements
  createEmplacement,
  updateEmplacement,
  deleteEmplacement,
  toggleEmplacement
};
