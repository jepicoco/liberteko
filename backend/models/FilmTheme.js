const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmTheme = sequelize.define('FilmTheme', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    theme_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'themes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'film_themes',
    timestamps: false
  });

  return FilmTheme;
};
