const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Realisateur = sequelize.define('Realisateur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nationalite: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'realisateurs',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nom', 'prenom']
      }
    ]
  });

  return Realisateur;
};
