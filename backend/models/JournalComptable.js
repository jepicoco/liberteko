const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JournalComptable = sequelize.define('JournalComptable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Code du journal (ex: VT, AC, BQ, CA, OD)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle du journal'
    },
    type: {
      type: DataTypes.ENUM('ventes', 'achats', 'banque', 'caisse', 'operations_diverses', 'a_nouveaux'),
      allowNull: false,
      comment: 'Type de journal'
    },
    compte_contrepartie: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte de contrepartie par defaut (ex: 5121 pour banque)'
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
    tableName: 'journaux_comptables',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  JournalComptable.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  JournalComptable.getByCode = async function(code) {
    return await this.findOne({
      where: { code: code.toUpperCase() }
    });
  };

  JournalComptable.getByType = async function(type) {
    return await this.findAll({
      where: { type, actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  return JournalComptable;
};
