/**
 * Controleur Baremes Quotient Familial
 * CRUD complet pour la gestion des configurations QF
 */

const { Op } = require('sequelize');
const { sequelize, ConfigurationQuotientFamilial, TrancheQuotientFamilial, TrancheQFValeur, TypeTarif } = require('../models');
const logger = require('../utils/logger');

/**
 * Liste tous les baremes QF
 * GET /api/parametres/baremes-qf
 */
exports.getAll = async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId;
    const includeInactifs = req.query.include_inactifs === 'true';

    const where = {};
    if (!includeInactifs) {
      where.actif = true;
    }

    // Filtrer par structure et/ou organisation
    const organisationId = req.query.organisation_id || req.organisationId;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }
    where[Op.or] = orConditions;

    const baremes = await ConfigurationQuotientFamilial.findAll({
      where,
      include: [{
        model: TrancheQuotientFamilial,
        as: 'tranches',
        where: includeInactifs ? {} : { actif: true },
        required: false,
        include: [{
          model: TrancheQFValeur,
          as: 'valeursParType',
          where: { actif: true },
          required: false,
          include: [{
            model: TypeTarif,
            as: 'typeTarif',
            attributes: ['id', 'code', 'libelle']
          }]
        }]
      }],
      order: [
        ['par_defaut', 'DESC'],
        ['libelle', 'ASC']
      ]
    });

    // Trier les tranches par ordre pour chaque bareme
    baremes.forEach(bareme => {
      if (bareme.tranches) {
        bareme.tranches.sort((a, b) => a.ordre - b.ordre);
      }
    });

    res.json({
      success: true,
      data: baremes
    });

  } catch (error) {
    logger.error(`Erreur liste baremes QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Detail d'un bareme QF avec valeurs par type de tarif
 * GET /api/parametres/baremes-qf/:id
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const bareme = await ConfigurationQuotientFamilial.findByPk(id, {
      include: [{
        model: TrancheQuotientFamilial,
        as: 'tranches',
        include: [{
          model: TrancheQFValeur,
          as: 'valeursParType',
          where: { actif: true },
          required: false,
          include: [{
            model: TypeTarif,
            as: 'typeTarif',
            attributes: ['id', 'code', 'libelle']
          }]
        }]
      }]
    });

    if (!bareme) {
      return res.status(404).json({ error: 'Bareme non trouve' });
    }

    // Trier les tranches par ordre
    if (bareme.tranches) {
      bareme.tranches.sort((a, b) => a.ordre - b.ordre);
    }

    res.json({
      success: true,
      data: bareme
    });

  } catch (error) {
    logger.error(`Erreur detail bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Creer un bareme QF
 * POST /api/parametres/baremes-qf
 */
exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { code, libelle, description, par_defaut, tranches, structure_id, organisation_id } = req.body;

    if (!code || !libelle) {
      return res.status(400).json({ error: 'Code et libelle requis' });
    }

    if (!tranches || tranches.length === 0) {
      return res.status(400).json({ error: 'Au moins une tranche requise' });
    }

    // Verifier unicite du code
    const existing = await ConfigurationQuotientFamilial.findOne({
      where: { code: code.toUpperCase() }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ce code existe deja' });
    }

    // Si par_defaut, desactiver les autres
    if (par_defaut) {
      await ConfigurationQuotientFamilial.update(
        { par_defaut: false },
        {
          where: { par_defaut: true },
          transaction: t
        }
      );
    }

    // Creer le bareme
    const bareme = await ConfigurationQuotientFamilial.create({
      code: code.toUpperCase(),
      libelle,
      description,
      par_defaut: par_defaut || false,
      structure_id: structure_id || req.structureId || null,
      organisation_id: organisation_id || null,
      actif: true
    }, { transaction: t });

    // Creer les tranches (structure uniquement, sans valeurs tarifaires)
    for (let i = 0; i < tranches.length; i++) {
      const tranche = tranches[i];
      await TrancheQuotientFamilial.create({
        configuration_qf_id: bareme.id,
        libelle: tranche.libelle,
        borne_min: tranche.borne_min || 0,
        borne_max: tranche.borne_max || null,
        type_calcul: tranche.type_calcul || 'fixe',
        valeur: tranche.valeur || 0,
        ordre: tranche.ordre || (i + 1),
        actif: true
      }, { transaction: t });
    }

    await t.commit();

    // Recharger avec les tranches
    const baremeComplet = await ConfigurationQuotientFamilial.findByPk(bareme.id, {
      include: [{ model: TrancheQuotientFamilial, as: 'tranches' }]
    });

    logger.info(`Bareme QF cree: ${bareme.code} (ID: ${bareme.id})`);

    res.status(201).json({
      success: true,
      data: baremeComplet
    });

  } catch (error) {
    await t.rollback();
    logger.error(`Erreur creation bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Modifier un bareme QF
 * PUT /api/parametres/baremes-qf/:id
 */
exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { libelle, description, par_defaut, tranches } = req.body;

    const bareme = await ConfigurationQuotientFamilial.findByPk(id);
    if (!bareme) {
      return res.status(404).json({ error: 'Bareme non trouve' });
    }

    // Si par_defaut, desactiver les autres
    if (par_defaut && !bareme.par_defaut) {
      await ConfigurationQuotientFamilial.update(
        { par_defaut: false },
        {
          where: {
            par_defaut: true,
            id: { [Op.ne]: id }
          },
          transaction: t
        }
      );
    }

    // Mettre a jour le bareme
    await bareme.update({
      libelle: libelle || bareme.libelle,
      description: description !== undefined ? description : bareme.description,
      par_defaut: par_defaut !== undefined ? par_defaut : bareme.par_defaut
    }, { transaction: t });

    // Si tranches fournies, strategie delete + recreate
    if (tranches && tranches.length > 0) {
      // Supprimer les anciennes valeurs par type (cascade)
      const oldTranches = await TrancheQuotientFamilial.findAll({
        where: { configuration_qf_id: id }
      });
      for (const oldTranche of oldTranches) {
        await TrancheQFValeur.destroy({
          where: { tranche_qf_id: oldTranche.id },
          transaction: t
        });
      }

      // Supprimer les anciennes tranches
      await TrancheQuotientFamilial.destroy({
        where: { configuration_qf_id: id },
        transaction: t
      });

      // Creer les nouvelles tranches avec leurs valeurs par type
      for (let i = 0; i < tranches.length; i++) {
        const tranche = tranches[i];
        const nouvelleTranche = await TrancheQuotientFamilial.create({
          configuration_qf_id: id,
          libelle: tranche.libelle,
          borne_min: tranche.borne_min || 0,
          borne_max: tranche.borne_max || null,
          type_calcul: tranche.type_calcul || 'fixe',
          valeur: tranche.valeur || 0,
          ordre: tranche.ordre || (i + 1),
          actif: true
        }, { transaction: t });

        // Creer les valeurs par type de tarif si fournies
        if (tranche.valeursParType && tranche.valeursParType.length > 0) {
          for (const valeur of tranche.valeursParType) {
            await TrancheQFValeur.create({
              tranche_qf_id: nouvelleTranche.id,
              type_tarif_id: valeur.type_tarif_id,
              type_calcul: valeur.type_calcul || 'fixe',
              valeur: valeur.valeur || 0,
              actif: true
            }, { transaction: t });
          }
        }
      }
    }

    await t.commit();

    // Recharger avec les tranches et valeurs par type
    const baremeComplet = await ConfigurationQuotientFamilial.findByPk(id, {
      include: [{
        model: TrancheQuotientFamilial,
        as: 'tranches',
        include: [{
          model: TrancheQFValeur,
          as: 'valeursParType',
          include: [{ model: TypeTarif, as: 'typeTarif' }]
        }]
      }]
    });

    logger.info(`Bareme QF modifie: ${bareme.code} (ID: ${id})`);

    res.json({
      success: true,
      data: baremeComplet
    });

  } catch (error) {
    await t.rollback();
    logger.error(`Erreur modification bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprimer (soft delete) un bareme QF
 * DELETE /api/parametres/baremes-qf/:id
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const bareme = await ConfigurationQuotientFamilial.findByPk(id);
    if (!bareme) {
      return res.status(404).json({ error: 'Bareme non trouve' });
    }

    if (bareme.par_defaut) {
      return res.status(400).json({
        error: 'Impossible de supprimer le bareme par defaut. Definissez un autre bareme par defaut d\'abord.'
      });
    }

    // Soft delete
    await bareme.update({ actif: false });

    // Desactiver aussi les tranches
    await TrancheQuotientFamilial.update(
      { actif: false },
      { where: { configuration_qf_id: id } }
    );

    logger.info(`Bareme QF supprime: ${bareme.code} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Bareme desactive'
    });

  } catch (error) {
    logger.error(`Erreur suppression bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Dupliquer un bareme QF
 * POST /api/parametres/baremes-qf/:id/dupliquer
 */
exports.duplicate = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { nouveau_code, nouveau_libelle } = req.body;

    const original = await ConfigurationQuotientFamilial.findByPk(id, {
      include: [{ model: TrancheQuotientFamilial, as: 'tranches' }]
    });

    if (!original) {
      return res.status(404).json({ error: 'Bareme non trouve' });
    }

    // Generer un nouveau code si non fourni
    const code = nouveau_code
      ? nouveau_code.toUpperCase()
      : `${original.code}_COPIE`;

    // Verifier unicite du code
    const existing = await ConfigurationQuotientFamilial.findOne({
      where: { code }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ce code existe deja' });
    }

    // Creer la copie
    const copie = await ConfigurationQuotientFamilial.create({
      code,
      libelle: nouveau_libelle || `${original.libelle} (copie)`,
      description: original.description,
      par_defaut: false,
      structure_id: original.structure_id,
      organisation_id: original.organisation_id,
      actif: true
    }, { transaction: t });

    // Copier les tranches
    for (const tranche of original.tranches) {
      await TrancheQuotientFamilial.create({
        configuration_qf_id: copie.id,
        libelle: tranche.libelle,
        borne_min: tranche.borne_min,
        borne_max: tranche.borne_max,
        type_calcul: tranche.type_calcul,
        valeur: tranche.valeur,
        ordre: tranche.ordre,
        actif: true
      }, { transaction: t });
    }

    await t.commit();

    // Recharger avec les tranches
    const copieComplete = await ConfigurationQuotientFamilial.findByPk(copie.id, {
      include: [{ model: TrancheQuotientFamilial, as: 'tranches' }]
    });

    logger.info(`Bareme QF duplique: ${original.code} -> ${copie.code}`);

    res.status(201).json({
      success: true,
      data: copieComplete
    });

  } catch (error) {
    await t.rollback();
    logger.error(`Erreur duplication bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Definir un bareme comme par defaut
 * PUT /api/parametres/baremes-qf/:id/defaut
 */
exports.setDefault = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const bareme = await ConfigurationQuotientFamilial.findByPk(id);
    if (!bareme) {
      return res.status(404).json({ error: 'Bareme non trouve' });
    }

    if (!bareme.actif) {
      return res.status(400).json({ error: 'Impossible de definir un bareme inactif par defaut' });
    }

    // Desactiver les autres par defaut
    await ConfigurationQuotientFamilial.update(
      { par_defaut: false },
      {
        where: { par_defaut: true },
        transaction: t
      }
    );

    // Activer celui-ci
    await bareme.update({ par_defaut: true }, { transaction: t });

    await t.commit();

    logger.info(`Bareme QF defini par defaut: ${bareme.code} (ID: ${id})`);

    res.json({
      success: true,
      data: bareme
    });

  } catch (error) {
    await t.rollback();
    logger.error(`Erreur set default bareme QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Liste les types de tarifs actifs (pour le formulaire valeurs par type)
 * GET /api/parametres/baremes-qf/types-tarifs
 */
exports.getTypesTarifs = async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId || null;

    const where = { actif: true };

    // Si structureId est defini, inclure les types de la structure ET globaux
    // Sinon, seulement les types globaux
    if (structureId) {
      where[Op.or] = [
        { structure_id: structureId },
        { structure_id: null }
      ];
    } else {
      where.structure_id = null;
    }

    const typesTarifs = await TypeTarif.findAll({
      where,
      attributes: ['id', 'code', 'libelle', 'description', 'priorite'],
      order: [['priorite', 'ASC'], ['libelle', 'ASC']]
    });

    res.json({
      success: true,
      data: typesTarifs
    });

  } catch (error) {
    logger.error(`Erreur liste types tarifs: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
