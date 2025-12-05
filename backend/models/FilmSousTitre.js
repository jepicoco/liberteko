const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmSousTitre = sequelize.define('FilmSousTitre', {
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
    tableName: 'film_sous_titres',
    timestamps: false,
    comment: 'Langues de sous-titres disponibles'
  });

  return FilmSousTitre;
};
