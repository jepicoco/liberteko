/**
 * Controller pour l'editeur de plans interactifs
 * Gestion des plans, etages, elements et liaisons emplacements
 */

const {
  Plan,
  Etage,
  ElementPlan,
  ElementEmplacement,
  Site,
  EmplacementJeu,
  EmplacementLivre,
  EmplacementFilm,
  EmplacementDisque,
  Jeu,
  Livre,
  Film,
  Disque,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// ============================================
// PLANS
// ============================================

/**
 * Liste tous les plans avec leurs sites
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      include: [
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'code', 'nom', 'type']
        },
        {
          model: Etage,
          as: 'etages',
          attributes: ['id', 'nom', 'type', 'numero'],
          where: { actif: true },
          required: false,
          order: [['ordre_affichage', 'ASC']]
        }
      ],
      where: { actif: true },
      order: [['created_at', 'DESC']]
    });

    res.json(plans);
  } catch (error) {
    logger.error('Erreur getPlans:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des plans' });
  }
};

/**
 * Recupere un plan complet avec ses etages et elements
 */
exports.getPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, {
      include: [
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'code', 'nom', 'type', 'adresse', 'ville']
        },
        {
          model: Etage,
          as: 'etages',
          where: { actif: true },
          required: false,
          order: [['ordre_affichage', 'ASC']],
          include: [{
            model: ElementPlan,
            as: 'elements',
            where: { actif: true },
            required: false,
            order: [['calque', 'ASC'], ['ordre_affichage', 'ASC']],
            include: [{
              model: ElementEmplacement,
              as: 'emplacements',
              include: [
                { model: EmplacementJeu, as: 'emplacementJeu' },
                { model: EmplacementLivre, as: 'emplacementLivre' },
                { model: EmplacementFilm, as: 'emplacementFilm' },
                { model: EmplacementDisque, as: 'emplacementDisque' }
              ]
            }]
          }]
        }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouve' });
    }

    res.json(plan);
  } catch (error) {
    logger.error('Erreur getPlan:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation du plan' });
  }
};

/**
 * Recupere le plan d'un site specifique
 */
exports.getPlanBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    const plan = await Plan.findOne({
      where: { site_id: siteId, actif: true },
      include: [
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'code', 'nom', 'type', 'adresse', 'ville']
        },
        {
          model: Etage,
          as: 'etages',
          where: { actif: true },
          required: false,
          order: [['ordre_affichage', 'ASC']],
          include: [{
            model: ElementPlan,
            as: 'elements',
            where: { actif: true },
            required: false,
            order: [['calque', 'ASC'], ['ordre_affichage', 'ASC']],
            include: [{
              model: ElementEmplacement,
              as: 'emplacements',
              include: [
                { model: EmplacementJeu, as: 'emplacementJeu' },
                { model: EmplacementLivre, as: 'emplacementLivre' },
                { model: EmplacementFilm, as: 'emplacementFilm' },
                { model: EmplacementDisque, as: 'emplacementDisque' }
              ]
            }]
          }]
        }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Aucun plan pour ce site' });
    }

    res.json(plan);
  } catch (error) {
    logger.error('Erreur getPlanBySite:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation du plan' });
  }
};

/**
 * Cree un nouveau plan pour un site
 */
exports.createPlan = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      site_id,
      nom,
      description,
      largeur_defaut,
      hauteur_defaut,
      echelle,
      unite_echelle,
      afficher_grille,
      taille_grille,
      magnetisme_grille
    } = req.body;

    // Verifier que le site existe
    const site = await Site.findByPk(site_id);
    if (!site) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Site non trouve' });
    }

    // Verifier qu'il n'y a pas deja un plan pour ce site
    const existingPlan = await Plan.findOne({ where: { site_id } });
    if (existingPlan) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Un plan existe deja pour ce site' });
    }

    // Creer le plan
    const plan = await Plan.create({
      site_id,
      nom: nom || `Plan ${site.nom}`,
      description,
      largeur_defaut: largeur_defaut || 1200,
      hauteur_defaut: hauteur_defaut || 800,
      echelle: echelle || 1.0,
      unite_echelle: unite_echelle || 'cm',
      afficher_grille: afficher_grille !== false,
      taille_grille: taille_grille || 20,
      magnetisme_grille: magnetisme_grille !== false
    }, { transaction });

    // Creer un etage par defaut (RDC)
    await Etage.create({
      plan_id: plan.id,
      type: 'etage',
      numero: 0,
      nom: 'Rez-de-chaussee',
      ordre_affichage: 0
    }, { transaction });

    await transaction.commit();

    // Recharger avec les associations
    const planComplet = await Plan.findByPk(plan.id, {
      include: [
        { model: Site, as: 'site' },
        { model: Etage, as: 'etages' }
      ]
    });

    res.status(201).json(planComplet);
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur createPlan:', error);
    res.status(500).json({ error: 'Erreur lors de la creation du plan' });
  }
};

