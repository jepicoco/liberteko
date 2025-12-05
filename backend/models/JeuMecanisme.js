const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuMecanisme = sequelize.define('JeuMecanisme', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    mecanisme_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'mecanismes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'jeu_mecanismes',
    timestamps: false
  });

  return JeuMecanisme;
};
