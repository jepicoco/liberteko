const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametrageComptableOperation = sequelize.define('ParametrageComptableOperation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Type d'operation
    type_operation: {
      type: DataTypes.ENUM(
        'cotisation',           // Cotisations membres
        'location',             // Location d'articles
        'retard',               // Penalites de retard
        'amende',               // Amendes diverses
        'vente',                // Ventes diverses
        'don',                  // Dons recus
        'subvention',           // Subventions
        'animation',            // Animations/Ateliers
        'caution',              // Cautions recues
        'remboursement_caution' // Remboursement cautions
      ),
      allowNull: false,
      comment: 'Type d operation comptable'
    },
    // Libelle personnalise
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle de ce type d operation'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Journal par defaut
    journal_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'VT',
      comment: 'Code du journal par defaut'
    },
    // Compte de produit/charge par defaut
    compte_produit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Compte de produit (classe 7) ou charge (classe 6)'
    },
    compte_produit_libelle: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Libelle du compte de produit'
    },
    // Compte d'encaissement par defaut (peut etre surcharge par mode paiement)
    compte_encaissement_defaut: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte d encaissement par defaut'
    },
    // Compte TVA si applicable
    compte_tva: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte de TVA collectee (ex: 4457)'
    },
    // Taux TVA par defaut
    taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'taux_tva',
        key: 'id'
      },
      comment: 'Taux de TVA par defaut pour ce type d operation'
    },
    // Section analytique par defaut (une seule section)
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      comment: 'Section analytique unique par defaut'
    },
    // Regroupement analytique (ventilation multi-sections avec %)
    regroupement_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'regroupements_analytiques',
        key: 'id'
      },
      comment: 'Regroupement analytique pour ventilation multi-sections'
    },
    // Prefixe de piece comptable
    prefixe_piece: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'OP',
      comment: 'Prefixe pour numeros de piece (ex: COT, LOC, RET)'
    },
    // Options
    generer_ecritures_auto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Generer automatiquement les ecritures comptables'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'parametrage_comptable_operations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['type_operation']
      }
    ]
  });

  // Methodes statiques
  ParametrageComptableOperation.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      include: [
        { model: sequelize.models.TauxTVA, as: 'tauxTVA' },
        { model: sequelize.models.SectionAnalytique, as: 'sectionAnalytique' },
        {
          model: sequelize.models.RegroupementAnalytique,
          as: 'regroupementAnalytique',
          include: [{
            model: sequelize.models.RegroupementAnalytiqueDetail,
            as: 'details',
            include: [{ model: sequelize.models.SectionAnalytique, as: 'section' }]
          }]
        }
      ],
      order: [['ordre_affichage', 'ASC']]
    });
  };

  ParametrageComptableOperation.getByType = async function(type) {
    return await this.findOne({
      where: { type_operation: type, actif: true },
      include: [
        { model: sequelize.models.TauxTVA, as: 'tauxTVA' },
        { model: sequelize.models.SectionAnalytique, as: 'sectionAnalytique' },
        {
          model: sequelize.models.RegroupementAnalytique,
          as: 'regroupementAnalytique',
          include: [{
            model: sequelize.models.RegroupementAnalytiqueDetail,
            as: 'details',
            include: [{ model: sequelize.models.SectionAnalytique, as: 'section' }]
          }]
        }
      ]
    });
  };

  /**
   * Recupere le parametrage pour cotisations
   */
  ParametrageComptableOperation.getCotisation = async function() {
    return await this.getByType('cotisation');
  };

  /**
   * Recupere le parametrage pour locations
   */
  ParametrageComptableOperation.getLocation = async function() {
    return await this.getByType('location');
  };

  /**
   * Recupere le parametrage pour retards
   */
  ParametrageComptableOperation.getRetard = async function() {
    return await this.getByType('retard');
  };

  return ParametrageComptableOperation;
};