/**
 * Met a jour un plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      description,
      largeur_defaut,
      hauteur_defaut,
      echelle,
      unite_echelle,
      afficher_grille,
      taille_grille,
      magnetisme_grille,
      actif
    } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouve' });
    }

    await plan.update({
      nom,
      description,
      largeur_defaut,
      hauteur_defaut,
      echelle,
      unite_echelle,
      afficher_grille,
      taille_grille,
      magnetisme_grille,
      actif
    });

    res.json(plan);
  } catch (error) {
    logger.error('Erreur updatePlan:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du plan' });
  }
};

/**
 * Supprime un plan (soft delete)
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouve' });
    }

    await plan.update({ actif: false });

    res.json({ message: 'Plan supprime avec succes' });
  } catch (error) {
    logger.error('Erreur deletePlan:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du plan' });
  }
};

// ============================================
// ETAGES
// ============================================

/**
 * Liste les etages d'un plan
 */
exports.getEtages = async (req, res) => {
  try {
    const { planId } = req.params;

    const etages = await Etage.findAll({
      where: { plan_id: planId, actif: true },
      order: [['ordre_affichage', 'ASC']]
    });

    res.json(etages);
  } catch (error) {
    logger.error('Erreur getEtages:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des etages' });
  }
};

/**
 * Cree un nouvel etage
 */
exports.createEtage = async (req, res) => {
  try {
    const { planId } = req.params;
    const {
      type,
      numero,
      nom,
      largeur,
      hauteur,
      couleur_fond,
      image_fond_url,
      opacite_fond,
      adresse,
      coordonnees_gps
    } = req.body;

    // Verifier que le plan existe
    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouve' });
    }

    // Determiner l'ordre d'affichage
    const maxOrdre = await Etage.max('ordre_affichage', {
      where: { plan_id: planId }
    }) || 0;

    const etage = await Etage.create({
      plan_id: planId,
      type: type || 'etage',
      numero,
      nom,
      largeur,
      hauteur,
      couleur_fond: couleur_fond || '#ffffff',
      image_fond_url,
      opacite_fond: opacite_fond || 0.3,
      adresse,
      coordonnees_gps,
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(etage);
  } catch (error) {
    logger.error('Erreur createEtage:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de l\'etage' });
  }
};

/**
 * Met a jour un etage
 */
exports.updateEtage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      numero,
      nom,
      largeur,
      hauteur,
      couleur_fond,
      image_fond_url,
      opacite_fond,
      adresse,
      coordonnees_gps,
      ordre_affichage,
      actif
    } = req.body;

    const etage = await Etage.findByPk(id);
    if (!etage) {
      return res.status(404).json({ error: 'Etage non trouve' });
    }

    await etage.update({
      type,
      numero,
      nom,
      largeur,
      hauteur,
      couleur_fond,
      image_fond_url,
      opacite_fond,
      adresse,
      coordonnees_gps,
      ordre_affichage,
      actif
    });

    res.json(etage);
  } catch (error) {
    logger.error('Erreur updateEtage:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de l\'etage' });
  }
};

/**
 * Supprime un etage (soft delete)
 */
