/**
 * Modele LotSortie
 * Regroupement d'articles pour sortie de stock (desherbage)
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const LotSortie = sequelize.define('LotSortie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      comment: 'Numero unique du lot (LOT-2025-0001)'
    },
    type_sortie_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Type de sortie (rebus, don, vente)'
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure concernee'
    },
    date_sortie: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de sortie effective'
    },
    destination: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Beneficiaire, acheteur, lieu de depot'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Commentaires internes'
    },
    valeur_totale: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Somme des valeurs des articles'
    },
    nb_articles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre d articles dans le lot'
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'valide', 'exporte', 'annule'),
      allowNull: false,
      defaultValue: 'brouillon',
      comment: 'Statut du lot'
    },
    date_export_comptable: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d export vers la comptabilite'
    },
    numero_piece_comptable: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numero de piece comptable generee'
    },
    cree_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Utilisateur ayant cree le lot'
    },
    valide_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Utilisateur ayant valide le lot'
    },
    date_validation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de validation'
    }
  }, {
    tableName: 'lots_sortie',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['numero'], unique: true },
      { fields: ['statut'] },
      { fields: ['date_sortie'] },
      { fields: ['structure_id'] },
      { fields: ['type_sortie_id'] }
    ]
  });

  // Associations
  LotSortie.associate = function(models) {
    LotSortie.belongsTo(models.TypeSortie, {
      foreignKey: 'type_sortie_id',
      as: 'typeSortie'
    });

    LotSortie.hasMany(models.ArticleSortie, {
      foreignKey: 'lot_sortie_id',
      as: 'articles'
    });

    if (models.Structure) {
      LotSortie.belongsTo(models.Structure, {
        foreignKey: 'structure_id',
        as: 'structure'
      });
    }

    if (models.Utilisateur) {
      LotSortie.belongsTo(models.Utilisateur, {
        foreignKey: 'cree_par',
        as: 'createur'
      });

      LotSortie.belongsTo(models.Utilisateur, {
        foreignKey: 'valide_par',
        as: 'validateur'
      });
    }
  };

  // Methodes de classe

  /**
   * Genere le prochain numero de lot
   */
  LotSortie.genererNumero = async function(annee = null) {
    const year = annee || new Date().getFullYear();
    const prefix = `LOT-${year}-`;

    // Trouver le dernier numero de l'annee
    const dernierLot = await this.findOne({
      where: {
        numero: { [Op.like]: `${prefix}%` }
      },
      order: [['numero', 'DESC']]
    });

    let sequence = 1;
    if (dernierLot) {
      const match = dernierLot.numero.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  };

  /**
   * Recalcule les totaux du lot
   */
  LotSortie.prototype.recalculerTotaux = async function() {
    const ArticleSortie = sequelize.models.ArticleSortie;

    const result = await ArticleSortie.findOne({
      where: {
        lot_sortie_id: this.id,
        annule: false
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb'],
        [sequelize.fn('SUM', sequelize.col('valeur')), 'total']
      ],
      raw: true
    });

    this.nb_articles = parseInt(result.nb, 10) || 0;
    this.valeur_totale = parseFloat(result.total) || 0;

    await this.save();
    return this;
  };

  /**
   * Verifie si le lot peut etre modifie
   */
  LotSortie.prototype.estModifiable = function() {
    return this.statut === 'brouillon';
  };

  /**
   * Verifie si le lot peut etre valide
   */
  LotSortie.prototype.peutEtreValide = function() {
    return this.statut === 'brouillon' && this.nb_articles > 0;
  };

  /**
   * Verifie si le lot peut etre exporte
   */
  LotSortie.prototype.peutEtreExporte = function() {
    return this.statut === 'valide';
  };

  return LotSortie;
};
