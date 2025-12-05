const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Langue = sequelize.define('Langue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Code ISO (fr, en, de, etc.)'
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'langues',
    timestamps: false
  });

  return Langue;
};
