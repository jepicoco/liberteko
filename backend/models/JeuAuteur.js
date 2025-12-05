const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuAuteur = sequelize.define('JeuAuteur', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    auteur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'auteurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'jeu_auteurs',
    timestamps: false
  });

  return JeuAuteur;
};
