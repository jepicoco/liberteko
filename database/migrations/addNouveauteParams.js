/**
 * Migration: Add novelty parameters to parametres_front
 *
 * Run: node database/migrations/addNouveauteParams.js up
 * Rollback: node database/migrations/addNouveauteParams.js down
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ludotheque',
  port: process.env.DB_PORT || 3306
};

const columnsToAdd = [
  { name: 'nouveaute_duree_ludotheque', type: 'INT DEFAULT 60', comment: 'Duree nouveaute jeux (jours)' },
  { name: 'nouveaute_duree_bibliotheque', type: 'INT DEFAULT 30', comment: 'Duree nouveaute livres (jours)' },
  { name: 'nouveaute_duree_filmotheque', type: 'INT DEFAULT 45', comment: 'Duree nouveaute films (jours)' },
  { name: 'nouveaute_duree_discotheque', type: 'INT DEFAULT 10', comment: 'Duree nouveaute disques (jours)' },
  { name: 'nouveaute_active_ludotheque', type: 'BOOLEAN DEFAULT TRUE', comment: 'Activer nouveautes jeux' },
  { name: 'nouveaute_active_bibliotheque', type: 'BOOLEAN DEFAULT TRUE', comment: 'Activer nouveautes livres' },
  { name: 'nouveaute_active_filmotheque', type: 'BOOLEAN DEFAULT TRUE', comment: 'Activer nouveautes films' },
  { name: 'nouveaute_active_discotheque', type: 'BOOLEAN DEFAULT TRUE', comment: 'Activer nouveautes disques' }
];

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Migration: Add Nouveaute Params ===\n');

    // Check if table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'parametres_front'");
    if (tables.length === 0) {
      console.log('Table parametres_front does not exist. Run base migrations first.');
      return;
    }

    // Get existing columns
    const [existingColumns] = await connection.query('SHOW COLUMNS FROM parametres_front');
    const existingNames = existingColumns.map(c => c.Field);

    let addedCount = 0;

    for (const col of columnsToAdd) {
      if (existingNames.includes(col.name)) {
        console.log(`  - ${col.name} already exists, skipping`);
        continue;
      }

      await connection.query(`
        ALTER TABLE parametres_front
        ADD COLUMN ${col.name} ${col.type} COMMENT '${col.comment}'
      `);
      console.log(`  + Added ${col.name}`);
      addedCount++;
    }

    console.log(`\n${addedCount} column(s) added successfully.`);

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Rollback: Remove Nouveaute Params ===\n');

    // Get existing columns
    const [existingColumns] = await connection.query('SHOW COLUMNS FROM parametres_front');
    const existingNames = existingColumns.map(c => c.Field);

    let removedCount = 0;

    for (const col of columnsToAdd) {
      if (!existingNames.includes(col.name)) {
        console.log(`  - ${col.name} does not exist, skipping`);
        continue;
      }

      await connection.query(`ALTER TABLE parametres_front DROP COLUMN ${col.name}`);
      console.log(`  - Removed ${col.name}`);
      removedCount++;
    }

    console.log(`\n${removedCount} column(s) removed.`);

  } catch (error) {
    console.error('Rollback error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// CLI
const command = process.argv[2];

if (command === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node addNouveauteParams.js [up|down]');
  process.exit(1);
}
