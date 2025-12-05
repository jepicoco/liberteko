const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LivreEditeur = sequelize.define('LivreEditeur', {
    livre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    editeur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'editeurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'livre_editeurs',
    timestamps: false
  });

  return LivreEditeur;
};
