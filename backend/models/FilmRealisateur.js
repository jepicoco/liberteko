const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmRealisateur = sequelize.define('FilmRealisateur', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    realisateur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'realisateurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'film_realisateurs',
    timestamps: false
  });

  return FilmRealisateur;
};
