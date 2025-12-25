/**
 * Controller pour le desherbage (lots de sortie)
 * Gestion des articles sortis du stock (rebus, don, vente)
 */

const {
  TypeSortie,
  LotSortie,
  ArticleSortie,
  Jeu,
  Livre,
  Film,
  Disque,
  ExemplaireJeu,
  ExemplaireLivre,
  ExemplaireFilm,
  ExemplaireDisque,
  Structure,
  Utilisateur,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Mapping type_article -> Model (legacy)
const ARTICLE_MODELS = {
  jeu: Jeu,
  livre: Livre,
  film: Film,
  disque: Disque
};

// Mapping type_exemplaire -> Models (V2)
const EXEMPLAIRE_MODELS = {
  jeu: { exemplaire: ExemplaireJeu, article: Jeu, fk: 'jeu_id', table: 'exemplaires_jeux', articleTable: 'jeux' },
  livre: { exemplaire: ExemplaireLivre, article: Livre, fk: 'livre_id', table: 'exemplaires_livres', articleTable: 'livres' },
  film: { exemplaire: ExemplaireFilm, article: Film, fk: 'film_id', table: 'exemplaires_films', articleTable: 'films' },
  disque: { exemplaire: ExemplaireDisque, article: Disque, fk: 'disque_id', table: 'exemplaires_disques', articleTable: 'disques' }
};

/**
 * Liste des types de sortie
 */
exports.getTypesSortie = async (req, res) => {
  try {
    const structureId = req.structureId || null;

    const where = { actif: true };
    if (structureId) {
      where[Op.or] = [
        { structure_id: null },
        { structure_id: structureId }
      ];
    }

    const types = await TypeSortie.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']]
    });

    res.json(types);
  } catch (error) {
    logger.error('Erreur getTypesSortie:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des types de sortie' });
  }
};

/**
 * Creer un type de sortie (admin)
 */
exports.createTypeSortie = async (req, res) => {
  try {
    const typeSortie = await TypeSortie.create(req.body);
    res.status(201).json(typeSortie);
  } catch (error) {
    logger.error('Erreur createTypeSortie:', error);
    res.status(500).json({ error: 'Erreur lors de la creation du type de sortie' });
  }
};

/**
 * Modifier un type de sortie (admin)
 */
exports.updateTypeSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const typeSortie = await TypeSortie.findByPk(id);

    if (!typeSortie) {
      return res.status(404).json({ error: 'Type de sortie non trouve' });
    }

    await typeSortie.update(req.body);
    res.json(typeSortie);
  } catch (error) {
    logger.error('Erreur updateTypeSortie:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du type de sortie' });
  }
};

/**
 * Liste des lots de sortie avec filtres
 */
