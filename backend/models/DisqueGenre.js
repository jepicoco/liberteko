const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DisqueGenre = sequelize.define('DisqueGenre', {
    disque_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'disques',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    genre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'genres_musicaux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'disque_genres',
    timestamps: false
  });

  return DisqueGenre;
};
