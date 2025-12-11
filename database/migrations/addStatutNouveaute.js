/**
 * Migration: Add statut_nouveaute field to collection tables
 *
 * Run: node database/migrations/addStatutNouveaute.js up
 * Rollback: node database/migrations/addStatutNouveaute.js down
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

const tables = ['jeux', 'livres', 'films', 'disques'];
const columnDef = "statut_nouveaute ENUM('auto', 'force_nouveau', 'jamais_nouveau') DEFAULT 'auto' COMMENT 'Statut nouveaute: auto, force_nouveau, jamais_nouveau'";

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Migration: Add statut_nouveaute to collections ===\n');

    let addedCount = 0;

    for (const table of tables) {
      // Check if table exists
      const [tableExists] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (tableExists.length === 0) {
        console.log(`  - Table ${table} does not exist, skipping`);
        continue;
      }

      // Check if column already exists
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE 'statut_nouveaute'`);
      if (columns.length > 0) {
        console.log(`  - ${table}.statut_nouveaute already exists, skipping`);
        continue;
      }

      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
      console.log(`  + Added statut_nouveaute to ${table}`);
      addedCount++;
    }

    console.log(`\nColumn added to ${addedCount} table(s).`);

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
    console.log('=== Rollback: Remove statut_nouveaute from collections ===\n');

    let removedCount = 0;

    for (const table of tables) {
      // Check if table exists
      const [tableExists] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (tableExists.length === 0) {
        console.log(`  - Table ${table} does not exist, skipping`);
        continue;
      }

      // Check if column exists
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE 'statut_nouveaute'`);
      if (columns.length === 0) {
        console.log(`  - ${table}.statut_nouveaute does not exist, skipping`);
        continue;
      }

      await connection.query(`ALTER TABLE ${table} DROP COLUMN statut_nouveaute`);
      console.log(`  - Removed statut_nouveaute from ${table}`);
      removedCount++;
    }

    console.log(`\nColumn removed from ${removedCount} table(s).`);

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
  console.log('Usage: node addStatutNouveaute.js [up|down]');
  process.exit(1);
}
