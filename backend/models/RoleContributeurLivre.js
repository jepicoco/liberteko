const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoleContributeurLivre = sequelize.define('RoleContributeurLivre', {
    code: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    ordre: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'roles_contributeur_livre',
    timestamps: false
  });

  return RoleContributeurLivre;
};