exports.deleteEtage = async (req, res) => {
  try {
    const { id } = req.params;

    const etage = await Etage.findByPk(id);
    if (!etage) {
      return res.status(404).json({ error: 'Etage non trouve' });
    }

    await etage.update({ actif: false });

    res.json({ message: 'Etage supprime avec succes' });
  } catch (error) {
    logger.error('Erreur deleteEtage:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'etage' });
  }
};

// ============================================
// ELEMENTS
// ============================================

/**
 * Liste les elements d'un etage
 */
exports.getElements = async (req, res) => {
  try {
    const { etageId } = req.params;

    const elements = await ElementPlan.findAll({
      where: { etage_id: etageId, actif: true },
      include: [{
        model: ElementEmplacement,
        as: 'emplacements',
        include: [
          { model: EmplacementJeu, as: 'emplacementJeu' },
          { model: EmplacementLivre, as: 'emplacementLivre' },
          { model: EmplacementFilm, as: 'emplacementFilm' },
          { model: EmplacementDisque, as: 'emplacementDisque' }
        ]
      }],
      order: [['calque', 'ASC'], ['ordre_affichage', 'ASC']]
    });

    res.json(elements);
  } catch (error) {
    logger.error('Erreur getElements:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des elements' });
  }
};

/**
 * Cree un nouvel element
 */
exports.createElement = async (req, res) => {
  try {
    const { etageId } = req.params;
    const {
      type_element,
      points,
      rotation,
      style,
      libelle,
      libelle_position,
      description,
      calque,
      chevauchable,
      verrouille,
      visible_public
    } = req.body;

    // Verifier que l'etage existe
    const etage = await Etage.findByPk(etageId);
    if (!etage) {
      return res.status(404).json({ error: 'Etage non trouve' });
    }

    // Appliquer le style par defaut si non fourni
    const defaultStyle = ElementPlan.getDefaultStyle(type_element);
    const finalStyle = { ...defaultStyle, ...style };

    // Determiner l'ordre d'affichage
    const maxOrdre = await ElementPlan.max('ordre_affichage', {
      where: { etage_id: etageId, calque: calque || 0 }
    }) || 0;

    const element = await ElementPlan.create({
      etage_id: etageId,
      type_element,
      points,
      rotation: rotation || 0,
      style: finalStyle,
      libelle,
      libelle_position,
      description,
      calque: calque || 0,
      chevauchable: type_element === 'zone' ? true : (chevauchable || false),
      verrouille: verrouille || false,
      visible_public: visible_public !== false,
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(element);
  } catch (error) {
    logger.error('Erreur createElement:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de l\'element' });
  }
};

/**
 * Met a jour un element
 */
exports.updateElement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type_element,
      points,
      rotation,
      style,
      libelle,
      libelle_position,
      description,
      calque,
      chevauchable,
      verrouille,
      visible_public,
      ordre_affichage,
      actif
    } = req.body;

    const element = await ElementPlan.findByPk(id);
    if (!element) {
      return res.status(404).json({ error: 'Element non trouve' });
    }

    if (element.verrouille && !req.body.forceUnlock) {
      return res.status(403).json({ error: 'Element verrouille' });
    }

    await element.update({
      type_element,
      points,
      rotation,
      style,
      libelle,
      libelle_position,
      description,
      calque,
      chevauchable,
      verrouille,
      visible_public,
      ordre_affichage,
      actif
    });

    res.json(element);
  } catch (error) {
    logger.error('Erreur updateElement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de l\'element' });
  }
};

/**
 * Supprime un element (soft delete)
 */
exports.deleteElement = async (req, res) => {
  try {
    const { id } = req.params;

    const element = await ElementPlan.findByPk(id);
    if (!element) {
      return res.status(404).json({ error: 'Element non trouve' });
    }

    if (element.verrouille) {
      return res.status(403).json({ error: 'Element verrouille' });
    }

    await element.update({ actif: false });

    res.json({ message: 'Element supprime avec succes' });
  } catch (error) {
    logger.error('Erreur deleteElement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'element' });
  }
};

/**
 * Sauvegarde multiple d'elements (pour sauvegarde en lot)
 */
exports.saveElements = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { etageId } = req.params;
    const { elements } = req.body;

    if (!Array.isArray(elements)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'elements doit etre un tableau' });
    }

    const results = [];

    for (const elem of elements) {
      if (elem.id) {
        // Mise a jour
        const existing = await ElementPlan.findByPk(elem.id);
        if (existing && !existing.verrouille) {
          await existing.update(elem, { transaction });
          results.push(existing);
        }
      } else {
        // Creation
        const defaultStyle = ElementPlan.getDefaultStyle(elem.type_element);
        const newElem = await ElementPlan.create({
          ...elem,
          etage_id: etageId,
          style: { ...defaultStyle, ...elem.style }
        }, { transaction });
        results.push(newElem);
      }
    }

    await transaction.commit();
    res.json(results);
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur saveElements:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des elements' });
  }
};

