/**
 * Referentiels Controller
 * Gestion des tables de référence pour la normalisation des jeux
 */

const {
  Categorie,
  Theme,
  Mecanisme,
  Langue,
  Editeur,
  Auteur,
  Illustrateur,
  Gamme,
  EmplacementJeu,
  Jeu
} = require('../models');
const { Op } = require('sequelize');

// ========================================
// Helpers génériques
// ========================================

/**
 * Crée un controller CRUD générique pour une table de référence
 */
function createCrudController(Model, options = {}) {
  const {
    labelField = 'nom',
    searchFields = ['nom'],
    defaultOrder = [['nom', 'ASC']],
    countAssociation = null
  } = options;

  return {
    // GET /api/referentiels/:type
    getAll: async (req, res) => {
      try {
        const { actif, search, limit, offset } = req.query;

        const where = {};
        if (actif !== undefined) {
          where.actif = actif === 'true';
        }
        if (search) {
          where[Op.or] = searchFields.map(field => ({
            [field]: { [Op.like]: `%${search}%` }
          }));
        }

        const queryOptions = {
          where,
          order: defaultOrder
        };

        if (limit) {
          queryOptions.limit = parseInt(limit);
          queryOptions.offset = parseInt(offset) || 0;
        }

        const items = await Model.findAndCountAll(queryOptions);

        res.json({
          items: items.rows,
          total: items.count,
          limit: queryOptions.limit,
          offset: queryOptions.offset
        });
      } catch (error) {
        console.error(`Erreur getAll ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // GET /api/referentiels/:type/:id
    getById: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.json(item);
      } catch (error) {
        console.error(`Erreur getById ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // POST /api/referentiels/:type
    create: async (req, res) => {
      try {
        const item = await Model.create(req.body);
        res.status(201).json(item);
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({
            error: 'Duplicate',
            message: `Un élément avec ce nom existe déjà`
          });
        }
        console.error(`Erreur create ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // PUT /api/referentiels/:type/:id
    update: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Not found' });
        }
        await item.update(req.body);
        res.json(item);
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({
            error: 'Duplicate',
            message: `Un élément avec ce nom existe déjà`
          });
        }
        console.error(`Erreur update ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // DELETE /api/referentiels/:type/:id
    delete: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Not found' });
        }
        await item.destroy();
        res.json({ success: true });
      } catch (error) {
        if (error.name === 'SequelizeForeignKeyConstraintError') {
          return res.status(400).json({
            error: 'Constraint',
            message: `Impossible de supprimer: cet élément est utilisé par des jeux`
          });
        }
        console.error(`Erreur delete ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // PATCH /api/referentiels/:type/:id/toggle
    toggleActif: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Not found' });
        }
        await item.update({ actif: !item.actif });
        res.json(item);
      } catch (error) {
        console.error(`Erreur toggleActif ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    },

    // GET /api/referentiels/:type/search
    search: async (req, res) => {
      try {
        const { q, limit = 20 } = req.query;
        if (!q || q.length < 2) {
          return res.json([]);
        }

        const items = await Model.findAll({
          where: {
            [labelField]: { [Op.like]: `%${q}%` },
            actif: true
          },
          order: defaultOrder,
          limit: parseInt(limit)
        });

        res.json(items);
      } catch (error) {
        console.error(`Erreur search ${Model.name}:`, error);
        res.status(500).json({ error: 'Server error', message: error.message });
      }
    }
  };
}

// ========================================
// Controllers spécifiques
// ========================================

const categorieController = createCrudController(Categorie);
const themeController = createCrudController(Theme);
const mecanismeController = createCrudController(Mecanisme);
const langueController = createCrudController(Langue, { searchFields: ['nom', 'code'] });
const editeurController = createCrudController(Editeur, { searchFields: ['nom', 'pays'] });
const auteurController = createCrudController(Auteur, { searchFields: ['nom', 'prenom'] });
const illustrateurController = createCrudController(Illustrateur, { searchFields: ['nom', 'prenom'] });
const gammeController = createCrudController(Gamme);
const emplacementController = createCrudController(EmplacementJeu, {
  labelField: 'libelle',
  searchFields: ['libelle', 'code'],
  defaultOrder: [['libelle', 'ASC']]
});

// ========================================
// Statistiques des référentiels
// ========================================

const getStats = async (req, res) => {
  try {
    const [
      categoriesCount,
      themesCount,
      mecanismesCount,
      languesCount,
      editeursCount,
      auteursCount,
      illustrateursCount,
      gammesCount,
      emplacementsCount
    ] = await Promise.all([
      Categorie.count(),
      Theme.count(),
      Mecanisme.count(),
      Langue.count(),
      Editeur.count(),
      Auteur.count(),
      Illustrateur.count(),
      Gamme.count(),
      EmplacementJeu.count()
    ]);

    res.json({
      categories: categoriesCount,
      themes: themesCount,
      mecanismes: mecanismesCount,
      langues: languesCount,
      editeurs: editeursCount,
      auteurs: auteursCount,
      illustrateurs: illustrateursCount,
      gammes: gammesCount,
      emplacements: emplacementsCount,
      total: categoriesCount + themesCount + mecanismesCount + languesCount +
             editeursCount + auteursCount + illustrateursCount + gammesCount + emplacementsCount
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// ========================================
// Export
// ========================================

module.exports = {
  // Catégories
  getAllCategories: categorieController.getAll,
  getCategorieById: categorieController.getById,
  createCategorie: categorieController.create,
  updateCategorie: categorieController.update,
  deleteCategorie: categorieController.delete,
  toggleCategorieActif: categorieController.toggleActif,
  searchCategories: categorieController.search,

  // Thèmes
  getAllThemes: themeController.getAll,
  getThemeById: themeController.getById,
  createTheme: themeController.create,
  updateTheme: themeController.update,
  deleteTheme: themeController.delete,
  toggleThemeActif: themeController.toggleActif,
  searchThemes: themeController.search,

  // Mécanismes
  getAllMecanismes: mecanismeController.getAll,
  getMecanismeById: mecanismeController.getById,
  createMecanisme: mecanismeController.create,
  updateMecanisme: mecanismeController.update,
  deleteMecanisme: mecanismeController.delete,
  toggleMecanismeActif: mecanismeController.toggleActif,
  searchMecanismes: mecanismeController.search,

  // Langues
  getAllLangues: langueController.getAll,
  getLangueById: langueController.getById,
  createLangue: langueController.create,
  updateLangue: langueController.update,
  deleteLangue: langueController.delete,
  toggleLangueActif: langueController.toggleActif,
  searchLangues: langueController.search,

  // Éditeurs
  getAllEditeurs: editeurController.getAll,
  getEditeurById: editeurController.getById,
  createEditeur: editeurController.create,
  updateEditeur: editeurController.update,
  deleteEditeur: editeurController.delete,
  toggleEditeurActif: editeurController.toggleActif,
  searchEditeurs: editeurController.search,

  // Auteurs
  getAllAuteurs: auteurController.getAll,
  getAuteurById: auteurController.getById,
  createAuteur: auteurController.create,
  updateAuteur: auteurController.update,
  deleteAuteur: auteurController.delete,
  toggleAuteurActif: auteurController.toggleActif,
  searchAuteurs: auteurController.search,

  // Illustrateurs
  getAllIllustrateurs: illustrateurController.getAll,
  getIllustrateurById: illustrateurController.getById,
  createIllustrateur: illustrateurController.create,
  updateIllustrateur: illustrateurController.update,
  deleteIllustrateur: illustrateurController.delete,
  toggleIllustrateurActif: illustrateurController.toggleActif,
  searchIllustrateurs: illustrateurController.search,

  // Gammes
  getAllGammes: gammeController.getAll,
  getGammeById: gammeController.getById,
  createGamme: gammeController.create,
  updateGamme: gammeController.update,
  deleteGamme: gammeController.delete,
  toggleGammeActif: gammeController.toggleActif,
  searchGammes: gammeController.search,

  // Emplacements
  getAllEmplacements: emplacementController.getAll,
  getEmplacementById: emplacementController.getById,
  createEmplacement: emplacementController.create,
  updateEmplacement: emplacementController.update,
  deleteEmplacement: emplacementController.delete,
  toggleEmplacementActif: emplacementController.toggleActif,
  searchEmplacements: emplacementController.search,

  // Stats
  getStats
};
