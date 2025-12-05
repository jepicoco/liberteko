const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DisqueArtiste = sequelize.define('DisqueArtiste', {
    disque_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'disques',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    artiste_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'artistes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Role: principal, featuring, producteur, etc.'
    }
  }, {
    tableName: 'disque_artistes',
    timestamps: false
  });

  return DisqueArtiste;
};
