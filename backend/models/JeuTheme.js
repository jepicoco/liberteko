const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JeuTheme = sequelize.define('JeuTheme', {
    jeu_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    theme_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'themes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'jeu_themes',
    timestamps: false
  });

  return JeuTheme;
};
