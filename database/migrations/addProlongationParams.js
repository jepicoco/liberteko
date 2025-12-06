/**
 * Migration: Ajout des parametres de prolongation par module
 * et des champs pour reset password adherent
 *
 * Usage: node database/migrations/addProlongationParams.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Migration: Parametres de prolongation et reset password ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    // ============================================
    // 1. Parametres de prolongation dans parametres_front
    // ============================================
    console.log('--- Ajout des parametres de prolongation ---\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'parametres_front'
    `, [process.env.DB_NAME]);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    const prolongationColumns = [
      // Ludotheque
      { name: 'prolongation_jours_ludotheque', type: 'INT NOT NULL DEFAULT 14', comment: 'Jours par prolongation (jeux)' },
      { name: 'prolongation_auto_max_ludotheque', type: 'INT NOT NULL DEFAULT 1', comment: 'Nb prolongations auto max (jeux)' },
      { name: 'prolongation_manuelle_ludotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Autoriser demande manuelle apres auto (jeux)' },
      { name: 'prolongation_msg_reservation_ludotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Afficher message si reserve (jeux)' },

      // Bibliotheque
      { name: 'prolongation_jours_bibliotheque', type: 'INT NOT NULL DEFAULT 14', comment: 'Jours par prolongation (livres)' },
      { name: 'prolongation_auto_max_bibliotheque', type: 'INT NOT NULL DEFAULT 1', comment: 'Nb prolongations auto max (livres)' },
      { name: 'prolongation_manuelle_bibliotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Autoriser demande manuelle apres auto (livres)' },
      { name: 'prolongation_msg_reservation_bibliotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Afficher message si reserve (livres)' },

      // Filmotheque
      { name: 'prolongation_jours_filmotheque', type: 'INT NOT NULL DEFAULT 7', comment: 'Jours par prolongation (films)' },
      { name: 'prolongation_auto_max_filmotheque', type: 'INT NOT NULL DEFAULT 1', comment: 'Nb prolongations auto max (films)' },
      { name: 'prolongation_manuelle_filmotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Autoriser demande manuelle apres auto (films)' },
      { name: 'prolongation_msg_reservation_filmotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Afficher message si reserve (films)' },

      // Discotheque
      { name: 'prolongation_jours_discotheque', type: 'INT NOT NULL DEFAULT 7', comment: 'Jours par prolongation (disques)' },
      { name: 'prolongation_auto_max_discotheque', type: 'INT NOT NULL DEFAULT 1', comment: 'Nb prolongations auto max (disques)' },
      { name: 'prolongation_manuelle_discotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Autoriser demande manuelle apres auto (disques)' },
      { name: 'prolongation_msg_reservation_discotheque', type: 'TINYINT(1) NOT NULL DEFAULT 1', comment: 'Afficher message si reserve (disques)' }
    ];

    for (const col of prolongationColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Ajout de ${col.name}...`);
        await connection.execute(`
          ALTER TABLE parametres_front
          ADD COLUMN ${col.name} ${col.type}
          COMMENT '${col.comment}'
        `);
      } else {
        console.log(`${col.name} existe deja.`);
      }
    }

    // ============================================
    // 2. Champs reset password dans adherents
    // ============================================
    console.log('\n--- Ajout des champs reset password ---\n');

    const [adherentColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'adherents'
    `, [process.env.DB_NAME]);

    const existingAdherentColumns = adherentColumns.map(c => c.COLUMN_NAME);

    const resetColumns = [
      { name: 'password_reset_token', type: 'VARCHAR(255) NULL', comment: 'Token de reinitialisation de mot de passe' },
      { name: 'password_reset_expires', type: 'DATETIME NULL', comment: 'Date expiration du token reset' },
      { name: 'password_created', type: 'TINYINT(1) NOT NULL DEFAULT 0', comment: 'Mot de passe deja cree par usager' }
    ];

    for (const col of resetColumns) {
      if (!existingAdherentColumns.includes(col.name)) {
        console.log(`Ajout de ${col.name}...`);
        await connection.execute(`
          ALTER TABLE adherents
          ADD COLUMN ${col.name} ${col.type}
          COMMENT '${col.comment}'
        `);
      } else {
        console.log(`${col.name} existe deja.`);
      }
    }

    // Ajouter un index sur le token
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM adherents WHERE Key_name = 'idx_password_reset_token'
    `);

    if (indexes.length === 0) {
      console.log('Creation de l\'index sur password_reset_token...');
      await connection.execute(`
        CREATE INDEX idx_password_reset_token ON adherents(password_reset_token)
      `);
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
