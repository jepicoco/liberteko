const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmGenre = sequelize.define('FilmGenre', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    genre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'genres_films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'film_genres',
    timestamps: false
  });

  return FilmGenre;
};