exports.getLots = async (req, res) => {
  try {
    const {
      statut,
      type_sortie_id,
      date_debut,
      date_fin,
      page = 1,
      limit = 20
    } = req.query;

    const structureId = req.structureId || null;

    const where = {};

    if (structureId) {
      where.structure_id = structureId;
    }

    if (statut) {
      where.statut = statut;
    }

    if (type_sortie_id) {
      where.type_sortie_id = type_sortie_id;
    }

    if (date_debut || date_fin) {
      where.date_sortie = {};
      if (date_debut) where.date_sortie[Op.gte] = date_debut;
      if (date_fin) where.date_sortie[Op.lte] = date_fin;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await LotSortie.findAndCountAll({
      where,
      include: [
        { model: TypeSortie, as: 'typeSortie' },
        { model: Structure, as: 'structure', required: false },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'validateur', attributes: ['id', 'nom', 'prenom'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      lots: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    logger.error('Erreur getLots:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des lots' });
  }
};

/**
 * Detail d'un lot avec ses articles
 */
exports.getLotById = async (req, res) => {
  try {
    const { id } = req.params;

    const lot = await LotSortie.findByPk(id, {
      include: [
        { model: TypeSortie, as: 'typeSortie' },
        { model: Structure, as: 'structure', required: false },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'validateur', attributes: ['id', 'nom', 'prenom'] },
        {
          model: ArticleSortie,
          as: 'articles',
          include: [
            { model: Utilisateur, as: 'annuleur', attributes: ['id', 'nom', 'prenom'], required: false }
          ]
        }
      ]
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    // Enrichir les articles avec leurs details
    const articlesEnrichis = await Promise.all(
      lot.articles.map(async (articleSortie) => {
        const article = await articleSortie.getArticle();
        return {
          ...articleSortie.toJSON(),
          article: article ? {
            id: article.id,
            titre: article.titre,
            code_barre: article.code_barre,
            image_url: article.image_url
          } : null
        };
      })
    );

    res.json({
      ...lot.toJSON(),
      articles: articlesEnrichis
    });
  } catch (error) {
    logger.error('Erreur getLotById:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation du lot' });
  }
};

/**
 * Creer un nouveau lot (brouillon)
 */
exports.createLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { type_sortie_id, date_sortie, destination, commentaire } = req.body;
    const structureId = req.structureId || null;
    const userId = req.user?.id;

    // Generer le numero de lot
    const numero = await LotSortie.genererNumero();

    const lot = await LotSortie.create({
      numero,
      type_sortie_id,
      structure_id: structureId,
      date_sortie: date_sortie || new Date(),
      destination,
      commentaire,
      statut: 'brouillon',
      cree_par: userId
    }, { transaction });

    await transaction.commit();

    // Recharger avec associations
    const lotComplet = await LotSortie.findByPk(lot.id, {
      include: [
        { model: TypeSortie, as: 'typeSortie' },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'prenom'] }
      ]
    });

    res.status(201).json(lotComplet);
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur createLot:', error);
    res.status(500).json({ error: 'Erreur lors de la creation du lot' });
  }
};

/**
 * Modifier un lot (si brouillon)
 */
exports.updateLot = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await LotSortie.findByPk(id);

    if (!lot) {
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.estModifiable()) {
      return res.status(400).json({ error: 'Le lot ne peut plus etre modifie (statut: ' + lot.statut + ')' });
    }

    const { type_sortie_id, date_sortie, destination, commentaire } = req.body;

    await lot.update({
      type_sortie_id,
      date_sortie,
      destination,
      commentaire
    });

    res.json(lot);
  } catch (error) {
    logger.error('Erreur updateLot:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du lot' });
  }
};

/**
 * Supprimer un lot (si brouillon et vide)
 */
exports.deleteLot = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await LotSortie.findByPk(id, {
      include: [{ model: ArticleSortie, as: 'articles' }]
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.estModifiable()) {
      return res.status(400).json({ error: 'Le lot ne peut plus etre supprime' });
    }

    if (lot.articles && lot.articles.length > 0) {
      return res.status(400).json({ error: 'Le lot contient des articles. Retirez-les d\'abord.' });
    }

    await lot.destroy();
    res.json({ message: 'Lot supprime' });
  } catch (error) {
    logger.error('Erreur deleteLot:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du lot' });
  }
};

/**
 * Ajouter des articles a un lot
 */
exports.addArticlesToLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { articles } = req.body; // [{ type_article: 'jeu', article_id: 1, notes: '' }, ...]

    const lot = await LotSortie.findByPk(id);

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.estModifiable()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le lot ne peut plus etre modifie' });
    }

    const articlesAjoutes = [];
    const erreurs = [];

    for (const art of articles) {
      try {
        const { type_article, article_id, notes } = art;

        // Verifier que l'article existe et n'est pas deja sorti
        const Model = ARTICLE_MODELS[type_article];
        if (!Model) {
          erreurs.push({ type_article, article_id, error: 'Type d\'article invalide' });
          continue;
        }

        const article = await Model.findByPk(article_id, { transaction });
        if (!article) {
          erreurs.push({ type_article, article_id, error: 'Article non trouve' });
          continue;
        }

        if (article.statut === 'sorti') {
          erreurs.push({ type_article, article_id, error: 'Article deja sorti' });
          continue;
        }

        // Verifier que l'article n'est pas deja dans un lot
        const existeDeja = await ArticleSortie.findOne({
          where: {
            type_article,
            article_id,
            annule: false
          },
          transaction
        });

        if (existeDeja) {
          erreurs.push({ type_article, article_id, error: 'Article deja dans un lot de sortie' });
          continue;
        }

        // Calculer la valeur
        const valeur = await ArticleSortie.calculerValeur(type_article, article_id);

        // Creer l'entree
        const articleSortie = await ArticleSortie.create({
          lot_sortie_id: lot.id,
          type_article,
          article_id,
          valeur,
          etat_avant_sortie: article.etat,
          statut_precedent: article.statut,
          notes
        }, { transaction });

        articlesAjoutes.push(articleSortie);
      } catch (err) {
        erreurs.push({ ...art, error: err.message });
      }
    }

    await transaction.commit();

    // Recalculer les totaux (apres commit pour voir les articles)
    await lot.recalculerTotaux();

    res.json({
      lot_id: lot.id,
      articles_ajoutes: articlesAjoutes.length,
      erreurs: erreurs.length > 0 ? erreurs : undefined,
      nb_articles: lot.nb_articles,
      valeur_totale: lot.valeur_totale
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur addArticlesToLot:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des articles' });
  }
};

