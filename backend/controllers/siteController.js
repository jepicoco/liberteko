/**
 * Controller Sites
 * Gestion des sites (ludothèque, bibliothèque, mobiles...)
 */

const { Site, CompteBancaire, HoraireOuverture, FermetureExceptionnelle, ParametresCalendrier } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer tous les sites
 */
exports.getAll = async (req, res) => {
  try {
    const { actif, type } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }
    if (type) {
      where.type = type;
    }

    const sites = await Site.findAll({
      where,
      include: [
        {
          model: CompteBancaire,
          as: 'compteBancaire',
          attributes: ['id', 'libelle', 'banque']
        }
      ],
      order: [['ordre_affichage', 'ASC'], ['nom', 'ASC']]
    });

    res.json(sites);
  } catch (error) {
    console.error('Erreur getAll sites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sites' });
  }
};

/**
 * Récupérer un site par ID avec tous ses détails
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findByPk(id, {
      include: [
        {
          model: CompteBancaire,
          as: 'compteBancaire'
        },
        {
          model: HoraireOuverture,
          as: 'horaires',
          where: { actif: true },
          required: false,
          order: [['jour_semaine', 'ASC'], ['heure_debut', 'ASC']]
        },
        {
          model: ParametresCalendrier,
          as: 'parametresCalendrier'
        }
      ]
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    res.json(site);
  } catch (error) {
    console.error('Erreur getById site:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du site' });
  }
};

/**
 * Créer un nouveau site
 */
exports.create = async (req, res) => {
  try {
    const {
      code, nom, type, description,
      adresse, code_postal, ville, pays,
      telephone, email, compte_bancaire_id,
      google_place_id, couleur, icone, ordre_affichage
    } = req.body;

    // Vérifier que le code est unique
    if (code) {
      const existing = await Site.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: 'Ce code est déjà utilisé' });
      }
    }

    const site = await Site.create({
      code: code || `SITE_${Date.now()}`,
      nom,
      type: type || 'fixe',
      description,
      adresse,
      code_postal,
      ville,
      pays: pays || 'FR',
      telephone,
      email,
      compte_bancaire_id,
      google_place_id,
      couleur: couleur || '#0d6efd',
      icone: icone || 'building',
      ordre_affichage: ordre_affichage || 0,
      actif: true
    });

    res.status(201).json(site);
  } catch (error) {
    console.error('Erreur create site:', error);
    res.status(500).json({ error: 'Erreur lors de la création du site' });
  }
};

/**
 * Mettre à jour un site
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const site = await Site.findByPk(id);
    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Si le code change, vérifier l'unicité
    if (updates.code && updates.code !== site.code) {
      const existing = await Site.findOne({ where: { code: updates.code } });
      if (existing) {
        return res.status(400).json({ error: 'Ce code est déjà utilisé' });
      }
    }

    await site.update(updates);
    res.json(site);
  } catch (error) {
    console.error('Erreur update site:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du site' });
  }
};

/**
 * Supprimer un site (soft delete = désactiver)
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findByPk(id);
    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Soft delete : désactiver plutôt que supprimer
    await site.update({ actif: false });
    res.json({ message: 'Site désactivé avec succès' });
  } catch (error) {
    console.error('Erreur delete site:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du site' });
  }
};

/**
 * Réordonner les sites
 */
exports.reorder = async (req, res) => {
  try {
    const { ordres } = req.body; // [{ id: 1, ordre: 0 }, { id: 2, ordre: 1 }, ...]

    if (!Array.isArray(ordres)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    for (const item of ordres) {
      await Site.update(
        { ordre_affichage: item.ordre },
        { where: { id: item.id } }
      );
    }

    res.json({ message: 'Ordre mis à jour' });
  } catch (error) {
    console.error('Erreur reorder sites:', error);
    res.status(500).json({ error: 'Erreur lors du réordonnement' });
  }
};

// ==================== HORAIRES ====================

/**
 * Récupérer les horaires d'un site
 */
exports.getHoraires = async (req, res) => {
  try {
    const { id } = req.params;

    const horaires = await HoraireOuverture.findAll({
      where: { site_id: id },
      order: [['jour_semaine', 'ASC'], ['heure_debut', 'ASC']]
    });

    res.json(horaires);
  } catch (error) {
    console.error('Erreur getHoraires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des horaires' });
  }
};

/**
 * Ajouter un créneau horaire
 */
exports.addHoraire = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      jour_semaine, heure_debut, heure_fin,
      recurrence, lieu_specifique, adresse_specifique
    } = req.body;

    // Vérifier que le site existe
    const site = await Site.findByPk(id);
    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    const horaire = await HoraireOuverture.create({
      site_id: id,
      jour_semaine,
      heure_debut,
      heure_fin,
      recurrence: recurrence || 'toutes',
      lieu_specifique,
      adresse_specifique,
      actif: true
    });

    res.status(201).json(horaire);
  } catch (error) {
    console.error('Erreur addHoraire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du créneau' });
  }
};

/**
 * Mettre à jour un créneau horaire
 */
exports.updateHoraire = async (req, res) => {
  try {
    const { id, horaireId } = req.params;
    const updates = req.body;

    const horaire = await HoraireOuverture.findOne({
      where: { id: horaireId, site_id: id }
    });

    if (!horaire) {
      return res.status(404).json({ error: 'Créneau non trouvé' });
    }

    await horaire.update(updates);
    res.json(horaire);
  } catch (error) {
    console.error('Erreur updateHoraire:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du créneau' });
  }
};

/**
 * Supprimer un créneau horaire
 */
