/**
 * Disque Controller
 * Handles all CRUD operations for music discs/vinyl
 */

const {
  Disque,
  Artiste,
  GenreMusical,
  FormatDisque,
  LabelDisque,
  EmplacementDisque,
  DisqueArtiste,
  DisqueGenre,
  Emprunt
} = require('../models');
const { Op } = require('sequelize');

// Include configuration for queries
const getDisqueIncludes = () => [
  { model: FormatDisque, as: 'formatRef' },
  { model: LabelDisque, as: 'labelRef' },
  { model: EmplacementDisque, as: 'emplacementRef' },
  { model: Artiste, as: 'artistesRef', through: { attributes: ['role'] } },
  { model: GenreMusical, as: 'genresRef', through: { attributes: [] } }
];

/**
 * Get all disques with filters
 * GET /api/disques
 */
const getAllDisques = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      genre_id,
      format_id,
      artiste_id,
      statut,
      annee
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { titre_original: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } },
        { ean: { [Op.like]: `%${search}%` } }
      ];
    }

    if (statut) where.statut = statut;
    if (annee) where.annee_sortie = annee;
    if (format_id) where.format_id = format_id;

    // Build includes
    const includes = getDisqueIncludes();

    // Filter by genre
    if (genre_id) {
      includes.find(i => i.as === 'genresRef').where = { id: genre_id };
      includes.find(i => i.as === 'genresRef').required = true;
    }

    // Filter by artiste
    if (artiste_id) {
      includes.find(i => i.as === 'artistesRef').where = { id: artiste_id };
      includes.find(i => i.as === 'artistesRef').required = true;
    }

    const { count, rows } = await Disque.findAndCountAll({
      where,
      include: includes,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['titre', 'ASC']],
      distinct: true
    });

    res.json({
      disques: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all disques error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get disque by ID
 * GET /api/disques/:id
 */
const getDisqueById = async (req, res) => {
  try {
    const disque = await Disque.findByPk(req.params.id, {
      include: getDisqueIncludes()
    });

    if (!disque) {
      return res.status(404).json({ error: 'Disque not found' });
    }

    res.json(disque);
  } catch (error) {
    console.error('Get disque by ID error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new disque
 * POST /api/disques
 */
const createDisque = async (req, res) => {
  try {
    const {
      titre,
      titre_original,
      annee_sortie,
      nb_pistes,
      duree_totale,
      ean,
      catalogue_number,
      image_url,
      description,
      format_id,
      label_id,
      emplacement_id,
      statut,
      etat,
      date_acquisition,
      prix_indicatif,
      prix_achat,
      notes,
      artistes,
      genres
    } = req.body;

    // Create disque
    const disque = await Disque.create({
      titre,
      titre_original,
      annee_sortie,
      nb_pistes,
      duree_totale,
      ean,
      catalogue_number,
      image_url,
      description,
      format_id: format_id || null,
      label_id: label_id || null,
      emplacement_id: emplacement_id || null,
      statut: statut || 'disponible',
      etat: etat || 'bon',
      date_acquisition,
      prix_indicatif,
      prix_achat,
      notes
    });

    // Add artistes
    if (artistes && artistes.length > 0) {
      for (const art of artistes) {
        await DisqueArtiste.create({
          disque_id: disque.id,
          artiste_id: art.id || art,
          role: art.role || 'principal'
        });
      }
    }

    // Add genres
    if (genres && genres.length > 0) {
      await disque.setGenresRef(genres);
    }

    // Fetch complete disque with associations
    const fullDisque = await Disque.findByPk(disque.id, {
      include: getDisqueIncludes()
    });

    res.status(201).json(fullDisque);
  } catch (error) {
    console.error('Create disque error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update disque
 * PUT /api/disques/:id
 */
const updateDisque = async (req, res) => {
  try {
    const disque = await Disque.findByPk(req.params.id);

    if (!disque) {
      return res.status(404).json({ error: 'Disque not found' });
    }

    const {
      titre,
      titre_original,
      annee_sortie,
      nb_pistes,
      duree_totale,
      ean,
      catalogue_number,
      image_url,
      description,
      format_id,
      label_id,
      emplacement_id,
      statut,
      etat,
      date_acquisition,
      prix_indicatif,
      prix_achat,
      notes,
      artistes,
      genres
    } = req.body;

    // Update disque fields
    await disque.update({
      titre,
      titre_original,
      annee_sortie,
      nb_pistes,
      duree_totale,
      ean,
      catalogue_number,
      image_url,
      description,
      format_id: format_id || null,
      label_id: label_id || null,
      emplacement_id: emplacement_id || null,
      statut,
      etat,
      date_acquisition,
      prix_indicatif,
      prix_achat,
      notes
    });

    // Update artistes
    if (artistes !== undefined) {
      await DisqueArtiste.destroy({ where: { disque_id: disque.id } });
      if (artistes && artistes.length > 0) {
        for (const art of artistes) {
          await DisqueArtiste.create({
            disque_id: disque.id,
            artiste_id: art.id || art,
            role: art.role || 'principal'
          });
        }
      }
    }

    // Update genres
    if (genres !== undefined) {
      await disque.setGenresRef(genres || []);
    }

    // Fetch updated disque
    const fullDisque = await Disque.findByPk(disque.id, {
      include: getDisqueIncludes()
    });

    res.json(fullDisque);
  } catch (error) {
    console.error('Update disque error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete disque
 * DELETE /api/disques/:id
 */
const deleteDisque = async (req, res) => {
  try {
    const disque = await Disque.findByPk(req.params.id);

    if (!disque) {
      return res.status(404).json({ error: 'Disque not found' });
    }

    // Check for active loans
    const activeLoans = await Emprunt.count({
      where: {
        disque_id: disque.id,
        date_retour_effective: null
      }
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Ce disque a des emprunts en cours'
      });
    }

    await disque.destroy();
    res.json({ message: 'Disque deleted successfully' });
  } catch (error) {
    console.error('Delete disque error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get statistics
 * GET /api/disques/stats
 */
const getStats = async (req, res) => {
  try {
    const totalDisques = await Disque.count();
    const disquesDisponibles = await Disque.count({ where: { statut: 'disponible' } });
    const disquesEmpruntes = await Disque.count({ where: { statut: 'emprunte' } });
    const totalArtistes = await Artiste.count({ where: { actif: true } });

    // Referentiels counts for admin
    const genresCount = await GenreMusical.count();
    const formatsCount = await FormatDisque.count();
    const artistesCount = await Artiste.count();
    const labelsCount = await LabelDisque.count();
    const emplacementsCount = await EmplacementDisque.count();

    res.json({
      totalDisques,
      disquesDisponibles,
      disquesEmpruntes,
      totalArtistes,
      // Referentiels counts
      genres: genresCount,
      formats: formatsCount,
      artistes: artistesCount,
      labels: labelsCount,
      emplacements: emplacementsCount
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

// ============ RÉFÉRENTIELS ============

/**
 * Get genres musicaux
 */
const getGenres = async (req, res) => {
  try {
    const genres = await GenreMusical.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get formats disques
 */
const getFormats = async (req, res) => {
  try {
    const formats = await FormatDisque.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    res.json({ formats });
  } catch (error) {
    console.error('Get formats error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get labels
 */
const getLabels = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { actif: true };

    if (search) {
      where.nom = { [Op.like]: `%${search}%` };
    }

    const labels = await LabelDisque.findAll({
      where,
      order: [['nom', 'ASC']],
      limit: 50
    });
    res.json({ labels });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get emplacements disques
 */
const getEmplacements = async (req, res) => {
  try {
    const emplacements = await EmplacementDisque.findAll({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });
    res.json({ emplacements });
  } catch (error) {
    console.error('Get emplacements error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get artistes
 */
const getArtistes = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { actif: true };

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { nom_scene: { [Op.like]: `%${search}%` } }
      ];
    }

    const artistes = await Artiste.findAll({
      where,
      order: [['nom', 'ASC']],
      limit: 100
    });
    res.json({ artistes });
  } catch (error) {
    console.error('Get artistes error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Create artiste
 */
const createArtiste = async (req, res) => {
  try {
    const artiste = await Artiste.create(req.body);
    res.status(201).json(artiste);
  } catch (error) {
    console.error('Create artiste error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Create label
 */
const createLabel = async (req, res) => {
  try {
    const label = await LabelDisque.create(req.body);
    res.status(201).json(label);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// ============ CRUD COMPLET RÉFÉRENTIELS ============

// === GENRES ===
const createGenre = async (req, res) => {
  try {
    const genre = await GenreMusical.create(req.body);
    res.status(201).json(genre);
  } catch (error) {
    console.error('Create genre error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un genre avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const updateGenre = async (req, res) => {
  try {
    const genre = await GenreMusical.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }
    await genre.update(req.body);
    res.json(genre);
  } catch (error) {
    console.error('Update genre error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un genre avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const deleteGenre = async (req, res) => {
  try {
    const genre = await GenreMusical.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }
    // Verifier si utilise
    const count = await DisqueGenre.count({ where: { genre_id: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Ce genre est utilise par ${count} disque(s). Desactivez-le plutot.`
      });
    }
    await genre.destroy();
    res.json({ message: 'Genre supprime' });
  } catch (error) {
    console.error('Delete genre error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const toggleGenre = async (req, res) => {
  try {
    const genre = await GenreMusical.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouve' });
    }
    await genre.update({ actif: !genre.actif });
    res.json(genre);
  } catch (error) {
    console.error('Toggle genre error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// === FORMATS ===
const createFormat = async (req, res) => {
  try {
    const format = await FormatDisque.create(req.body);
    res.status(201).json(format);
  } catch (error) {
    console.error('Create format error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un format avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const updateFormat = async (req, res) => {
  try {
    const format = await FormatDisque.findByPk(req.params.id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }
    await format.update(req.body);
    res.json(format);
  } catch (error) {
    console.error('Update format error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un format avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const deleteFormat = async (req, res) => {
  try {
    const format = await FormatDisque.findByPk(req.params.id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }
    const count = await Disque.count({ where: { format_id: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Ce format est utilise par ${count} disque(s). Desactivez-le plutot.`
      });
    }
    await format.destroy();
    res.json({ message: 'Format supprime' });
  } catch (error) {
    console.error('Delete format error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const toggleFormat = async (req, res) => {
  try {
    const format = await FormatDisque.findByPk(req.params.id);
    if (!format) {
      return res.status(404).json({ error: 'Format non trouve' });
    }
    await format.update({ actif: !format.actif });
    res.json(format);
  } catch (error) {
    console.error('Toggle format error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// === EMPLACEMENTS ===
const createEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementDisque.create(req.body);
    res.status(201).json(emplacement);
  } catch (error) {
    console.error('Create emplacement error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un emplacement avec ce libelle existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const updateEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementDisque.findByPk(req.params.id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }
    await emplacement.update(req.body);
    res.json(emplacement);
  } catch (error) {
    console.error('Update emplacement error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un emplacement avec ce libelle existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const deleteEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementDisque.findByPk(req.params.id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }
    const count = await Disque.count({ where: { emplacement_id: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Cet emplacement est utilise par ${count} disque(s). Desactivez-le plutot.`
      });
    }
    await emplacement.destroy();
    res.json({ message: 'Emplacement supprime' });
  } catch (error) {
    console.error('Delete emplacement error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const toggleEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementDisque.findByPk(req.params.id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouve' });
    }
    await emplacement.update({ actif: !emplacement.actif });
    res.json(emplacement);
  } catch (error) {
    console.error('Toggle emplacement error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// === ARTISTES ===
const updateArtiste = async (req, res) => {
  try {
    const artiste = await Artiste.findByPk(req.params.id);
    if (!artiste) {
      return res.status(404).json({ error: 'Artiste non trouve' });
    }
    await artiste.update(req.body);
    res.json(artiste);
  } catch (error) {
    console.error('Update artiste error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const deleteArtiste = async (req, res) => {
  try {
    const artiste = await Artiste.findByPk(req.params.id);
    if (!artiste) {
      return res.status(404).json({ error: 'Artiste non trouve' });
    }
    const count = await DisqueArtiste.count({ where: { artiste_id: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Cet artiste est utilise par ${count} disque(s). Desactivez-le plutot.`
      });
    }
    await artiste.destroy();
    res.json({ message: 'Artiste supprime' });
  } catch (error) {
    console.error('Delete artiste error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const toggleArtiste = async (req, res) => {
  try {
    const artiste = await Artiste.findByPk(req.params.id);
    if (!artiste) {
      return res.status(404).json({ error: 'Artiste non trouve' });
    }
    await artiste.update({ actif: !artiste.actif });
    res.json(artiste);
  } catch (error) {
    console.error('Toggle artiste error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// === LABELS ===
const updateLabel = async (req, res) => {
  try {
    const label = await LabelDisque.findByPk(req.params.id);
    if (!label) {
      return res.status(404).json({ error: 'Label non trouve' });
    }
    await label.update(req.body);
    res.json(label);
  } catch (error) {
    console.error('Update label error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Un label avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const deleteLabel = async (req, res) => {
  try {
    const label = await LabelDisque.findByPk(req.params.id);
    if (!label) {
      return res.status(404).json({ error: 'Label non trouve' });
    }
    const count = await Disque.count({ where: { label_id: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Ce label est utilise par ${count} disque(s). Desactivez-le plutot.`
      });
    }
    await label.destroy();
    res.json({ message: 'Label supprime' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

const toggleLabel = async (req, res) => {
  try {
    const label = await LabelDisque.findByPk(req.params.id);
    if (!label) {
      return res.status(404).json({ error: 'Label non trouve' });
    }
    await label.update({ actif: !label.actif });
    res.json(label);
  } catch (error) {
    console.error('Toggle label error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

module.exports = {
  getAllDisques,
  getDisqueById,
  createDisque,
  updateDisque,
  deleteDisque,
  getStats,
  // Genres
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
  toggleGenre,
  // Formats
  getFormats,
  createFormat,
  updateFormat,
  deleteFormat,
  toggleFormat,
  // Emplacements
  getEmplacements,
  createEmplacement,
  updateEmplacement,
  deleteEmplacement,
  toggleEmplacement,
  // Artistes
  getArtistes,
  createArtiste,
  updateArtiste,
  deleteArtiste,
  toggleArtiste,
  // Labels
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  toggleLabel
};
