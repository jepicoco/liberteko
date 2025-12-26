/**
 * StructureConnecteurCategorie Model
 * Override connecteur email/SMS par categorie d'evenements pour une structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StructureConnecteurCategorie = sequelize.define('StructureConnecteurCategorie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Structure concernee'
      // FK gérée par migration 20241221_addStructureConnecteurs
    },
    categorie: {
      type: DataTypes.ENUM('adherent', 'emprunt', 'cotisation', 'systeme', 'reservation'),
      allowNull: false,
      comment: 'Categorie d\'evenements'
    },
    configuration_email_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Connecteur email pour cette categorie (null = utiliser defaut structure)'
      // FK gérée par migration
    },
    configuration_sms_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Connecteur SMS pour cette categorie (null = utiliser defaut structure)'
      // FK gérée par migration
    }
  }, {
    tableName: 'structure_connecteurs_categories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['structure_id', 'categorie'],
        name: 'idx_structure_categorie_unique'
      }
    ]
  });

  // Constantes pour les categories
  StructureConnecteurCategorie.CATEGORIES = ['adherent', 'emprunt', 'cotisation', 'systeme', 'reservation'];

  // Labels pour affichage
  StructureConnecteurCategorie.CATEGORIE_LABELS = {
    adherent: 'Adherents',
    emprunt: 'Emprunts',
    cotisation: 'Cotisations',
    systeme: 'Systeme',
    reservation: 'Reservations'
  };

  return StructureConnecteurCategorie;
};
