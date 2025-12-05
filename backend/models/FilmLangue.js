const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmLangue = sequelize.define('FilmLangue', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    langue_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'langues',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'film_langues',
    timestamps: false,
    comment: 'Langues audio disponibles'
  });

  return FilmLangue;
};
