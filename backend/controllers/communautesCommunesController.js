/**
 * Controller CommunautesCommunes
 * CRUD pour les communautes de communes (intercommunalites)
 */

const { CommunauteCommunes, CommunauteCommunesMembre, Commune, Structure, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/communautes-communes
 * Liste toutes les communautes de communes
 */
async function getAll(req, res) {
  try {
    const { actif, structure_id } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }
    if (structure_id) {
      where.structure_id = structure_id;
    }

    const communautes = await CommunauteCommunes.findAll({
      where,
      include: [
        {
          model: Commune,
          as: 'communes',
          attributes: ['id', 'nom', 'code_postal', 'code_insee'],
          through: { attributes: [] }
        }
      ],
      order: [['nom', 'ASC']]
    });

    res.json({
      success: true,
      data: communautes
    });
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur getAll:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des communautes'
    });
  }
}

/**
 * GET /api/communautes-communes/:id
 * Detail d'une communaute avec ses communes membres
 */
async function getById(req, res) {
  try {
    const communaute = await CommunauteCommunes.findByPk(req.params.id, {
      include: [
        {
          model: Commune,
          as: 'communes',
          attributes: ['id', 'nom', 'code_postal', 'code_insee', 'departement'],
          through: { attributes: [] }
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'nom']
        }
      ]
    });

    if (!communaute) {
      return res.status(404).json({
        success: false,
        message: 'Communaute non trouvee'
      });
    }

    res.json({
      success: true,
      data: communaute
    });
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur getById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation'
    });
  }
}

/**
 * POST /api/communautes-communes
 * Creer une nouvelle communaute
 */
async function create(req, res) {
  const t = await sequelize.transaction();

  try {
    const { code, nom, code_siren, type_epci, departement, description, communes } = req.body;

    // Verifier unicite du code
    const existing = await CommunauteCommunes.findOne({ where: { code } });
    if (existing) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Ce code existe deja'
      });
    }

    // Creer la communaute
    const communaute = await CommunauteCommunes.create({
      code,
      nom,
      code_siren,
      type_epci: type_epci || 'CC',
      departement,
      description,
      structure_id: req.structureId || null,
      actif: true
    }, { transaction: t });

    // Ajouter les communes membres
    if (communes && communes.length > 0) {
      const membres = communes.map(communeId => ({
        communaute_id: communaute.id,
        commune_id: communeId
      }));
      await CommunauteCommunesMembre.bulkCreate(membres, { transaction: t });
    }

    await t.commit();

    // Recharger avec les communes
    const result = await CommunauteCommunes.findByPk(communaute.id, {
      include: [{
        model: Commune,
        as: 'communes',
        through: { attributes: [] }
      }]
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    await t.rollback();
    console.error('[CommunautesCommunes] Erreur create:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la creation'
    });
  }
}

/**
 * PUT /api/communautes-communes/:id
 * Modifier une communaute
 */
async function update(req, res) {
  const t = await sequelize.transaction();

  try {
    const communaute = await CommunauteCommunes.findByPk(req.params.id);
    if (!communaute) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Communaute non trouvee'
      });
    }

    const { code, nom, code_siren, type_epci, departement, description, communes, actif } = req.body;

    // Verifier unicite du code si change
    if (code && code !== communaute.code) {
      const existing = await CommunauteCommunes.findOne({ where: { code } });
      if (existing) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Ce code existe deja'
        });
      }
    }

    // Mettre a jour la communaute
    await communaute.update({
      code: code || communaute.code,
      nom: nom || communaute.nom,
      code_siren,
      type_epci: type_epci || communaute.type_epci,
      departement,
      description,
      actif: actif !== undefined ? actif : communaute.actif
    }, { transaction: t });

    // Mettre a jour les communes si fourni
    if (communes !== undefined) {
      // Supprimer les anciennes liaisons
      await CommunauteCommunesMembre.destroy({
        where: { communaute_id: communaute.id },
        transaction: t
      });

      // Ajouter les nouvelles
      if (communes.length > 0) {
        const membres = communes.map(communeId => ({
          communaute_id: communaute.id,
          commune_id: communeId
        }));
        await CommunauteCommunesMembre.bulkCreate(membres, { transaction: t });
      }
    }

    await t.commit();

    // Recharger
    const result = await CommunauteCommunes.findByPk(communaute.id, {
      include: [{
        model: Commune,
        as: 'communes',
        through: { attributes: [] }
      }]
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    await t.rollback();
    console.error('[CommunautesCommunes] Erreur update:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification'
    });
  }
}

/**
 * DELETE /api/communautes-communes/:id
 * Supprimer une communaute (soft delete)
 */
async function remove(req, res) {
  try {
    const communaute = await CommunauteCommunes.findByPk(req.params.id);
    if (!communaute) {
      return res.status(404).json({
        success: false,
        message: 'Communaute non trouvee'
      });
    }

    // Soft delete
    await communaute.update({ actif: false });

    res.json({
      success: true,
      message: 'Communaute desactivee'
    });
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur delete:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
}

/**
 * POST /api/communautes-communes/:id/communes
 * Ajouter des communes a une communaute
 */
async function addCommunes(req, res) {
  try {
    const { communes } = req.body;
    if (!communes || !communes.length) {
      return res.status(400).json({
        success: false,
        message: 'Liste de communes requise'
      });
    }

    const communaute = await CommunauteCommunes.findByPk(req.params.id);
    if (!communaute) {
      return res.status(404).json({
        success: false,
        message: 'Communaute non trouvee'
      });
    }

    // Ajouter les communes (ignorer les doublons)
    for (const communeId of communes) {
      await CommunauteCommunesMembre.findOrCreate({
        where: {
          communaute_id: communaute.id,
          commune_id: communeId
        }
      });
    }

    // Recharger
    const result = await CommunauteCommunes.findByPk(communaute.id, {
      include: [{
        model: Commune,
        as: 'communes',
        through: { attributes: [] }
      }]
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur addCommunes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout des communes'
    });
  }
}

/**
 * DELETE /api/communautes-communes/:id/communes/:communeId
 * Retirer une commune d'une communaute
 */
async function removeCommune(req, res) {
  try {
    const { id, communeId } = req.params;

    const deleted = await CommunauteCommunesMembre.destroy({
      where: {
        communaute_id: id,
        commune_id: communeId
      }
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Liaison non trouvee'
      });
    }

    res.json({
      success: true,
      message: 'Commune retiree de la communaute'
    });
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur removeCommune:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait de la commune'
    });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addCommunes,
  removeCommune
};
