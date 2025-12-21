/**
 * Modele UtilisateurTag
 * Table de jonction many-to-many entre Utilisateur et TagUtilisateur
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UtilisateurTag = sequelize.define('UtilisateurTag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    tag_utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tags_utilisateur',
        key: 'id'
      }
    },
    date_attribution: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'utilisateur_tags',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['utilisateur_id', 'tag_utilisateur_id'],
        name: 'idx_utilisateur_tag_unique'
      }
    ]
  });

  return UtilisateurTag;
};
