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
    },
    role: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      defaultValue: 'auteur',
      comment: 'Role: auteur, scenariste, dessinateur, coloriste, illustrateur, traducteur, adaptateur, prefacier'
    }
  }, {
    tableName: 'livre_auteurs',
    timestamps: false
  });

  return LivreAuteur;
};
