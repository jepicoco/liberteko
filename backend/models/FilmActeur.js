const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FilmActeur = sequelize.define('FilmActeur', {
    film_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    acteur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'acteurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom du personnage joué'
    }
  }, {
    tableName: 'film_acteurs',
    timestamps: false
  });

  return FilmActeur;
};
