const {
  Livre, Emprunt, Utilisateur,
  GenreLitteraire, FormatLivre, CollectionLivre, EmplacementLivre,
  Auteur, Editeur, Theme, Langue,
  LivreAuteur, LivreEditeur, LivreGenre, LivreTheme, LivreLangue,
  RoleContributeurLivre
} = require('../models');
const { Op } = require('sequelize');

// Configuration des includes pour les associations
// Note: auteursRef inclut maintenant le champ 'role' de la table de jonction
const INCLUDE_REFS = [
  { model: GenreLitteraire, as: 'genresRef', through: { attributes: [] } },
  { model: Theme, as: 'themesRef', through: { attributes: [] } },
  { model: Langue, as: 'languesRef', through: { attributes: [] } },
  { model: Auteur, as: 'auteursRef', through: { attributes: ['role'] } },
  { model: Editeur, as: 'editeursRef', through: { attributes: [] } },
  { model: FormatLivre, as: 'formatRef' },
  { model: CollectionLivre, as: 'collectionRef' },
  { model: EmplacementLivre, as: 'emplacementRef' }
];

/**
 * Get all livres with optional filters and search
 * GET /api/livres?statut=disponible&genre_id=1&search=asterix&include_refs=true
 */
const getAllLivres = async (req, res) => {
  try {
    const {
      statut, genre_id, theme_id, format_id, collection_id,
      search, page = 1, limit = 50,
      include_refs = 'false'
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (format_id) {
      where.format_id = parseInt(format_id);
    }

    if (collection_id) {
      where.collection_id = parseInt(collection_id);
    }

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { sous_titre: { [Op.like]: `%${search}%` } },
        { isbn: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    // Configuration de la requête
    const queryOptions = {
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['titre', 'ASC']],
      distinct: true
    };

    // Inclure les références si demandé
    if (include_refs === 'true') {
      queryOptions.include = INCLUDE_REFS;
    }

    // Filtres par ID de référentiel (nécessite des sous-requêtes)
    if (genre_id) {
      const livreIds = await LivreGenre.findAll({
        attributes: ['livre_id'],
        where: { genre_id: parseInt(genre_id) }
      });
      where.id = { [Op.in]: livreIds.map(l => l.livre_id) };
    }

    if (theme_id) {
      const livreIds = await LivreTheme.findAll({
        attributes: ['livre_id'],
        where: { theme_id: parseInt(theme_id) }
      });
      if (where.id) {
        where.id[Op.in] = where.id[Op.in].filter(id =>
          livreIds.map(l => l.livre_id).includes(id)
        );
      } else {
        where.id = { [Op.in]: livreIds.map(l => l.livre_id) };
      }
    }

    const { count, rows } = await Livre.findAndCountAll(queryOptions);

    res.json({
      livres: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get livres error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get livre by ID with all references
 * GET /api/livres/:id
 */
const getLivreById = async (req, res) => {
  try {
    const { id } = req.params;

    const livre = await Livre.findByPk(id, {
      include: INCLUDE_REFS
    });

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    res.json({ livre });
  } catch (error) {
    console.error('Get livre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Synchronise les relations many-to-many pour un livre
 * Gère aussi la création de nouveaux auteurs/éditeurs si {nouveau: 'nom'} est passé
 */
async function syncLivreRelations(livre, data) {
  // Genres littéraires
  if (data.genre_ids !== undefined) {
    await LivreGenre.destroy({ where: { livre_id: livre.id } });
    if (data.genre_ids && data.genre_ids.length > 0) {
      const validIds = data.genre_ids.filter(id => typeof id === 'number' && !isNaN(id));
      if (validIds.length > 0) {
        await LivreGenre.bulkCreate(
          validIds.map(id => ({ livre_id: livre.id, genre_id: id }))
        );
      }
    }
  }

  // Thèmes
  if (data.theme_ids !== undefined) {
    await LivreTheme.destroy({ where: { livre_id: livre.id } });
    if (data.theme_ids && data.theme_ids.length > 0) {
      const validIds = data.theme_ids.filter(id => typeof id === 'number' && !isNaN(id));
      if (validIds.length > 0) {
        await LivreTheme.bulkCreate(
          validIds.map(id => ({ livre_id: livre.id, theme_id: id }))
        );
      }
    }
  }

  // Langues
  if (data.langue_ids !== undefined) {
    await LivreLangue.destroy({ where: { livre_id: livre.id } });
    if (data.langue_ids && data.langue_ids.length > 0) {
      const validIds = data.langue_ids.filter(id => typeof id === 'number' && !isNaN(id));
      if (validIds.length > 0) {
        await LivreLangue.bulkCreate(
          validIds.map(id => ({ livre_id: livre.id, langue_id: id }))
        );
      }
    }
  }

  // Contributeurs avec rôles (nouveau format)
  // Format attendu: [{auteur_id: 1, role: 'auteur'}, {nouveau: 'Nom', role: 'scenariste'}]
  if (data.contributeurs !== undefined) {
    await LivreAuteur.destroy({ where: { livre_id: livre.id } });
    if (data.contributeurs && data.contributeurs.length > 0) {
      const records = [];
      for (const item of data.contributeurs) {
        let auteurId = item.auteur_id;
        const role = item.role || 'auteur';

        if (item.nouveau) {
          // Créer un nouvel auteur
          const [auteur] = await Auteur.findOrCreate({
            where: { nom: item.nouveau },
            defaults: { nom: item.nouveau }
          });
          auteurId = auteur.id;
        }

        if (auteurId) {
          records.push({ livre_id: livre.id, auteur_id: auteurId, role });
        }
      }
      if (records.length > 0) {
        await LivreAuteur.bulkCreate(records, { ignoreDuplicates: true });
      }
    }
  }
  // Rétrocompatibilité: ancien format auteur_ids (sans rôle, défaut = 'auteur')
  else if (data.auteur_ids !== undefined) {
    await LivreAuteur.destroy({ where: { livre_id: livre.id } });
    if (data.auteur_ids && data.auteur_ids.length > 0) {
      const records = [];
      for (const item of data.auteur_ids) {
        if (typeof item === 'number') {
          records.push({ livre_id: livre.id, auteur_id: item, role: 'auteur' });
        } else if (item && item.nouveau) {
          // Créer un nouvel auteur
          const [auteur] = await Auteur.findOrCreate({
            where: { nom: item.nouveau },
            defaults: { nom: item.nouveau }
          });
          records.push({ livre_id: livre.id, auteur_id: auteur.id, role: 'auteur' });
        }
      }
      if (records.length > 0) {
        await LivreAuteur.bulkCreate(records, { ignoreDuplicates: true });
      }
    }
  }

  // Éditeurs (peut contenir des IDs ou {nouveau: 'nom'})
  if (data.editeur_ids !== undefined) {
    await LivreEditeur.destroy({ where: { livre_id: livre.id } });
    if (data.editeur_ids && data.editeur_ids.length > 0) {
      const editeurIds = [];
      for (const item of data.editeur_ids) {
        if (typeof item === 'number') {
          editeurIds.push(item);
        } else if (item && item.nouveau) {
          // Créer un nouvel éditeur
          const [editeur] = await Editeur.findOrCreate({
            where: { nom: item.nouveau },
            defaults: { nom: item.nouveau }
          });
          editeurIds.push(editeur.id);
        }
      }
      if (editeurIds.length > 0) {
        await LivreEditeur.bulkCreate(
          editeurIds.map(id => ({ livre_id: livre.id, editeur_id: id }))
        );
      }
    }
  }
}

/**
 * Create new livre
 * POST /api/livres
 */
const createLivre = async (req, res) => {
  try {
    const {
      titre, sous_titre, isbn, tome,
      annee_publication, nb_pages, resume, notes,
      format_id, collection_id, emplacement_id,
      prix_indicatif, prix_achat, date_acquisition,
      etat, image_url, code_ean, valeur_achat,
      // Relations normalisées (tableaux d'IDs) - accepte les deux formats
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids,
      genres, themes, langues, auteurs, editeurs,
      // Nouveau format contributeurs avec rôles
      contributeurs
    } = req.body;

    // Validate required fields
    if (!titre) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Titre is required'
      });
    }

    // Construire l'objet de création (ne pas inclure code_barre si vide pour laisser le hook le générer)
    const createData = {
      titre,
      sous_titre,
      isbn,
      tome,
      annee_publication,
      nb_pages,
      resume,
      notes,
      format_id,
      collection_id,
      emplacement_id,
      prix_indicatif,
      prix_achat: prix_achat || valeur_achat,
      date_acquisition,
      etat,
      statut: 'disponible',
      image_url
    };

    // Ajouter code_barre seulement si code_ean est fourni
    if (code_ean) {
      createData.code_barre = code_ean;
    }

    const livre = await Livre.create(createData);

    // Synchroniser les relations many-to-many (accepte les deux formats de noms)
    await syncLivreRelations(livre, {
      genre_ids: genre_ids || genres,
      theme_ids: theme_ids || themes,
      langue_ids: langue_ids || langues,
      contributeurs,
      auteur_ids: auteur_ids || auteurs,
      editeur_ids: editeur_ids || editeurs
    });

    // Recharger avec les associations
    const livreComplet = await Livre.findByPk(livre.id, { include: INCLUDE_REFS });

    res.status(201).json({
      message: 'Livre created successfully',
      livre: livreComplet
    });
  } catch (error) {
    console.error('Create livre error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Duplicate error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update livre
 * PUT /api/livres/:id
 */
const updateLivre = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre, sous_titre, isbn, tome,
      annee_publication, nb_pages, resume, notes,
      format_id, collection_id, emplacement_id,
      prix_indicatif, prix_achat, date_acquisition,
      etat, statut, image_url, code_ean, valeur_achat,
      // Relations normalisées - accepte les deux formats
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids,
      genres, themes, langues, auteurs, editeurs,
      // Nouveau format contributeurs avec rôles
      contributeurs
    } = req.body;

    const livre = await Livre.findByPk(id);

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    // Update scalar fields
    if (titre) livre.titre = titre;
    if (sous_titre !== undefined) livre.sous_titre = sous_titre;
    if (isbn !== undefined) livre.isbn = isbn;
    if (tome !== undefined) livre.tome = tome;
    if (annee_publication !== undefined) livre.annee_publication = annee_publication;
    if (nb_pages !== undefined) livre.nb_pages = nb_pages;
    if (resume !== undefined) livre.resume = resume;
    if (notes !== undefined) livre.notes = notes;
    if (format_id !== undefined) livre.format_id = format_id;
    if (collection_id !== undefined) livre.collection_id = collection_id;
    if (emplacement_id !== undefined) livre.emplacement_id = emplacement_id;
    if (prix_indicatif !== undefined) livre.prix_indicatif = prix_indicatif;
    if (prix_achat !== undefined) livre.prix_achat = prix_achat;
    if (date_acquisition !== undefined) livre.date_acquisition = date_acquisition;
    if (etat !== undefined) livre.etat = etat;
    if (statut) livre.statut = statut;
    if (image_url !== undefined) livre.image_url = image_url;
    // Ne mettre à jour code_barre que si code_ean est fourni et non vide
    if (code_ean) livre.code_barre = code_ean;
    if (valeur_achat !== undefined) livre.prix_achat = valeur_achat;

    await livre.save();

    // Synchroniser les relations many-to-many (accepte les deux formats)
    await syncLivreRelations(livre, {
      genre_ids: genre_ids || genres,
      theme_ids: theme_ids || themes,
      langue_ids: langue_ids || langues,
      contributeurs,
      auteur_ids: auteur_ids || auteurs,
      editeur_ids: editeur_ids || editeurs
    });

    // Recharger avec les associations
    const livreComplet = await Livre.findByPk(livre.id, { include: INCLUDE_REFS });

    res.json({
      message: 'Livre updated successfully',
      livre: livreComplet
    });
  } catch (error) {
    console.error('Update livre error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Duplicate error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete livre
 * DELETE /api/livres/:id
 */
const deleteLivre = async (req, res) => {
  try {
    const { id } = req.params;

    const livre = await Livre.findByPk(id);

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    // Check if livre has active emprunts
    const activeEmprunts = await Emprunt.count({
      where: {
        livre_id: id,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });

    if (activeEmprunts > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Ce livre est actuellement emprunté. Veuillez attendre le retour.'
      });
    }

    await livre.destroy();

    res.json({
      message: 'Livre deleted successfully'
    });
  } catch (error) {
    console.error('Delete livre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get genres littéraires
 * GET /api/livres/genres
 */
const getGenres = async (req, res) => {
  try {
    const genres = await GenreLitteraire.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get formats livres
 * GET /api/livres/formats
 */
const getFormats = async (req, res) => {
  try {
    const formats = await FormatLivre.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    res.json({ formats });
  } catch (error) {
    console.error('Get formats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get collections livres
 * GET /api/livres/collections
 */
const getCollections = async (req, res) => {
  try {
    const collections = await CollectionLivre.findAll({
      where: { actif: true },
      include: [{ model: Editeur, as: 'editeur' }],
      order: [['nom', 'ASC']]
    });

    res.json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get emplacements livres
 * GET /api/livres/emplacements
 */
const getEmplacements = async (req, res) => {
  try {
    const emplacements = await EmplacementLivre.findAll({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });

    res.json({ emplacements });
  } catch (error) {
    console.error('Get emplacements error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get statistics for livres
 * GET /api/livres/stats
 */
const getStats = async (req, res) => {
  try {
    const total = await Livre.count();
    const disponibles = await Livre.count({ where: { statut: 'disponible' } });
    const empruntes = await Livre.count({ where: { statut: 'emprunte' } });

    // Stats des referentiels
    const genres = await GenreLitteraire.count();
    const formats = await FormatLivre.count();
    const collections = await CollectionLivre.count();
    const emplacements = await EmplacementLivre.count();

    res.json({
      stats: {
        total,
        disponibles,
        empruntes
      },
      // Referentiels counts
      genres,
      formats,
      collections,
      emplacements
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get roles contributeurs disponibles
 * GET /api/livres/roles-contributeurs
 */
const getRolesContributeurs = async (req, res) => {
  try {
    const roles = await RoleContributeurLivre.findAll({
      where: { actif: true },
      order: [['ordre', 'ASC']]
    });

    res.json({ roles });
  } catch (error) {
    console.error('Get roles contributeurs error:', error);
    // Fallback si la table n'existe pas encore
    res.json({
      roles: [
        { code: 'auteur', libelle: 'Auteur', ordre: 1 },
        { code: 'scenariste', libelle: 'Scénariste', ordre: 2 },
        { code: 'dessinateur', libelle: 'Dessinateur', ordre: 3 },
        { code: 'coloriste', libelle: 'Coloriste', ordre: 4 },
        { code: 'illustrateur', libelle: 'Illustrateur', ordre: 5 },
        { code: 'traducteur', libelle: 'Traducteur', ordre: 6 },
        { code: 'adaptateur', libelle: 'Adaptateur', ordre: 7 },
        { code: 'prefacier', libelle: 'Préfacier', ordre: 8 }
      ]
    });
  }
};

module.exports = {
  getAllLivres,
  getLivreById,
  createLivre,
  updateLivre,
  deleteLivre,
  getGenres,
  getFormats,
  getCollections,
  getEmplacements,
  getStats,
  getRolesContributeurs
};
