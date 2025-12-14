/**
 * Migration: Add module_plan_interactif to parametres_front
 * Ajoute l'option d'affichage du plan interactif sur le site public
 *
 * Run: node database/migrations/addModulePlanInteractif.js up
 * Rollback: node database/migrations/addModulePlanInteractif.js down
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

  console.log('Adding module_plan_interactif to parametres_front...');

  try {
    // Verifier si la colonne existe
    const [columns] = await connection.query(`SHOW COLUMNS FROM parametres_front LIKE 'module_plan_interactif'`);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE parametres_front
        ADD COLUMN module_plan_interactif TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Plan interactif affiche sur le site public'
        AFTER module_recherche_ia
      `);
      console.log('  Column module_plan_interactif added');
    } else {
      console.log('  Column module_plan_interactif already exists');
    }

    console.log('Migration completed successfully!');
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  console.log('Removing module_plan_interactif from parametres_front...');

  try {
    const [columns] = await connection.query(`SHOW COLUMNS FROM parametres_front LIKE 'module_plan_interactif'`);

    if (columns.length > 0) {
      await connection.query(`ALTER TABLE parametres_front DROP COLUMN module_plan_interactif`);
      console.log('  Column module_plan_interactif removed');
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
