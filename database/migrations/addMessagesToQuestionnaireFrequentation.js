/**
 * Migration: Ajouter les champs message_actif et message_inactif
 * aux questionnaires de frequentation
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si les colonnes existent deja
  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (!tableInfo.message_actif) {
    await queryInterface.addColumn('questionnaires_frequentation', 'message_actif', {
      type: require('sequelize').DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Message affiche au-dessus du formulaire quand actif'
    });
    console.log('Colonne message_actif ajoutee a questionnaires_frequentation');
  } else {
    console.log('Colonne message_actif existe deja');
  }

  if (!tableInfo.message_inactif) {
    await queryInterface.addColumn('questionnaires_frequentation', 'message_inactif', {
      type: require('sequelize').DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Message affiche quand le formulaire est inactif (remplace le formulaire)'
    });
    console.log('Colonne message_inactif ajoutee a questionnaires_frequentation');
  } else {
    console.log('Colonne message_inactif existe deja');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (tableInfo.message_actif) {
    await queryInterface.removeColumn('questionnaires_frequentation', 'message_actif');
    console.log('Colonne message_actif supprimee de questionnaires_frequentation');
  }

  if (tableInfo.message_inactif) {
    await queryInterface.removeColumn('questionnaires_frequentation', 'message_inactif');
    console.log('Colonne message_inactif supprimee de questionnaires_frequentation');
  }
}

module.exports = { up, down };
