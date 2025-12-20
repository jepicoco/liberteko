const { SmsLog, Utilisateur, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer tous les logs de SMS
 */
exports.getAllSmsLogs = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité
    const {
      statut,
      template_code,
      provider,
      adherent_id,
      utilisateur_id,
      destinataire,
      date_debut,
      date_fin,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Filtrage par structure (multi-structure)
    if (req.structureId) {
      where.structure_id = req.structureId;
    }

    if (statut) {
      where.statut = statut;
    }

    if (template_code) {
      where.template_code = template_code;
    }

    if (provider) {
      where.provider = provider;
    }

    // Utiliser utilisateur_id (ou adherent_id pour rétrocompatibilité)
    const userId = utilisateur_id || adherent_id;
    if (userId) {
      where.utilisateur_id = userId;
    }

    // Filtre par destinataire (telephone ou nom) - insensible a la casse
    if (destinataire) {
      const searchTerm = destinataire.toLowerCase();
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('destinataire')), { [Op.like]: `%${searchTerm}%` }),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('destinataire_nom')), { [Op.like]: `%${searchTerm}%` })
        ]
      });
    }

    if (date_debut && date_fin) {
      where.date_envoi = {
        [Op.between]: [new Date(date_debut), new Date(date_fin)]
      };
    } else if (date_debut) {
      where.date_envoi = {
        [Op.gte]: new Date(date_debut)
      };
    } else if (date_fin) {
      where.date_envoi = {
        [Op.lte]: new Date(date_fin)
      };
    }

    const { count, rows } = await SmsLog.findAndCountAll({
      where,
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'telephone'],
          required: false
        }
      ],
      order: [['date_envoi', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const logsWithAlias = rows.map(e => {
      const data = e.toJSON();
      data.adherent = data.utilisateur;
      return data;
    });

    res.json({
      smsLogs: logsWithAlias,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération logs SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer un log de SMS par ID
 */
exports.getSmsLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const smsLog = await SmsLog.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'telephone', 'email']
        }
      ]
    });

    if (!smsLog) {
      return res.status(404).json({
        error: 'Log non trouvé'
      });
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = smsLog.toJSON();
    data.adherent = data.utilisateur;

    res.json(data);
  } catch (error) {
    console.error('Erreur récupération log SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer les statistiques des SMS
 */
exports.getSmsStatistics = async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    const dateDebut = date_debut ? new Date(date_debut) : null;
    const dateFin = date_fin ? new Date(date_fin) : null;

    // Condition de base pour filtrage par structure
    const baseWhere = {};
    if (req.structureId) {
      baseWhere.structure_id = req.structureId;
    }

    // Statistiques générales (avec filtre structure)
    const where = { ...baseWhere };
    if (dateDebut && dateFin) {
      where.date_envoi = { [Op.between]: [dateDebut, dateFin] };
    }

    const [total, envoyes, delivres, erreurs] = await Promise.all([
      SmsLog.count({ where }),
      SmsLog.count({ where: { ...where, statut: 'envoye' } }),
      SmsLog.count({ where: { ...where, statut: 'delivre' } }),
      SmsLog.count({ where: { ...where, statut: { [Op.in]: ['erreur', 'echec_livraison'] } } })
    ]);

    const stats = {
      total,
      envoyes,
      delivres,
      erreurs,
      tauxReussite: total > 0 ? (((envoyes + delivres) / total) * 100).toFixed(2) : 0
    };

    // Coût total (avec filtre structure)
    const coutWhere = { ...baseWhere, cout: { [Op.ne]: null } };
    if (dateDebut && dateFin) {
      coutWhere.date_envoi = { [Op.between]: [dateDebut, dateFin] };
    }
    const coutTotal = await SmsLog.sum('cout', { where: coutWhere }) || 0;

    // Statistiques par template (avec filtre structure)
    const templateWhere = {
      ...baseWhere,
      template_code: { [Op.ne]: null }
    };
    const parTemplate = await SmsLog.findAll({
      attributes: [
        'template_code',
        [SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'total'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("envoye", "delivre") THEN 1 ELSE 0 END')), 'envoyes'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("erreur", "echec_livraison") THEN 1 ELSE 0 END')), 'erreurs']
      ],
      where: templateWhere,
      group: ['template_code'],
      order: [[SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Statistiques par provider (avec filtre structure)
    const providerWhere = {
      ...baseWhere,
      provider: { [Op.ne]: null }
    };
    const parProvider = await SmsLog.findAll({
      attributes: [
        'provider',
        [SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'total'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("envoye", "delivre") THEN 1 ELSE 0 END')), 'envoyes'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("erreur", "echec_livraison") THEN 1 ELSE 0 END')), 'erreurs'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.col('cout')), 'cout_total']
      ],
      where: providerWhere,
      group: ['provider'],
      order: [[SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Statistiques par jour (7 derniers jours, avec filtre structure)
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const parJour = await SmsLog.findAll({
      attributes: [
        [SmsLog.sequelize.fn('DATE', SmsLog.sequelize.col('date_envoi')), 'jour'],
        [SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'total'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("envoye", "delivre") THEN 1 ELSE 0 END')), 'envoyes'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.literal('CASE WHEN statut IN ("erreur", "echec_livraison") THEN 1 ELSE 0 END')), 'erreurs'],
        [SmsLog.sequelize.fn('SUM', SmsLog.sequelize.col('nb_segments')), 'segments']
      ],
      where: {
        ...baseWhere,
        date_envoi: {
          [Op.between]: [sevenDaysAgo, now]
        }
      },
      group: [SmsLog.sequelize.fn('DATE', SmsLog.sequelize.col('date_envoi'))],
      order: [[SmsLog.sequelize.fn('DATE', SmsLog.sequelize.col('date_envoi')), 'ASC']],
      raw: true
    });

    res.json({
      statistiquesGenerales: {
        ...stats,
        coutTotal: parseFloat(coutTotal).toFixed(2)
      },
      parTemplate,
      parProvider,
      parJour
    });
  } catch (error) {
    console.error('Erreur récupération statistiques SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Supprimer les anciens logs de SMS
 */
exports.purgeOldLogs = async (req, res) => {
  try {
    const { jours = 90 } = req.body;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(jours));

    const where = {
      date_envoi: {
        [Op.lt]: dateLimit
      }
    };

    // Filtrage par structure (multi-structure)
    if (req.structureId) {
      where.structure_id = req.structureId;
    }

    const count = await SmsLog.destroy({ where });

    res.json({
      message: `${count} log(s) SMS supprimé(s)`,
      count
    });
  } catch (error) {
    console.error('Erreur purge logs SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtenir la liste des templates utilisés
 */
exports.getTemplatesList = async (req, res) => {
  try {
    const where = {
      template_code: {
        [Op.ne]: null
      }
    };

    // Filtrage par structure (multi-structure)
    if (req.structureId) {
      where.structure_id = req.structureId;
    }

    const templates = await SmsLog.findAll({
      attributes: [
        'template_code',
        [SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'total']
      ],
      where,
      group: ['template_code'],
      order: [[SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération liste templates SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtenir la liste des providers utilisés
 */
exports.getProvidersList = async (req, res) => {
  try {
    const where = {
      provider: {
        [Op.ne]: null
      }
    };

    // Filtrage par structure (multi-structure)
    if (req.structureId) {
      where.structure_id = req.structureId;
    }

    const providers = await SmsLog.findAll({
      attributes: [
        'provider',
        [SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'total']
      ],
      where,
      group: ['provider'],
      order: [[SmsLog.sequelize.fn('COUNT', SmsLog.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json(providers);
  } catch (error) {
    console.error('Erreur récupération liste providers SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Mettre à jour le statut d'un SMS (callback webhook)
 */
exports.updateSmsStatus = async (req, res) => {
  try {
    const { message_id, statut, date_livraison, erreur_code, erreur_message } = req.body;

    if (!message_id) {
      return res.status(400).json({
        error: 'message_id requis'
      });
    }

    const smsLog = await SmsLog.findOne({
      where: { message_id }
    });

    if (!smsLog) {
      return res.status(404).json({
        error: 'Log SMS non trouvé'
      });
    }

    const updateData = {};
    if (statut) updateData.statut = statut;
    if (date_livraison) updateData.date_livraison = new Date(date_livraison);
    if (erreur_code) updateData.erreur_code = erreur_code;
    if (erreur_message) updateData.erreur_message = erreur_message;

    await smsLog.update(updateData);

    res.json({
      message: 'Statut mis à jour',
      smsLog
    });
  } catch (error) {
    console.error('Erreur mise à jour statut SMS:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};
