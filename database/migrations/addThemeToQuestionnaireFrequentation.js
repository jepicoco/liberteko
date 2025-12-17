/**
 * Migration: Add theme column to questionnaires_frequentation
 *
 * Ajoute la colonne theme pour permettre de personnaliser l'apparence
 * de la PWA tablette pour chaque questionnaire.
 *
 * Run: node database/migrations/addThemeToQuestionnaireFrequentation.js
 * Rollback: node database/migrations/addThemeToQuestionnaireFrequentation.js down
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Add theme to questionnaires_frequentation ===\n');

  // Verifier si la colonne existe deja
  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (!tableInfo.theme) {
    await queryInterface.addColumn('questionnaires_frequentation', 'theme', {
      type: require('sequelize').DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'default',
      comment: 'Theme CSS pour la tablette (default, theme-dark, etc.)'
    });
    console.log('  + Column theme added to questionnaires_frequentation');
  } else {
    console.log('  - Column theme already exists, skipping...');
  }

  console.log('\n=== Migration completed successfully ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback: Remove theme from questionnaires_frequentation ===\n');

  const tableInfo = await queryInterface.describeTable('questionnaires_frequentation');

  if (tableInfo.theme) {
    await queryInterface.removeColumn('questionnaires_frequentation', 'theme');
    console.log('  - Column theme removed from questionnaires_frequentation');
  } else {
    console.log('  - Column theme does not exist, skipping...');
  }

  console.log('\n=== Rollback completed successfully ===');
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
