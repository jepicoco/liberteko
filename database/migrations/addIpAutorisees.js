const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Migration: Création de la table ip_autorisees ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    // Créer la table ip_autorisees
    console.log('Création de la table ip_autorisees...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ip_autorisees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adresse_ip VARCHAR(45) NOT NULL,
        source ENUM('admin', 'triforce') NOT NULL DEFAULT 'admin',
        commentaire VARCHAR(255) NULL,
        date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actif TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY unique_ip (adresse_ip)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table ip_autorisees créée avec succès.');

    // Ajouter les colonnes dans parametres_front si elles n'existent pas
    console.log('\nVérification des colonnes dans parametres_front...');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'parametres_front'
    `, [process.env.DB_NAME]);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('autoriser_ip_locales')) {
      console.log('Ajout de la colonne autoriser_ip_locales...');
      await connection.execute(`
        ALTER TABLE parametres_front
        ADD COLUMN autoriser_ip_locales TINYINT(1) NOT NULL DEFAULT 1
      `);
      console.log('Colonne autoriser_ip_locales ajoutée.');
    } else {
      console.log('Colonne autoriser_ip_locales existe déjà.');
    }

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
