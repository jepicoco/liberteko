const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LivreAuteur = sequelize.define('LivreAuteur', {
    livre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    auteur_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'auteurs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'livre_auteurs',
    timestamps: false
  });

  return LivreAuteur;
};
