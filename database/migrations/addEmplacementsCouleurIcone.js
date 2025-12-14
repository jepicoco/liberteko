/**
 * Migration: Ajouter couleur et icone aux tables emplacements
 * Ajoute les champs couleur, icone, et complete les champs manquants de emplacements_disques
 *
 * Run: node database/migrations/addEmplacementsCouleurIcone.js up
 * Rollback: node database/migrations/addEmplacementsCouleurIcone.js down
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

  console.log('Adding couleur and icone fields to emplacements tables...');

  // Tables a modifier
  const tables = [
    'emplacements_jeux',
    'emplacements_livres',
    'emplacements_films',
    'emplacements_disques'
  ];

  try {
    for (const table of tables) {
      // Verifier si la table existe
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);

      if (rows.length === 0) {
        console.log(`  Table ${table} n'existe pas, creation...`);
        await connection.query(`
          CREATE TABLE ${table} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(20) NULL,
            libelle VARCHAR(100) NOT NULL,
            description TEXT NULL,
            site_id INT NULL,
            couleur VARCHAR(7) DEFAULT '#6c757d',
            icone VARCHAR(50) DEFAULT 'geo-alt',
            actif TINYINT(1) DEFAULT 1,
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log(`  Table ${table} creee`);
        continue;
      }

      // Verifier et ajouter les colonnes manquantes
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const columnNames = columns.map(c => c.Field);

      if (!columnNames.includes('couleur')) {
        console.log(`  Adding couleur to ${table}...`);
        await connection.query(`ALTER TABLE ${table} ADD COLUMN couleur VARCHAR(7) DEFAULT '#6c757d'`);
      }

      if (!columnNames.includes('icone')) {
        console.log(`  Adding icone to ${table}...`);
        await connection.query(`ALTER TABLE ${table} ADD COLUMN icone VARCHAR(50) DEFAULT 'geo-alt'`);
      }

      // Pour emplacements_disques, ajouter les champs manquants
      if (table === 'emplacements_disques') {
        if (!columnNames.includes('code')) {
          console.log(`  Adding code to ${table}...`);
          await connection.query(`ALTER TABLE ${table} ADD COLUMN code VARCHAR(20) NULL`);
        }
        if (!columnNames.includes('site_id')) {
          console.log(`  Adding site_id to ${table}...`);
          await connection.query(`ALTER TABLE ${table} ADD COLUMN site_id INT NULL`);
          // Ajouter la foreign key
          try {
            await connection.query(`ALTER TABLE ${table} ADD FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL`);
          } catch (e) {
            // FK peut deja exister
          }
        }
      }
    }

    console.log('Migration completed successfully!');
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  console.log('Removing couleur and icone fields from emplacements tables...');

  const tables = [
    'emplacements_jeux',
    'emplacements_livres',
    'emplacements_films',
    'emplacements_disques'
  ];

  try {
    for (const table of tables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (rows.length === 0) continue;

      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const columnNames = columns.map(c => c.Field);

      if (columnNames.includes('couleur')) {
        await connection.query(`ALTER TABLE ${table} DROP COLUMN couleur`);
      }
      if (columnNames.includes('icone')) {
        await connection.query(`ALTER TABLE ${table} DROP COLUMN icone`);
      }
    }

    console.log('Rollback completed!');
  } finally {
    await connection.end();
  }
}

// Execute si lance directement
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      if (command === 'down') {
        await down();
      } else {
        await up();
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