/**
 * Ajouter des exemplaires a un lot (V2)
 * API: POST /api/desherbage/lots/:id/exemplaires
 * Body: { exemplaires: [{ type_exemplaire, exemplaire_id, notes }, ...] }
 */
exports.addExemplairesToLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { exemplaires } = req.body;

    if (!Array.isArray(exemplaires) || exemplaires.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Liste d\'exemplaires requise' });
    }

    const lot = await LotSortie.findByPk(id, { transaction });

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.estModifiable()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le lot ne peut plus etre modifie' });
    }

    const exemplairesAjoutes = [];
    const erreurs = [];

    for (const ex of exemplaires) {
      try {
        // Support both V2 (exemplaire) and legacy (article) formats
        let { type_exemplaire, exemplaire_id, notes } = ex;
        const { type_article, article_id } = ex; // Legacy fields

        // Si seulement article_id fourni, resoudre l'exemplaire automatiquement
        if (!exemplaire_id && article_id && type_article) {
          type_exemplaire = type_article;
          const config = EXEMPLAIRE_MODELS[type_exemplaire];
          if (!config) {
            erreurs.push({ type_article, article_id, error: 'Type d\'article invalide' });
            continue;
          }

          // Trouver le premier exemplaire disponible pour cet article
          const ExemplaireModel = config.exemplaire;
          const fk = config.fk;

          const exemplaireAuto = await ExemplaireModel.findOne({
            where: {
              [fk]: article_id,
              statut: { [Op.notIn]: ['sorti', 'perdu', 'archive'] }
            },
            order: [['numero_exemplaire', 'ASC']],
            transaction
          });

          if (!exemplaireAuto) {
            erreurs.push({ type_article, article_id, error: 'Aucun exemplaire disponible pour cet article' });
            continue;
          }

          exemplaire_id = exemplaireAuto.id;
        }

        // Verifier que le type est valide
        const config = EXEMPLAIRE_MODELS[type_exemplaire];
        if (!config) {
          erreurs.push({ type_exemplaire, exemplaire_id, error: 'Type d\'exemplaire invalide' });
          continue;
        }

        const ExemplaireModel = config.exemplaire;
        const ArticleModel = config.article;
        const fk = config.fk;

        // Recuperer l'exemplaire avec son article parent
        const exemplaire = await ExemplaireModel.findByPk(exemplaire_id, {
          include: [{ model: ArticleModel, as: type_exemplaire }],
          transaction
        });

        if (!exemplaire) {
          erreurs.push({ type_exemplaire, exemplaire_id, error: 'Exemplaire non trouve' });
          continue;
        }

        // Verifier que l'exemplaire n'est pas deja sorti
        if (exemplaire.statut === 'sorti') {
          erreurs.push({ type_exemplaire, exemplaire_id, error: 'Exemplaire deja sorti' });
          continue;
        }

        // Verifier que l'exemplaire n'est pas deja dans un lot actif
        const existeDeja = await ArticleSortie.findOne({
          where: {
            type_exemplaire,
            exemplaire_id,
            annule: false
          },
          transaction
        });

        if (existeDeja) {
          erreurs.push({ type_exemplaire, exemplaire_id, error: 'Exemplaire deja dans un lot de sortie' });
          continue;
        }

        // Calculer la valeur: exemplaire.prix_achat || article.prix_indicatif || 0
        const valeur = await ArticleSortie.calculerValeur(type_exemplaire, exemplaire_id);

        // Recuperer l'article parent pour retrocompatibilite
        const article = exemplaire[type_exemplaire];

        // Creer l'entree ArticleSortie
        const articleSortie = await ArticleSortie.create({
          lot_sortie_id: lot.id,
          // V2: Champs exemplaire
          type_exemplaire,
          exemplaire_id,
          // Legacy: Champs article (retrocompatibilite)
          type_article: type_exemplaire,
          article_id: article.id,
          // Valeurs et etat
          valeur,
          etat_avant_sortie: exemplaire.etat,
          statut_precedent: exemplaire.statut,
          notes
        }, { transaction });

        exemplairesAjoutes.push({
          id: articleSortie.id,
          type_exemplaire,
          exemplaire_id,
          article_id: article.id,
          titre: article.titre,
          valeur
        });
      } catch (err) {
        logger.error('Erreur ajout exemplaire:', err);
        erreurs.push({ ...ex, error: err.message });
      }
    }

    await transaction.commit();

    // Recalculer les totaux (apres commit pour voir les articles)
    await lot.recalculerTotaux();

    res.json({
      lot_id: lot.id,
      exemplaires_ajoutes: exemplairesAjoutes.length,
      exemplaires: exemplairesAjoutes,
      erreurs: erreurs.length > 0 ? erreurs : undefined,
      nb_articles: lot.nb_articles,
      valeur_totale: lot.valeur_totale
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur addExemplairesToLot:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des exemplaires' });
  }
};

