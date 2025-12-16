/**
 * Migration: Add theme column to questionnaires_frequentation
 *
 * Ajoute la colonne theme pour permettre de personnaliser l'apparence
 * de la PWA tablette pour chaque questionnaire.
 *
 * Run: node database/migrations/addThemeToQuestionnaireFrequentation.js
 * Rollback: node database/migrations/addThemeToQuestionnaireFrequentation.js down
 */

async function up(connection) {
  console.log('=== Migration: Add theme to questionnaires_frequentation ===\n');

  // Verifier si la colonne existe deja
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'questionnaires_frequentation'
    AND COLUMN_NAME = 'theme'
  `);

  if (columns.length === 0) {
    await connection.query(`
      ALTER TABLE questionnaires_frequentation
      ADD COLUMN theme VARCHAR(50) NOT NULL DEFAULT 'default'
      COMMENT 'Theme CSS pour la tablette (default, theme-dark, etc.)'
      AFTER cree_par
    `);
    console.log('  + Column theme added to questionnaires_frequentation');
  } else {
    console.log('  - Column theme already exists, skipping...');
  }

  console.log('\n=== Migration completed successfully ===');
}

async function down(connection) {
  console.log('=== Rollback: Remove theme from questionnaires_frequentation ===\n');

  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'questionnaires_frequentation'
    AND COLUMN_NAME = 'theme'
  `);

  if (columns.length > 0) {
    await connection.query(`
      ALTER TABLE questionnaires_frequentation
      DROP COLUMN theme
    `);
    console.log('  - Column theme removed from questionnaires_frequentation');
  } else {
    console.log('  - Column theme does not exist, skipping...');
  }

  console.log('\n=== Rollback completed successfully ===');
}

module.exports = { up, down };
