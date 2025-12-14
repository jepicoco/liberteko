const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompteComptable = sequelize.define('CompteComptable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Numero du compte (ex: 512, 5121, 706, 7061)'
    },
    libelle: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Libelle du compte'
    },
    classe: {
      type: DataTypes.ENUM('1', '2', '3', '4', '5', '6', '7', '8'),
      allowNull: false,
      comment: 'Classe comptable (1=Capitaux, 2=Immobilisations, 3=Stocks, 4=Tiers, 5=Financiers, 6=Charges, 7=Produits, 8=Speciaux)'
    },
    type: {
      type: DataTypes.ENUM('general', 'auxiliaire', 'analytique'),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Type de compte'
    },
    nature: {
      type: DataTypes.ENUM('actif', 'passif', 'charge', 'produit'),
      allowNull: true,
      comment: 'Nature du compte pour bilan/resultat'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comptes_comptables',
        key: 'id'
      },
      comment: 'Compte parent pour hierarchie'
    },
    accepte_saisie: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Compte utilisable pour saisie (false = compte de regroupement)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'comptes_comptables',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  CompteComptable.getActifs = async function() {
    return await this.findAll({
      where: { actif: true, accepte_saisie: true },
      order: [['numero', 'ASC']]
    });
  };

  CompteComptable.getByNumero = async function(numero) {
    return await this.findOne({
      where: { numero }
    });
  };

  CompteComptable.getByClasse = async function(classe) {
    return await this.findAll({
      where: { classe, actif: true },
      order: [['numero', 'ASC']]
    });
  };

  CompteComptable.getComptesEncaissement = async function() {
    // Comptes de classe 5 (financiers) utilisables pour encaissement
    return await this.findAll({
      where: {
        classe: '5',
        actif: true,
        accepte_saisie: true
      },
      order: [['numero', 'ASC']]
    });
  };

  CompteComptable.getComptesProduits = async function() {
    // Comptes de classe 7 (produits)
    return await this.findAll({
      where: {
        classe: '7',
        actif: true,
        accepte_saisie: true
      },
      order: [['numero', 'ASC']]
    });
  };

  CompteComptable.getArbre = async function() {
    const comptes = await this.findAll({
      where: { actif: true },
      order: [['numero', 'ASC']]
    });

    const map = {};
    const roots = [];

    comptes.forEach(c => {
      map[c.id] = { ...c.toJSON(), enfants: [] };
    });

    comptes.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].enfants.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    return roots;
  };

  return CompteComptable;
};