/**
 * Retirer un article d'un lot
 */
exports.removeArticleFromLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, articleSortieId } = req.params;

    const lot = await LotSortie.findByPk(id, { transaction });

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.estModifiable()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le lot ne peut plus etre modifie' });
    }

    const articleSortie = await ArticleSortie.findOne({
      where: {
        id: articleSortieId,
        lot_sortie_id: id
      },
      transaction
    });

    if (!articleSortie) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Article non trouve dans ce lot' });
    }

    await articleSortie.destroy({ transaction });

    await transaction.commit();

    // Recalculer les totaux (apres commit)
    await lot.recalculerTotaux();

    res.json({
      message: 'Article retire du lot',
      nb_articles: lot.nb_articles,
      valeur_totale: lot.valeur_totale
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur removeArticleFromLot:', error);
    res.status(500).json({ error: 'Erreur lors du retrait de l\'article' });
  }
};

/**
 * Valider un lot (articles passent en statut 'sorti')
 */
exports.validerLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const lot = await LotSortie.findByPk(id, {
      include: [{ model: ArticleSortie, as: 'articles', where: { annule: false }, required: false }],
      transaction
    });

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.peutEtreValide()) {
      await transaction.rollback();
      return res.status(400).json({
        error: lot.statut !== 'brouillon'
          ? 'Le lot a deja ete valide'
          : 'Le lot est vide'
      });
    }

    // Marquer chaque article comme sorti
    for (const articleSortie of lot.articles) {
      await articleSortie.marquerArticleSorti(lot);
    }

    // Mettre a jour le statut du lot
    await lot.update({
      statut: 'valide',
      valide_par: userId,
      date_validation: new Date()
    }, { transaction });

    await transaction.commit();

    logger.info(`Lot ${lot.numero} valide par utilisateur ${userId}, ${lot.nb_articles} articles sortis`);

    res.json({
      message: 'Lot valide avec succes',
      lot: {
        id: lot.id,
        numero: lot.numero,
        statut: 'valide',
        nb_articles: lot.nb_articles,
        valeur_totale: lot.valeur_totale
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur validerLot:', error);
    res.status(500).json({ error: 'Erreur lors de la validation du lot' });
  }
};

/**
 * Exporter un lot (generer ecritures comptables)
 */
exports.exporterLot = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const lot = await LotSortie.findByPk(id, {
      include: [
        { model: TypeSortie, as: 'typeSortie' },
        { model: ArticleSortie, as: 'articles', where: { annule: false }, required: false }
      ],
      transaction
    });

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    if (!lot.peutEtreExporte()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le lot doit etre valide avant export' });
    }

    // Generer les ecritures comptables si configure
    let ecritures = null;
    if (lot.typeSortie.generer_ecritures) {
      try {
        const comptabiliteService = require('../services/comptabiliteService');
        ecritures = await comptabiliteService.genererEcrituresSortieLot(lot, { transaction });
      } catch (comptaError) {
        logger.warn('Erreur generation ecritures comptables:', comptaError);
        // On continue meme si la comptabilite echoue
      }
    }

    // Mettre a jour le lot
    await lot.update({
      statut: 'exporte',
      date_export_comptable: new Date(),
      numero_piece_comptable: ecritures?.numero_piece || null
    }, { transaction });

    await transaction.commit();

    logger.info(`Lot ${lot.numero} exporte, piece comptable: ${ecritures?.numero_piece || 'N/A'}`);

    res.json({
      message: 'Lot exporte avec succes',
      lot: {
        id: lot.id,
        numero: lot.numero,
        statut: 'exporte',
        numero_piece_comptable: ecritures?.numero_piece || null
      },
      ecritures: ecritures ? {
        nb_ecritures: ecritures.nb_ecritures,
        montant_total: ecritures.montant_total
      } : null
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur exporterLot:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export du lot' });
  }
};

/**
 * Reintegrer un article sorti
 */
exports.reintegrerArticle = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, articleSortieId } = req.params;
    const userId = req.user?.id;

    const lot = await LotSortie.findByPk(id, { transaction });

    if (!lot) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lot non trouve' });
    }

    const articleSortie = await ArticleSortie.findOne({
      where: {
        id: articleSortieId,
        lot_sortie_id: id,
        annule: false
      },
      transaction
    });

    if (!articleSortie) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Article non trouve ou deja reintegre' });
    }

    // Reintegrer l'article
    await articleSortie.reintegrer(userId);

    // Si le lot a ete exporte, generer ecritures de contrepassation
    if (lot.statut === 'exporte') {
      try {
        const comptabiliteService = require('../services/comptabiliteService');
        await comptabiliteService.genererEcrituresReintegration(articleSortie, { transaction });
      } catch (comptaError) {
        logger.warn('Erreur generation ecritures contrepassation:', comptaError);
      }
    }

    await transaction.commit();

    logger.info(`Article ${articleSortie.type_article} #${articleSortie.article_id} reintegre du lot ${lot.numero}`);

    res.json({
      message: 'Article reintegre avec succes',
      article: {
        id: articleSortie.id,
        type_article: articleSortie.type_article,
        article_id: articleSortie.article_id
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur reintegrerArticle:', error);
    res.status(500).json({ error: 'Erreur lors de la reintegration de l\'article' });
  }
};

/**
 * Calculer les fonds propres par structure/module
 * V2: Calcule depuis les exemplaires avec fallback sur article.prix_indicatif
 *
 * Formule: SUM(COALESCE(exemplaire.prix_achat, article.prix_indicatif, 0))
 * Filtre: exemplaire.statut NOT IN ('sorti', 'perdu', 'archive')
 */
exports.getFondsPropres = async (req, res) => {
  try {
    const structureId = req.structureId || req.query.structure_id || null;

    const modules = {};
    let totalExemplaires = 0;
    let totalValeur = 0;

    for (const [type, config] of Object.entries(EXEMPLAIRE_MODELS)) {
      // Construire le filtre structure
      let structureFilter = '';
      if (structureId) {
        structureFilter = `AND a.structure_id = ${parseInt(structureId)}`;
      }

      // Requete SQL jointe exemplaires <-> articles
      const [results] = await sequelize.query(`
        SELECT
          COUNT(e.id) as nb_exemplaires,
          COALESCE(SUM(COALESCE(e.prix_achat, a.prix_indicatif, 0)), 0) as valeur
        FROM ${config.table} e
        INNER JOIN ${config.articleTable} a ON a.id = e.${config.fk}
        WHERE e.statut NOT IN ('sorti', 'perdu', 'archive')
        ${structureFilter}
      `);

      const result = results[0] || { nb_exemplaires: 0, valeur: 0 };
      const nbExemplaires = parseInt(result.nb_exemplaires) || 0;
      const valeur = parseFloat(result.valeur) || 0;

      // Utiliser le pluriel comme cle (jeux, livres, etc.)
      const moduleName = type === 'jeu' ? 'jeux' :
                         type === 'livre' ? 'livres' :
                         type === 'film' ? 'films' : 'disques';

      modules[moduleName] = {
        nb_articles: nbExemplaires, // Renomme conceptuellement en nb_exemplaires
        valeur: valeur
      };

      totalExemplaires += nbExemplaires;
      totalValeur += valeur;
    }

    res.json({
      structure_id: structureId,
      modules,
      total: {
        nb_articles: totalExemplaires,
        valeur: totalValeur
      }
    });
  } catch (error) {
    logger.error('Erreur getFondsPropres:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des fonds propres' });
  }
};

