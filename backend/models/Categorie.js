const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categorie = sequelize.define('Categorie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'tag',
      comment: 'Nom icone Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#0d6efd',
      comment: 'Couleur hex pour affichage'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'categories',
    timestamps: false
  });

  return Categorie;
};
