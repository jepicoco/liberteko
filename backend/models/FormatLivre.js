const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FormatLivre = sequelize.define('FormatLivre', {
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
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'formats_livres',
    timestamps: false
  });

  return FormatLivre;
};
