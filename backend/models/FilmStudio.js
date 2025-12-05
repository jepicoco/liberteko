const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmStudio = sequelize.define('FilmStudio', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    studio_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'studios',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'film_studios',
    timestamps: false
  });

  return FilmStudio;
};
