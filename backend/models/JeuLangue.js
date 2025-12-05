const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuLangue = sequelize.define('JeuLangue', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
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
    tableName: 'jeu_langues',
    timestamps: false
  });

  return JeuLangue;
};
