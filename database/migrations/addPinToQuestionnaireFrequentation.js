/**
 * Migration: Ajouter le champ code_pin aux questionnaires_frequentation
 * Permet de proteger l'acces aux fonctions admin sur les tablettes de comptage
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la colonne existe deja
  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (!tableInfo.code_pin) {
    await queryInterface.addColumn('questionnaires_frequentation', 'code_pin', {
      type: require('sequelize').DataTypes.STRING(4),
      allowNull: false,
      defaultValue: '0000',
      comment: 'Code PIN pour acces admin sur tablette (4 chiffres)'
    });
    console.log('Colonne code_pin ajoutee a questionnaires_frequentation');
  } else {
    console.log('Colonne code_pin existe deja');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (tableInfo.code_pin) {
    await queryInterface.removeColumn('questionnaires_frequentation', 'code_pin');
    console.log('Colonne code_pin supprimee de questionnaires_frequentation');
  }
}

// Auto-execution
if (require.main === module) {
  const command = process.argv[2];
  const run = command === 'down' ? down : up;
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { up, down };