exports.deleteHoraire = async (req, res) => {
  try {
    const { id, horaireId } = req.params;

    const horaire = await HoraireOuverture.findOne({
      where: { id: horaireId, site_id: id }
    });

    if (!horaire) {
      return res.status(404).json({ error: 'Créneau non trouvé' });
    }

    await horaire.destroy();
    res.json({ message: 'Créneau supprimé' });
  } catch (error) {
    console.error('Erreur deleteHoraire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du créneau' });
  }
};

/**
 * Remplacer tous les horaires d'un site
 */
exports.setHoraires = async (req, res) => {
  try {
    const { id } = req.params;
    const { horaires } = req.body;

    // Vérifier que le site existe
    const site = await Site.findByPk(id);
    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Supprimer les anciens horaires
    await HoraireOuverture.destroy({ where: { site_id: id } });

    // Créer les nouveaux
    const nouveauxHoraires = [];
    for (const h of horaires) {
      const horaire = await HoraireOuverture.create({
        site_id: id,
        jour_semaine: h.jour_semaine,
        heure_debut: h.heure_debut,
        heure_fin: h.heure_fin,
        recurrence: h.recurrence || 'toutes',
        periode: h.periode || 'normale',
        lieu_specifique: h.lieu_specifique,
        adresse_specifique: h.adresse_specifique,
        actif: true
      });
      nouveauxHoraires.push(horaire);
    }

    res.json(nouveauxHoraires);
  } catch (error) {
    console.error('Erreur setHoraires:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des horaires' });
  }
};

// ==================== FERMETURES ====================

/**
 * Récupérer les fermetures d'un site (ou globales)
 */
exports.getFermetures = async (req, res) => {
  try {
    const { id } = req.params;
    const { annee, type } = req.query;

    const where = {
      [Op.or]: [
        { site_id: id },
        { site_id: null }
      ]
    };

    if (type) {
      where.type = type;
    }

    if (annee) {
      where.date_debut = {
        [Op.gte]: `${annee}-01-01`,
        [Op.lte]: `${annee}-12-31`
      };
    }

    const fermetures = await FermetureExceptionnelle.findAll({
      where,
      order: [['date_debut', 'ASC']]
    });

    res.json(fermetures);
  } catch (error) {
    console.error('Erreur getFermetures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fermetures' });
  }
};

/**
 * Ajouter une fermeture
 */
exports.addFermeture = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date_debut, date_fin, motif, type, recurrent_annuel, global
    } = req.body;

    // Si global=true, site_id sera null
    const site_id = global ? null : id;

    const fermeture = await FermetureExceptionnelle.create({
      site_id,
      date_debut,
      date_fin: date_fin || date_debut,
      motif,
      type: type || 'ponctuel',
      recurrent_annuel: recurrent_annuel || false
    });

    res.status(201).json(fermeture);
  } catch (error) {
    console.error('Erreur addFermeture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la fermeture' });
  }
};

/**
 * Supprimer une fermeture
 */
exports.deleteFermeture = async (req, res) => {
  try {
    const { fermetureId } = req.params;

    const fermeture = await FermetureExceptionnelle.findByPk(fermetureId);
    if (!fermeture) {
      return res.status(404).json({ error: 'Fermeture non trouvée' });
    }

    await fermeture.destroy();
    res.json({ message: 'Fermeture supprimée' });
  } catch (error) {
    console.error('Erreur deleteFermeture:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// ==================== OUVERTURE / DISPONIBILITÉ ====================

/**
 * Vérifier si un site est ouvert à une date/heure donnée
 */
exports.isOpen = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, heure } = req.query;

    const dateObj = date ? new Date(date) : new Date();
    const heureStr = heure || `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    // 1. Vérifier les fermetures exceptionnelles
    const fermetures = await FermetureExceptionnelle.findAll({
      where: {
        [Op.or]: [
          { site_id: id },
          { site_id: null }
        ],
        date_debut: { [Op.lte]: dateObj },
        date_fin: { [Op.gte]: dateObj }
      }
    });

    if (fermetures.length > 0) {
      return res.json({
        ouvert: false,
        raison: 'fermeture_exceptionnelle',
        fermeture: fermetures[0]
      });
    }

    // 2. Vérifier les horaires
    const jourJS = dateObj.getDay();
    const jourSemaine = jourJS === 0 ? 6 : jourJS - 1;

    const horaires = await HoraireOuverture.findAll({
      where: {
        site_id: id,
        jour_semaine: jourSemaine,
        actif: true
      }
    });

    if (horaires.length === 0) {
      return res.json({
        ouvert: false,
        raison: 'jour_ferme'
      });
    }

    // Vérifier si l'heure est dans un créneau
    for (const horaire of horaires) {
      // Vérifier la récurrence
      if (horaire.recurrence !== 'toutes') {
        const numeroSemaine = getNumeroSemaine(dateObj);
        const estPaire = numeroSemaine % 2 === 0;
        if (horaire.recurrence === 'paires' && !estPaire) continue;
        if (horaire.recurrence === 'impaires' && estPaire) continue;
      }

      // Vérifier l'heure
      const debut = horaire.heure_debut.substring(0, 5);
      const fin = horaire.heure_fin.substring(0, 5);
      if (heureStr >= debut && heureStr < fin) {
        return res.json({
          ouvert: true,
          horaire: {
            debut: horaire.heure_debut,
            fin: horaire.heure_fin,
            lieu: horaire.lieu_specifique
          }
        });
      }
    }

    return res.json({
      ouvert: false,
      raison: 'hors_horaires',
      prochainCreneau: horaires[0] ? {
        debut: horaires[0].heure_debut,
        fin: horaires[0].heure_fin
      } : null
    });

  } catch (error) {
    console.error('Erreur isOpen:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
};

// Helper: Calcul du numéro de semaine ISO
function getNumeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
