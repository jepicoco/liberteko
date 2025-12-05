const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuCategorie = sequelize.define('JeuCategorie', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    categorie_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'jeu_categories',
    timestamps: false
  });

  return JeuCategorie;
};