/**
 * Statistiques de desherbage
 */
exports.getStatistiques = async (req, res) => {
  try {
    const structureId = req.structureId || req.query.structure_id || null;
    const annee = req.query.annee || new Date().getFullYear();

    const where = {};
    if (structureId) {
      where.structure_id = structureId;
    }

    // Lots par statut
    const lotsParStatut = await LotSortie.findAll({
      where,
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_lots'],
        [sequelize.fn('SUM', sequelize.col('nb_articles')), 'nb_articles'],
        [sequelize.fn('SUM', sequelize.col('valeur_totale')), 'valeur_totale']
      ],
      group: ['statut'],
      raw: true
    });

    // Sorties par type cette annee
    const debutAnnee = `${annee}-01-01`;
    const finAnnee = `${annee}-12-31`;

    const sortiesParType = await LotSortie.findAll({
      where: {
        ...where,
        date_sortie: { [Op.between]: [debutAnnee, finAnnee] },
        statut: { [Op.in]: ['valide', 'exporte'] }
      },
      include: [{ model: TypeSortie, as: 'typeSortie', attributes: ['code', 'libelle'] }],
      attributes: [
        'type_sortie_id',
        [sequelize.fn('COUNT', sequelize.col('LotSortie.id')), 'nb_lots'],
        [sequelize.fn('SUM', sequelize.col('nb_articles')), 'nb_articles'],
        [sequelize.fn('SUM', sequelize.col('valeur_totale')), 'valeur_totale']
      ],
      group: ['type_sortie_id', 'typeSortie.id'],
      raw: true
    });

    // Sorties recentes (lots valides/exportes recemment)
    const sortiesRecentes = await LotSortie.findAll({
      where: {
        ...where,
        statut: { [Op.in]: ['valide', 'exporte'] }
      },
      include: [{ model: TypeSortie, as: 'typeSortie', attributes: ['code', 'libelle'] }],
      order: [['date_sortie', 'DESC']],
      limit: 10
    });

    const sorties_recentes = sortiesRecentes.map(lot => ({
      id: lot.id,
      numero: lot.numero,
      date_sortie: lot.date_sortie,
      type_code: lot.typeSortie?.code,
      type_libelle: lot.typeSortie?.libelle,
      nb_articles: lot.nb_articles,
      valeur_totale: lot.valeur_totale
    }));

    // Lots exportes (pour historique)
    const lotsExportes = await LotSortie.findAll({
      where: {
        ...where,
        statut: 'exporte'
      },
      include: [{ model: TypeSortie, as: 'typeSortie', attributes: ['code', 'libelle'] }],
      order: [['date_export_comptable', 'DESC']],
      limit: 10
    });

    const lots_exportes = lotsExportes.map(lot => ({
      id: lot.id,
      numero: lot.numero,
      date_sortie: lot.date_sortie,
      date_export_comptable: lot.date_export_comptable,
      type_code: lot.typeSortie?.code,
      type_libelle: lot.typeSortie?.libelle,
      nb_articles: lot.nb_articles,
      valeur_totale: lot.valeur_totale,
      destination: lot.destination,
      numero_piece_comptable: lot.numero_piece_comptable
    }));

    res.json({
      annee,
      structure_id: structureId,
      lots_par_statut: lotsParStatut,
      sorties_par_type: sortiesParType,
      sorties_recentes,
      lots_exportes
    });
  } catch (error) {
    logger.error('Erreur getStatistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation des statistiques' });
  }
};
