const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GenreFilm = sequelize.define('GenreFilm', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'film'
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'genres_films',
    timestamps: false
  });

  return GenreFilm;
};