// ============================================
// EMPLACEMENTS (liaisons)
// ============================================

/**
 * Ajoute une liaison element <-> emplacement
 */
exports.addEmplacement = async (req, res) => {
  try {
    const { elementId } = req.params;
    const {
      type_collection,
      emplacement_id,
      position,
      libelle_override
    } = req.body;

    // Verifier que l'element existe
    const element = await ElementPlan.findByPk(elementId);
    if (!element) {
      return res.status(404).json({ error: 'Element non trouve' });
    }

    // Construire l'objet avec le bon champ d'emplacement
    const data = {
      element_plan_id: elementId,
      type_collection,
      position: position || 0,
      libelle_override
    };

    switch (type_collection) {
      case 'jeu':
        data.emplacement_jeu_id = emplacement_id;
        break;
      case 'livre':
        data.emplacement_livre_id = emplacement_id;
        break;
      case 'film':
        data.emplacement_film_id = emplacement_id;
        break;
      case 'disque':
        data.emplacement_disque_id = emplacement_id;
        break;
      default:
        return res.status(400).json({ error: 'type_collection invalide' });
    }

    const liaison = await ElementEmplacement.create(data);

    // Recharger avec les associations
    const liaisonComplete = await ElementEmplacement.findByPk(liaison.id, {
      include: [
        { model: EmplacementJeu, as: 'emplacementJeu' },
        { model: EmplacementLivre, as: 'emplacementLivre' },
        { model: EmplacementFilm, as: 'emplacementFilm' },
        { model: EmplacementDisque, as: 'emplacementDisque' }
      ]
    });

    res.status(201).json(liaisonComplete);
  } catch (error) {
    logger.error('Erreur addEmplacement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'emplacement' });
  }
};

/**
 * Supprime une liaison element <-> emplacement
 */
exports.removeEmplacement = async (req, res) => {
  try {
    const { id } = req.params;

    const liaison = await ElementEmplacement.findByPk(id);
    if (!liaison) {
      return res.status(404).json({ error: 'Liaison non trouvee' });
    }

    await liaison.destroy();

    res.json({ message: 'Liaison supprimee avec succes' });
  } catch (error) {
    logger.error('Erreur removeEmplacement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la liaison' });
  }
};

// ============================================
// VUE PUBLIQUE
// ============================================

/**
 * Recupere un plan pour la vue publique (avec comptage articles)
 */
exports.getPlanPublic = async (req, res) => {
  try {
    const { siteId } = req.params;

    const plan = await Plan.findOne({
      where: { site_id: siteId, actif: true },
      include: [
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'code', 'nom']
        },
        {
          model: Etage,
          as: 'etages',
          where: { actif: true },
          required: false,
          order: [['ordre_affichage', 'ASC']],
          include: [{
            model: ElementPlan,
            as: 'elements',
            where: { actif: true, visible_public: true },
            required: false,
            order: [['calque', 'ASC'], ['ordre_affichage', 'ASC']],
            include: [{
              model: ElementEmplacement,
              as: 'emplacements',
              include: [
                { model: EmplacementJeu, as: 'emplacementJeu' },
                { model: EmplacementLivre, as: 'emplacementLivre' },
                { model: EmplacementFilm, as: 'emplacementFilm' },
                { model: EmplacementDisque, as: 'emplacementDisque' }
              ]
            }]
          }]
        }
      ]
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouve' });
    }

    res.json(plan);
  } catch (error) {
    logger.error('Erreur getPlanPublic:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation du plan' });
  }
};

/**
 * Recupere les articles d'un element (pour popup publique)
 * Un element peut avoir plusieurs emplacements de differents types
 */
