const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GenreMusical = sequelize.define('GenreMusical', {
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
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur hexadecimale pour affichage'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'genres_musicaux',
    timestamps: false
  });

  return GenreMusical;
};
