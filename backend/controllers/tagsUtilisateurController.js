/**
 * Controller pour les Tags Utilisateur
 * CRUD complet pour la gestion des tags attribuables aux usagers
 */

const { TagUtilisateur, UtilisateurTag, Utilisateur, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Liste tous les tags
 */
const getAll = async (req, res) => {
  try {
    const { actif, structure_id } = req.query;

    const where = {};

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    // Filtrer par structure (null = global)
    if (structure_id) {
      where[Op.or] = [
        { structure_id: null },
        { structure_id: structure_id }
      ];
    }

    const tags = await TagUtilisateur.findAll({
      where,
      order: [['ordre', 'ASC'], ['libelle', 'ASC']],
      include: [
        {
          model: Utilisateur,
          as: 'utilisateurs',
          attributes: ['id'],
          through: { attributes: [] }
        }
      ]
    });

    // Ajouter le nombre d'utilisateurs par tag
    const tagsWithCount = tags.map(tag => {
      const tagJson = tag.toJSON();
      tagJson.nb_utilisateurs = tagJson.utilisateurs ? tagJson.utilisateurs.length : 0;
      delete tagJson.utilisateurs;
      return tagJson;
    });

    res.json(tagsWithCount);
  } catch (error) {
    logger.error('Erreur lors de la recuperation des tags:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Recupere un tag par ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await TagUtilisateur.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateurs',
          attributes: ['id', 'nom', 'prenom', 'email'],
          through: { attributes: ['date_attribution'] }
        }
      ]
    });

    if (!tag) {
      return res.status(404).json({ message: 'Tag non trouve' });
    }

    res.json(tag);
  } catch (error) {
    logger.error('Erreur lors de la recuperation du tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Cree un nouveau tag
 */
const create = async (req, res) => {
  try {
    const { code, libelle, description, couleur, icone, ordre, actif, structure_id } = req.body;

    // Validation
    if (!code || !libelle) {
      return res.status(400).json({ message: 'Le code et le libelle sont requis' });
    }

    // Verifier unicite du code
    const existingTag = await TagUtilisateur.findOne({
      where: { code: code.toUpperCase().replace(/\s+/g, '_') }
    });

    if (existingTag) {
      return res.status(400).json({ message: 'Un tag avec ce code existe deja' });
    }

    const tag = await TagUtilisateur.create({
      code: code.toUpperCase().replace(/\s+/g, '_'),
      libelle,
      description,
      couleur: couleur || '#6c757d',
      icone: icone || 'bi-tag',
      ordre: ordre || 0,
      actif: actif !== false,
      structure_id: structure_id || null
    });

    logger.info(`Tag utilisateur cree: ${tag.code} (ID: ${tag.id})`);
    res.status(201).json(tag);
  } catch (error) {
    logger.error('Erreur lors de la creation du tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Met a jour un tag
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { libelle, description, couleur, icone, ordre, actif, structure_id } = req.body;

    const tag = await TagUtilisateur.findByPk(id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag non trouve' });
    }

    // Mise a jour (le code ne peut pas etre modifie)
    await tag.update({
      libelle: libelle !== undefined ? libelle : tag.libelle,
      description: description !== undefined ? description : tag.description,
      couleur: couleur !== undefined ? couleur : tag.couleur,
      icone: icone !== undefined ? icone : tag.icone,
      ordre: ordre !== undefined ? ordre : tag.ordre,
      actif: actif !== undefined ? actif : tag.actif,
      structure_id: structure_id !== undefined ? structure_id : tag.structure_id
    });

    logger.info(`Tag utilisateur mis a jour: ${tag.code} (ID: ${tag.id})`);
    res.json(tag);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprime un tag (soft delete via actif = false ou hard delete si non utilise)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const tag = await TagUtilisateur.findByPk(id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag non trouve' });
    }

    // Verifier si le tag est utilise
    const usageCount = await UtilisateurTag.count({
      where: { tag_utilisateur_id: id }
    });

    if (usageCount > 0 && force !== 'true') {
      // Soft delete: desactiver le tag
      await tag.update({ actif: false });
      logger.info(`Tag utilisateur desactive: ${tag.code} (ID: ${tag.id}) - utilise par ${usageCount} utilisateur(s)`);
      return res.json({
        message: `Tag desactive (utilise par ${usageCount} utilisateur(s))`,
        softDeleted: true
      });
    }

    // Hard delete
    await UtilisateurTag.destroy({ where: { tag_utilisateur_id: id } });
    await tag.destroy();

    logger.info(`Tag utilisateur supprime: ${tag.code} (ID: ${tag.id})`);
    res.json({ message: 'Tag supprime' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Reordonne les tags
 */
const reorder = async (req, res) => {
  try {
    const { ordres } = req.body; // [{ id: 1, ordre: 0 }, { id: 2, ordre: 1 }, ...]

    if (!Array.isArray(ordres)) {
      return res.status(400).json({ message: 'Format invalide' });
    }

    const t = await sequelize.transaction();

    try {
      for (const item of ordres) {
        await TagUtilisateur.update(
          { ordre: item.ordre },
          { where: { id: item.id }, transaction: t }
        );
      }

      await t.commit();
      res.json({ message: 'Ordre mis a jour' });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Erreur lors du reordonnement des tags:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Liste les tags actifs (pour les selects)
 */
const getActifs = async (req, res) => {
  try {
    const { structure_id } = req.query;

    const where = { actif: true };

    if (structure_id) {
      where[Op.or] = [
        { structure_id: null },
        { structure_id: structure_id }
      ];
    }

    const tags = await TagUtilisateur.findAll({
      where,
      attributes: ['id', 'code', 'libelle', 'couleur', 'icone'],
      order: [['ordre', 'ASC'], ['libelle', 'ASC']]
    });

    res.json(tags);
  } catch (error) {
    logger.error('Erreur lors de la recuperation des tags actifs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  reorder,
  getActifs
};