exports.getArticlesElement = async (req, res) => {
  try {
    const { elementId } = req.params;

    // Recuperer l'element avec ses emplacements
    const element = await ElementPlan.findByPk(elementId, {
      include: [{
        model: ElementEmplacement,
        as: 'emplacements',
        include: [
          { model: EmplacementJeu, as: 'emplacementJeu' },
          { model: EmplacementLivre, as: 'emplacementLivre' },
          { model: EmplacementFilm, as: 'emplacementFilm' },
          { model: EmplacementDisque, as: 'emplacementDisque' }
        ]
      }]
    });

    if (!element) {
      return res.status(404).json({ error: 'Element non trouve' });
    }

    const articles = [];

    // Pour chaque emplacement lie, recuperer les articles
    // Filtre: exclure les articles archives ou perdus
    const statutsValides = { [Op.notIn]: ['archive', 'perdu'] };

    for (const emp of element.emplacements || []) {
      if (emp.type_collection === 'jeu' && emp.emplacement_jeu_id) {
        const jeux = await Jeu.findAll({
          where: { emplacement_id: emp.emplacement_jeu_id, statut: statutsValides },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          order: [['titre', 'ASC']]
        });
        jeux.forEach(j => articles.push({
          id: j.id,
          type: 'jeu',
          nom: j.titre,
          code: j.code_barre,
          image: j.image_url,
          disponible: j.statut === 'disponible',
          emplacement: emp.emplacementJeu?.libelle
        }));
      }

      if (emp.type_collection === 'livre' && emp.emplacement_livre_id) {
        const livres = await Livre.findAll({
          where: { emplacement_id: emp.emplacement_livre_id, statut: statutsValides },
          attributes: ['id', 'titre', 'isbn', 'image_url', 'statut'],
          order: [['titre', 'ASC']]
        });
        livres.forEach(l => articles.push({
          id: l.id,
          type: 'livre',
          nom: l.titre,
          code: l.isbn,
          image: l.image_url,
          disponible: l.statut === 'disponible',
          emplacement: emp.emplacementLivre?.libelle
        }));
      }

      if (emp.type_collection === 'film' && emp.emplacement_film_id) {
        const films = await Film.findAll({
          where: { emplacement_id: emp.emplacement_film_id, statut: statutsValides },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          order: [['titre', 'ASC']]
        });
        films.forEach(f => articles.push({
          id: f.id,
          type: 'film',
          nom: f.titre,
          code: f.code_barre,
          image: f.image_url,
          disponible: f.statut === 'disponible',
          emplacement: emp.emplacementFilm?.libelle
        }));
      }

      if (emp.type_collection === 'disque' && emp.emplacement_disque_id) {
        const disques = await Disque.findAll({
          where: { emplacement_id: emp.emplacement_disque_id, statut: statutsValides },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          order: [['titre', 'ASC']]
        });
        disques.forEach(d => articles.push({
          id: d.id,
          type: 'disque',
          nom: d.titre,
          code: d.code_barre,
          image: d.image_url,
          disponible: d.statut === 'disponible',
          emplacement: emp.emplacementDisque?.libelle
        }));
      }
    }

    // Trier par nom
    articles.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

    // Format attendu par le frontend: { articles: [...] }
    res.json({
      articles: articles.map(a => ({
        id: a.id,
        type: a.type,
        titre: a.nom,
        image_url: a.image,
        statut: a.disponible ? 'disponible' : 'emprunte'
      }))
    });
  } catch (error) {
    logger.error('Erreur getArticlesElement:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des articles', details: error.message });
  }
};

/**
 * Recupere les articles d'un emplacement (pour popup publique)
 */
exports.getArticlesEmplacement = async (req, res) => {
  try {
    const { type, emplacementId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let articles = [];
    let total = 0;

    switch (type) {
      case 'jeu':
        const jeux = await Jeu.findAndCountAll({
          where: { emplacement_id: emplacementId, actif: true },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['titre', 'ASC']]
        });
        articles = jeux.rows;
        total = jeux.count;
        break;

      case 'livre':
        const livres = await Livre.findAndCountAll({
          where: { emplacement_id: emplacementId, actif: true },
          attributes: ['id', 'titre', 'isbn', 'image_url', 'statut'],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['titre', 'ASC']]
        });
        articles = livres.rows;
        total = livres.count;
        break;

      case 'film':
        const films = await Film.findAndCountAll({
          where: { emplacement_id: emplacementId, actif: true },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['titre', 'ASC']]
        });
        articles = films.rows;
        total = films.count;
        break;

      case 'disque':
        const disques = await Disque.findAndCountAll({
          where: { emplacement_id: emplacementId, actif: true },
          attributes: ['id', 'titre', 'code_barre', 'image_url', 'statut'],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['titre', 'ASC']]
        });
        articles = disques.rows;
        total = disques.count;
        break;

      default:
        return res.status(400).json({ error: 'Type invalide' });
    }

    res.json({
      articles,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Erreur getArticlesEmplacement:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des articles' });
  }
};

