const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LivreLangue = sequelize.define('LivreLangue', {
    livre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'livres',
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
    tableName: 'livre_langues',
    timestamps: false
  });

  return LivreLangue;
};
