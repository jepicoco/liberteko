const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RegroupementAnalytiqueDetail = sequelize.define('RegroupementAnalytiqueDetail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    regroupement_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'regroupements_analytiques',
        key: 'id'
      },
      comment: 'Reference au regroupement parent'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      comment: 'Reference a la section analytique'
    },
    pourcentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0.01,
        max: 100
      },
      comment: 'Pourcentage de ventilation (0.01 a 100)'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans le regroupement'
    }
  }, {
    tableName: 'regroupements_analytiques_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['regroupement_id', 'section_analytique_id'],
        name: 'idx_regroupement_section_unique'
      }
    ]
  });

  return RegroupementAnalytiqueDetail;
};
