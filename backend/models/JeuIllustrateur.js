const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuIllustrateur = sequelize.define('JeuIllustrateur', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      }
    },
    illustrateur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'illustrateurs',
        key: 'id'
      }
    }
  }, {
    tableName: 'jeu_illustrateurs',
    timestamps: false
  });

  return JeuIllustrateur;
};
