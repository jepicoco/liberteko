/**
 * Migration: Add loan limits system
 *
 * Run: node database/migrations/addLimitesEmprunt.js up
 * Rollback: node database/migrations/addLimitesEmprunt.js down
 *
 * This migration:
 * 1. Adds loan limit fields to parametres_front table (general + novelty limits per module)
 * 2. Creates limites_emprunt_genre table for per-genre limits
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

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Migration: Add Loan Limits System ===\n');

    // 1. Add limit fields to parametres_front for each module
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    for (const mod of modules) {
      // Check if columns already exist
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM parametres_front LIKE 'limite_emprunt_${mod}'`
      );

      if (columns.length === 0) {
        console.log(`Adding limit columns for ${mod}...`);

        await connection.query(`
          ALTER TABLE parametres_front
          ADD COLUMN limite_emprunt_${mod} INT DEFAULT 5 COMMENT 'Limite generale emprunts ${mod}',
          ADD COLUMN limite_emprunt_nouveaute_${mod} INT DEFAULT 1 COMMENT 'Limite emprunts nouveautes ${mod}',
          ADD COLUMN limite_emprunt_bloquante_${mod} BOOLEAN DEFAULT TRUE COMMENT 'Limite bloquante ${mod}'
        `);

        console.log(`  + limite_emprunt_${mod}`);
        console.log(`  + limite_emprunt_nouveaute_${mod}`);
        console.log(`  + limite_emprunt_bloquante_${mod}`);
      } else {
        console.log(`Columns for ${mod} already exist, skipping...`);
      }
    }

    // 2. Create limites_emprunt_genre table
    const [tables] = await connection.query("SHOW TABLES LIKE 'limites_emprunt_genre'");

    if (tables.length === 0) {
      console.log('\nCreating limites_emprunt_genre table...');

      await connection.query(`
        CREATE TABLE limites_emprunt_genre (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module ENUM('ludotheque', 'bibliotheque', 'filmotheque', 'discotheque') NOT NULL,
          genre_id INT NOT NULL COMMENT 'ID du genre (selon le module)',
          genre_nom VARCHAR(100) NOT NULL COMMENT 'Nom du genre (cache pour affichage)',
          limite_max INT NOT NULL DEFAULT 3 COMMENT 'Limite max pour ce genre',
          actif BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_module_genre (module, genre_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Limites emprunts par genre et par module'
      `);

      console.log('  + Table limites_emprunt_genre created');
    } else {
      console.log('\nTable limites_emprunt_genre already exists, skipping...');
    }

    console.log('\n=== Migration completed successfully ===');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Rollback: Remove Loan Limits System ===\n');

    // 1. Drop columns from parametres_front
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    for (const mod of modules) {
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM parametres_front LIKE 'limite_emprunt_${mod}'`
      );

      if (columns.length > 0) {
        console.log(`Removing limit columns for ${mod}...`);

        await connection.query(`
          ALTER TABLE parametres_front
          DROP COLUMN limite_emprunt_${mod},
          DROP COLUMN limite_emprunt_nouveaute_${mod},
          DROP COLUMN limite_emprunt_bloquante_${mod}
        `);

        console.log(`  - Columns removed for ${mod}`);
      }
    }

    // 2. Drop limites_emprunt_genre table
    const [tables] = await connection.query("SHOW TABLES LIKE 'limites_emprunt_genre'");

    if (tables.length > 0) {
      console.log('\nDropping limites_emprunt_genre table...');
      await connection.query('DROP TABLE limites_emprunt_genre');
      console.log('  - Table dropped');
    }

    console.log('\n=== Rollback completed successfully ===');

  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute based on command line argument
const command = process.argv[2];

if (command === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node addLimitesEmprunt.js [up|down]');
  process.exit(1);
}
