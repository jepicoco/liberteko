const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuEditeur = sequelize.define('JeuEditeur', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    editeur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'editeurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'jeu_editeurs',
    timestamps: false
  });

  return JeuEditeur;
};
