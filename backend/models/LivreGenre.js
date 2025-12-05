const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LivreGenre = sequelize.define('LivreGenre', {
    livre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    genre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'genres_litteraires',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'livre_genres',
    timestamps: false
  });

  return LivreGenre;
};
