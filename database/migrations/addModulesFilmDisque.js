/**
 * Migration: Ajout des modules filmotheque et discotheque
 *
 * Usage: node database/migrations/addModulesFilmDisque.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Migration: Ajout des modules filmotheque et discotheque ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    // Verifier les colonnes existantes
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parametres_front'
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    // Ajouter module_filmotheque si n'existe pas
    if (!existingColumns.includes('module_filmotheque')) {
      console.log('Ajout de la colonne module_filmotheque...');
      await connection.execute(`
        ALTER TABLE parametres_front
        ADD COLUMN module_filmotheque TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Module films actif'
      `);
      console.log('Colonne module_filmotheque ajoutee.');
    } else {
      console.log('Colonne module_filmotheque existe deja.');
    }

    // Ajouter module_discotheque si n'existe pas
    if (!existingColumns.includes('module_discotheque')) {
      console.log('Ajout de la colonne module_discotheque...');
      await connection.execute(`
        ALTER TABLE parametres_front
        ADD COLUMN module_discotheque TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Module disques/musique actif'
      `);
      console.log('Colonne module_discotheque ajoutee.');
    } else {
      console.log('Colonne module_discotheque existe deja.');
    }

    console.log('\n=== Migration terminee avec succes ! ===');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
