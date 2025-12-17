/**
 * Controller pour la gestion des chartes usager (admin)
 * CRUD, activation, duplication
 */

const charteService = require('../services/charteService');
const logger = require('../utils/logger');

const charteController = {
  /**
   * GET /api/chartes
   * Liste toutes les chartes avec pagination
   */
  async getAll(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await charteService.getAllChartes({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        chartes: result.rows,
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / parseInt(limit))
      });
    } catch (error) {
      logger.error('Erreur getAll chartes', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * GET /api/chartes/active
   * Recupere la charte active
   */
  async getActive(req, res) {
    try {
      const charte = await charteService.getCharteActive();

      if (!charte) {
        return res.status(404).json({ error: 'Aucune charte active' });
      }

      res.json(charte);
    } catch (error) {
      logger.error('Erreur getActive charte', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * GET /api/chartes/:id
   * Recupere une charte par son ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const charte = await charteService.getCharteById(id);

      if (!charte) {
        return res.status(404).json({ error: 'Charte non trouvee' });
      }

      res.json(charte);
    } catch (error) {
      logger.error('Erreur getById charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/chartes
   * Cree une nouvelle charte
   */
  async create(req, res) {
    try {
      const { titre, contenu, date_publication } = req.body;

      if (!titre || !contenu) {
        return res.status(400).json({ error: 'Le titre et le contenu sont requis' });
      }

      const charte = await charteService.createCharte({
        titre,
        contenu,
        date_publication
      });

      logger.info('Charte creee', { charteId: charte.id, version: charte.version, userId: req.user?.id });
      res.status(201).json(charte);
    } catch (error) {
      logger.error('Erreur create charte', { error: error.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * PUT /api/chartes/:id
   * Met a jour une charte existante
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { titre, contenu, date_publication } = req.body;

      const result = await charteService.updateCharte(id, {
        titre,
        contenu,
        date_publication
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('Charte mise a jour', { charteId: id, userId: req.user?.id });
      res.json(result.charte);
    } catch (error) {
      logger.error('Erreur update charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * DELETE /api/chartes/:id
   * Supprime une charte
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await charteService.deleteCharte(id);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('Charte supprimee', { charteId: id, userId: req.user?.id });
      res.json({ message: 'Charte supprimee' });
    } catch (error) {
      logger.error('Erreur delete charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/chartes/:id/activer
   * Active une charte (desactive les autres)
   */
  async activer(req, res) {
    try {
      const { id } = req.params;

      const result = await charteService.activerCharte(id);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('Charte activee', { charteId: id, userId: req.user?.id });
      res.json(result.charte);
    } catch (error) {
      logger.error('Erreur activer charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * POST /api/chartes/:id/dupliquer
   * Duplique une charte pour creer une nouvelle version
   */
  async dupliquer(req, res) {
    try {
      const { id } = req.params;

      const result = await charteService.dupliquerCharte(id);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('Charte dupliquee', {
        charteOriginale: id,
        nouvelleCharte: result.charte.id,
        version: result.charte.version,
        userId: req.user?.id
      });
      res.status(201).json(result.charte);
    } catch (error) {
      logger.error('Erreur dupliquer charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * GET /api/chartes/:id/stats
   * Recupere les statistiques d'une charte
   */
  async getStats(req, res) {
    try {
      const { id } = req.params;

      const result = await charteService.getCharteStats(id);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result.stats);
    } catch (error) {
      logger.error('Erreur getStats charte', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

module.exports = charteController;