// ============================================
// EMPLACEMENTS DISPONIBLES (pour selects)
// ============================================

/**
 * Liste tous les emplacements disponibles pour un type de collection
 */
exports.getEmplacementsDisponibles = async (req, res) => {
  try {
    const { type } = req.params;
    const { siteId } = req.query;

    let emplacements = [];
    const where = { actif: true };
    if (siteId) {
      where.site_id = siteId;
    }

    const attributes = ['id', 'code', 'libelle', 'site_id', 'couleur', 'icone', 'description'];

    switch (type) {
      case 'jeu':
        emplacements = await EmplacementJeu.findAll({
          where,
          attributes,
          order: [['libelle', 'ASC']]
        });
        break;

      case 'livre':
        emplacements = await EmplacementLivre.findAll({
          where,
          attributes,
          order: [['libelle', 'ASC']]
        });
        break;

      case 'film':
        emplacements = await EmplacementFilm.findAll({
          where,
          attributes,
          order: [['libelle', 'ASC']]
        });
        break;

      case 'disque':
        emplacements = await EmplacementDisque.findAll({
          where,
          attributes,
          order: [['libelle', 'ASC']]
        });
        break;

      default:
        return res.status(400).json({ error: 'Type invalide' });
    }

    res.json(emplacements);
  } catch (error) {
    logger.error('Erreur getEmplacementsDisponibles:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des emplacements' });
  }
};

/**
 * Cree un nouvel emplacement (creation rapide depuis l'editeur de plan)
 */
exports.createEmplacement = async (req, res) => {
  try {
    const { type } = req.params;
    const { libelle, code, description, site_id, couleur, icone } = req.body;

    if (!libelle) {
      return res.status(400).json({ error: 'Le libelle est requis' });
    }

    const data = {
      libelle,
      code: code || null,
      description: description || null,
      site_id: site_id || null,
      couleur: couleur || '#6c757d',
      icone: icone || 'geo-alt',
      actif: true
    };

    let emplacement;

    switch (type) {
      case 'jeu':
        emplacement = await EmplacementJeu.create(data);
        break;
      case 'livre':
        emplacement = await EmplacementLivre.create(data);
        break;
      case 'film':
        emplacement = await EmplacementFilm.create(data);
        break;
      case 'disque':
        emplacement = await EmplacementDisque.create(data);
        break;
      default:
        return res.status(400).json({ error: 'Type invalide' });
    }

    res.status(201).json(emplacement);
  } catch (error) {
    logger.error('Erreur createEmplacement:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de l\'emplacement' });
  }
};

// ============================================
// TEMPLATES DE PLANS
// ============================================

/**
 * Donnees des templates de plans disponibles
 */
