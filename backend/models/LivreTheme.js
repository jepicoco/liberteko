const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LivreTheme = sequelize.define('LivreTheme', {
    livre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'livres',
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
    tableName: 'livre_themes',
    timestamps: false
  });

  return LivreTheme;
};
