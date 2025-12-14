const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RegroupementAnalytique = sequelize.define('RegroupementAnalytique', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code unique du regroupement (ex: RGRP_MULTI)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle descriptif (ex: Ventilation Ludo/Biblio 60/40)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description detaillee du regroupement'
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
    tableName: 'regroupements_analytiques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  RegroupementAnalytique.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']]
    });
  };

  return RegroupementAnalytique;
};