const PLAN_TEMPLATES = [
  {
    id: 'empty',
    nom: 'Plan vide',
    description: 'Canvas vide pour dessiner librement',
    preview: null,
    elements: []
  },
  {
    id: 'rectangle',
    nom: 'Salle rectangulaire',
    description: 'Une piece rectangulaire avec 4 murs',
    preview: null,
    elements: [
      {
        type_element: 'mur',
        points: [{ x: 40, y: 40 }, { x: 1160, y: 40 }],
        style: { couleur: '#333333', epaisseur: 6 }
      },
      {
        type_element: 'mur',
        points: [{ x: 1160, y: 40 }, { x: 1160, y: 760 }],
        style: { couleur: '#333333', epaisseur: 6 }
      },
      {
        type_element: 'mur',
        points: [{ x: 1160, y: 760 }, { x: 40, y: 760 }],
        style: { couleur: '#333333', epaisseur: 6 }
      },
      {
        type_element: 'mur',
        points: [{ x: 40, y: 760 }, { x: 40, y: 40 }],
        style: { couleur: '#333333', epaisseur: 6 }
      }
    ]
  },
  {
    id: 'en-l',
    nom: 'Salle en L',
    description: 'Une piece en forme de L',
    preview: null,
    elements: [
      { type_element: 'mur', points: [{ x: 40, y: 40 }, { x: 700, y: 40 }] },
      { type_element: 'mur', points: [{ x: 700, y: 40 }, { x: 700, y: 400 }] },
      { type_element: 'mur', points: [{ x: 700, y: 400 }, { x: 1160, y: 400 }] },
      { type_element: 'mur', points: [{ x: 1160, y: 400 }, { x: 1160, y: 760 }] },
      { type_element: 'mur', points: [{ x: 1160, y: 760 }, { x: 40, y: 760 }] },
      { type_element: 'mur', points: [{ x: 40, y: 760 }, { x: 40, y: 40 }] }
    ]
  },
  {
    id: 'ludotheque',
    nom: 'Ludotheque type',
    description: 'Plan type avec accueil, etageres et espace jeu',
    preview: null,
    elements: [
      // Murs exterieurs
      { type_element: 'mur', points: [{ x: 40, y: 40 }, { x: 1160, y: 40 }] },
      { type_element: 'mur', points: [{ x: 1160, y: 40 }, { x: 1160, y: 760 }] },
      { type_element: 'mur', points: [{ x: 1160, y: 760 }, { x: 40, y: 760 }] },
      { type_element: 'mur', points: [{ x: 40, y: 760 }, { x: 40, y: 40 }] },
      // Comptoir accueil
      {
        type_element: 'meuble',
        points: [{ x: 100, y: 100 }, { x: 300, y: 180 }],
        libelle: 'Accueil',
        style: { couleur: '#2c3e50', remplissage: '#bdc3c7' }
      },
      // Etageres
      {
        type_element: 'etagere',
        points: [{ x: 100, y: 240 }, { x: 200, y: 700 }],
        libelle: 'Etagere A',
        style: { couleur: '#8B4513' }
      },
      {
        type_element: 'etagere',
        points: [{ x: 260, y: 240 }, { x: 360, y: 700 }],
        libelle: 'Etagere B',
        style: { couleur: '#8B4513' }
      },
      // Tables de jeu
      {
        type_element: 'table',
        points: [{ x: 600, y: 300 }, { x: 800, y: 460 }],
        libelle: 'Table 1'
      },
      {
        type_element: 'table',
        points: [{ x: 860, y: 300 }, { x: 1060, y: 460 }],
        libelle: 'Table 2'
      },
      // Zone enfants
      {
        type_element: 'zone',
        points: [{ x: 600, y: 540 }, { x: 1060, y: 700 }],
        libelle: 'Coin enfants',
        style: { couleur: '#27ae60', remplissage: '#27ae60', opacite: 0.2 }
      }
    ]
  }
];

/**
 * Retourne les templates de plans disponibles
 */
exports.getTemplates = async (req, res) => {
  try {
    res.json(PLAN_TEMPLATES);
  } catch (error) {
    logger.error('Erreur getTemplates:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des templates' });
  }
};

/**
 * Applique un template a un etage
 */
exports.applyTemplate = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { etageId } = req.params;
    const { templateId, clearExisting } = req.body;

    // Verifier que l'etage existe
    const etage = await Etage.findByPk(etageId);
    if (!etage) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Etage non trouve' });
    }

    // Recuperer le template depuis la constante
    const template = PLAN_TEMPLATES.find(t => t.id === templateId);

    if (!template) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Template non trouve' });
    }

    // Supprimer les elements existants si demande
    if (clearExisting) {
      await ElementPlan.update(
        { actif: false },
        { where: { etage_id: etageId }, transaction }
      );
    }

    // Creer les nouveaux elements
    const createdElements = [];
    for (let i = 0; i < template.elements.length; i++) {
      const elemData = template.elements[i];
      const defaultStyle = ElementPlan.getDefaultStyle(elemData.type_element);

      const element = await ElementPlan.create({
        etage_id: etageId,
        type_element: elemData.type_element,
        points: elemData.points,
        style: { ...defaultStyle, ...elemData.style },
        libelle: elemData.libelle,
        chevauchable: elemData.type_element === 'zone',
        ordre_affichage: i
      }, { transaction });

      createdElements.push(element);
    }

    await transaction.commit();

    res.json({
      message: `Template "${template.nom}" applique avec succes`,
      elements: createdElements
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur applyTemplate:', error);
    res.status(500).json({ error: 'Erreur lors de l\'application du template' });
  }
};
