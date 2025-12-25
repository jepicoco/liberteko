/**
 * Modele ArticleSortie
 * Liaison polymorphique entre lots de sortie et exemplaires (jeu/livre/film/disque)
 *
 * V2: Utilise maintenant type_exemplaire/exemplaire_id pour referencer les exemplaires.
 * Les champs type_article/article_id sont conserves pour retrocompatibilite.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleSortie = sequelize.define('ArticleSortie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lot_sortie_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference au lot de sortie'
    },
    // === Champs V2 (exemplaires) ===
    type_exemplaire: {
      type: DataTypes.ENUM('jeu', 'livre', 'film', 'disque'),
      allowNull: true, // Nullable pour retrocompatibilite
      comment: 'Type d exemplaire (V2)'
    },
    exemplaire_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable pour retrocompatibilite
      comment: 'ID de l exemplaire (V2)'
    },
    // === Champs legacy (articles) - conserves pour retrocompatibilite ===
    type_article: {
      type: DataTypes.ENUM('jeu', 'livre', 'film', 'disque'),
      allowNull: true, // Rendu nullable car V2 utilise type_exemplaire
      comment: 'Type d article (legacy)'
    },
    article_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Rendu nullable car V2 utilise exemplaire_id
      comment: 'ID article (legacy)'
    },
    article_id_backup: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Backup de article_id pour rollback'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Valeur au moment de la sortie (prix_achat ou prix_indicatif)'
    },
    etat_avant_sortie: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Etat physique avant sortie'
    },
    statut_precedent: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Statut avant sortie pour restauration'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes specifiques a cette sortie'
    },
    annule: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Article reintegre au stock'
    },
    date_annulation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de reintegration'
    },
    annule_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Utilisateur ayant reintegre'
    }
  }, {
    tableName: 'articles_sortie',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['lot_sortie_id'] },
      { fields: ['type_article', 'article_id'] },
      { fields: ['type_exemplaire', 'exemplaire_id'] },
      { fields: ['annule'] }
    ]
  });

  // Associations
  ArticleSortie.associate = function(models) {
    ArticleSortie.belongsTo(models.LotSortie, {
      foreignKey: 'lot_sortie_id',
      as: 'lot'
    });

    if (models.Utilisateur) {
      ArticleSortie.belongsTo(models.Utilisateur, {
        foreignKey: 'annule_par',
        as: 'annuleur'
      });
    }
  };

  // Methodes d'instance

  /**
   * Recupere l'exemplaire associe (V2)
   */
  ArticleSortie.prototype.getExemplaire = async function() {
    if (!this.type_exemplaire || !this.exemplaire_id) {
      return null; // Donnees legacy sans exemplaire
    }

    const EXEMPLAIRE_MODELS = {
      jeu: 'ExemplaireJeu',
      livre: 'ExemplaireLivre',
      film: 'ExemplaireFilm',
      disque: 'ExemplaireDisque'
    };

    const modelName = EXEMPLAIRE_MODELS[this.type_exemplaire];
    const Model = sequelize.models[modelName];

    if (!Model) {
      throw new Error(`Modele ${modelName} non trouve`);
    }

    return Model.findByPk(this.exemplaire_id);
  };

  /**
   * Recupere l'article associe (polymorphique)
   * Fonctionne avec V2 (via exemplaire) ou legacy (via article_id)
   */
  ArticleSortie.prototype.getArticle = async function() {
    // V2: Passer par l'exemplaire
    if (this.type_exemplaire && this.exemplaire_id) {
      const exemplaire = await this.getExemplaire();
      if (!exemplaire) return null;

      const ARTICLE_MODELS = {
        jeu: { model: 'Jeu', fk: 'jeu_id' },
        livre: { model: 'Livre', fk: 'livre_id' },
        film: { model: 'Film', fk: 'film_id' },
        disque: { model: 'Disque', fk: 'disque_id' }
      };

      const config = ARTICLE_MODELS[this.type_exemplaire];
      const ArticleModel = sequelize.models[config.model];
      return ArticleModel.findByPk(exemplaire[config.fk]);
    }

    // Legacy: Directement via article_id
    if (this.type_article && this.article_id) {
      const modelName = this.type_article.charAt(0).toUpperCase() + this.type_article.slice(1);
      const Model = sequelize.models[modelName];

      if (!Model) {
        throw new Error(`Modele ${modelName} non trouve`);
      }

      return Model.findByPk(this.article_id);
    }

    return null;
  };

  /**
   * Calcule la valeur d'un exemplaire
   * Priorite: exemplaire.prix_achat > article.prix_indicatif > 0
   *
   * @param {string} typeExemplaire - 'jeu', 'livre', 'film' ou 'disque'
   * @param {number} exemplaireId - ID de l'exemplaire
   * @returns {number} Valeur calculee
   */
  ArticleSortie.calculerValeur = async function(typeExemplaire, exemplaireId) {
    const EXEMPLAIRE_MODELS = {
      jeu: { model: 'ExemplaireJeu', articleModel: 'Jeu', fk: 'jeu_id' },
      livre: { model: 'ExemplaireLivre', articleModel: 'Livre', fk: 'livre_id' },
      film: { model: 'ExemplaireFilm', articleModel: 'Film', fk: 'film_id' },
      disque: { model: 'ExemplaireDisque', articleModel: 'Disque', fk: 'disque_id' }
    };

    const config = EXEMPLAIRE_MODELS[typeExemplaire];
    if (!config) {
      throw new Error(`Type d'exemplaire inconnu: ${typeExemplaire}`);
    }

    const ExemplaireModel = sequelize.models[config.model];
    const ArticleModel = sequelize.models[config.articleModel];

    if (!ExemplaireModel || !ArticleModel) {
      throw new Error(`Modele ${config.model} ou ${config.articleModel} non trouve`);
    }

    const exemplaire = await ExemplaireModel.findByPk(exemplaireId, {
      include: [{ model: ArticleModel, as: typeExemplaire }]
    });

    if (!exemplaire) {
      throw new Error(`Exemplaire ${typeExemplaire} #${exemplaireId} non trouve`);
    }

    const article = exemplaire[typeExemplaire];

    // Priorite: exemplaire.prix_achat > article.prix_indicatif > 0
    return parseFloat(exemplaire.prix_achat) ||
           parseFloat(article?.prix_indicatif) || 0;
  };

  /**
   * Calcule la valeur d'un article (legacy, pour retrocompatibilite)
   * @deprecated Utiliser calculerValeur avec exemplaire
   */
  ArticleSortie.calculerValeurArticle = async function(typeArticle, articleId) {
    const modelName = typeArticle.charAt(0).toUpperCase() + typeArticle.slice(1);
    const Model = sequelize.models[modelName];

    if (!Model) {
      throw new Error(`Modele ${modelName} non trouve`);
    }

    const article = await Model.findByPk(articleId, {
      attributes: ['prix_achat', 'prix_indicatif']
    });

    if (!article) {
      throw new Error(`Article ${typeArticle} #${articleId} non trouve`);
    }

    return parseFloat(article.prix_achat) || parseFloat(article.prix_indicatif) || 0;
  };

  /**
   * Marque l'exemplaire comme sorti (V2)
   * Ou l'article si mode legacy
   */
  ArticleSortie.prototype.marquerSorti = async function(lotSortie) {
    // V2: Marquer l'exemplaire
    if (this.type_exemplaire && this.exemplaire_id) {
      const exemplaire = await this.getExemplaire();
      if (!exemplaire) return;

      // Sauvegarder le statut precedent pour restauration
      this.statut_precedent = exemplaire.statut;
      this.etat_avant_sortie = exemplaire.etat;
      await this.save();

      // Mettre a jour l'exemplaire
      exemplaire.statut = 'sorti';
      await exemplaire.save();
      return;
    }

    // Legacy: Marquer l'article
    const article = await this.getArticle();
    if (!article) return;

    this.statut_precedent = article.statut;
    this.etat_avant_sortie = article.etat;
    await this.save();

    article.statut = 'sorti';
    article.lot_sortie_id = lotSortie.id;
    article.date_sortie = lotSortie.date_sortie;
    await article.save();
  };

  /**
   * Alias pour retrocompatibilite
   * @deprecated Utiliser marquerSorti
   */
  ArticleSortie.prototype.marquerArticleSorti = async function(lotSortie) {
    return this.marquerSorti(lotSortie);
  };

  /**
   * Reintegre l'exemplaire/article dans le stock
   */
  ArticleSortie.prototype.reintegrer = async function(userId = null) {
    // V2: Reintegrer l'exemplaire
    if (this.type_exemplaire && this.exemplaire_id) {
      const exemplaire = await this.getExemplaire();
      if (!exemplaire) {
        throw new Error('Exemplaire non trouve');
      }

      // Restaurer le statut precedent
      exemplaire.statut = this.statut_precedent || 'disponible';
      await exemplaire.save();
    } else {
      // Legacy: Reintegrer l'article
      const article = await this.getArticle();
      if (!article) {
        throw new Error('Article non trouve');
      }

      article.statut = this.statut_precedent || 'disponible';
      article.lot_sortie_id = null;
      article.date_sortie = null;
      await article.save();
    }

    // Marquer comme annule
    this.annule = true;
    this.date_annulation = new Date();
    this.annule_par = userId;
    await this.save();

    // Recalculer les totaux du lot
    const LotSortie = sequelize.models.LotSortie;
    const lot = await LotSortie.findByPk(this.lot_sortie_id);
    if (lot) {
      await lot.recalculerTotaux();
    }

    return this;
  };

  return ArticleSortie;
};
