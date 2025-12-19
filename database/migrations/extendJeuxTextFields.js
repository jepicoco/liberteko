/**
 * Migration: Etendre les champs texte de la table jeux
 *
 * Les champs editeur, auteur et illustrateur peuvent contenir
 * de longues listes separees par virgules (imports MyLudo).
 * On les passe de VARCHAR(255) a TEXT.
 *
 * Usage: npm run migrate-jeux-text
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function migrate() {
  console.log('=== Migration: Extension des champs texte jeux ===\n');

  try {
    // Modifier les colonnes en TEXT
    const columnsToExtend = ['editeur', 'auteur', 'illustrateur'];

    for (const column of columnsToExtend) {
      console.log(`Modification de la colonne ${column}...`);
      await sequelize.query(`
        ALTER TABLE jeux MODIFY COLUMN ${column} TEXT
      `);
      console.log(`  - ${column} converti en TEXT`);
    }

    console.log('\n=== Migration terminee ===');

  } catch (error) {
    console.error('\nErreur lors de la migration:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

migrate()
  .then(() => {
    console.log('\nMigration executee avec succes');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nErreur:', err.message);
    process.exit(1);
  });
