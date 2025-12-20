const { EmailLog, Utilisateur, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer tous les logs d'emails
 */
exports.getAllEmailLogs = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité
    const {
      statut,
      template_code,
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

    // Utiliser utilisateur_id (ou adherent_id pour rétrocompatibilité)
    const userId = utilisateur_id || adherent_id;
    if (userId) {
      where.utilisateur_id = userId;
    }

    // Filtre par destinataire (email ou nom) - insensible a la casse
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

    const { count, rows } = await EmailLog.findAndCountAll({
      where,
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email'],
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
      emailLogs: logsWithAlias,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération logs emails:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer un log d'email par ID
 */
exports.getEmailLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await EmailLog.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    if (!emailLog) {
      return res.status(404).json({
        error: 'Log non trouvé'
      });
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emailLog.toJSON();
    data.adherent = data.utilisateur;

    res.json(data);
  } catch (error) {
    console.error('Erreur récupération log email:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer les statistiques des emails
 */
exports.getEmailStatistics = async (req, res) => {
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

    const [total, envoyes, erreurs] = await Promise.all([
      EmailLog.count({ where }),
      EmailLog.count({ where: { ...where, statut: 'envoye' } }),
      EmailLog.count({ where: { ...where, statut: 'erreur' } })
    ]);

    const stats = {
      total,
      envoyes,
      erreurs,
      tauxReussite: total > 0 ? ((envoyes / total) * 100).toFixed(2) : 0
    };

    // Statistiques par template (avec filtre structure)
    const templateWhere = {
      ...baseWhere,
      template_code: { [Op.ne]: null }
    };
    const parTemplate = await EmailLog.findAll({
      attributes: [
        'template_code',
        [EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'total'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "envoye" THEN 1 ELSE 0 END')), 'envoyes'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "erreur" THEN 1 ELSE 0 END')), 'erreurs']
      ],
      where: templateWhere,
      group: ['template_code'],
      order: [[EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Statistiques par jour (7 derniers jours, avec filtre structure)
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const parJour = await EmailLog.findAll({
      attributes: [
        [EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi')), 'jour'],
        [EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'total'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "envoye" THEN 1 ELSE 0 END')), 'envoyes'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "erreur" THEN 1 ELSE 0 END')), 'erreurs']
      ],
      where: {
        ...baseWhere,
        date_envoi: {
          [Op.between]: [sevenDaysAgo, now]
        }
      },
      group: [EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi'))],
      order: [[EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi')), 'ASC']],
      raw: true
    });

    res.json({
      statistiquesGenerales: stats,
      parTemplate,
      parJour
    });
  } catch (error) {
    console.error('Erreur récupération statistiques emails:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Supprimer les anciens logs d'emails
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

    const count = await EmailLog.destroy({ where });

    res.json({
      message: `${count} log(s) supprimé(s)`,
      count
    });
  } catch (error) {
    console.error('Erreur purge logs emails:', error);
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

    const templates = await EmailLog.findAll({
      attributes: [
        'template_code',
        [EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'total']
      ],
      where,
      group: ['template_code'],
      order: [[EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération liste templates:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};
