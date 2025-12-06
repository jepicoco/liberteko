/**
 * Migration: Creation de la table prolongations
 *
 * Usage: node database/migrations/createProlongationsTable.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Migration: Creation de la table prolongations ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    // Verifier si la table existe deja
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'prolongations'
    `, [process.env.DB_NAME]);

    if (tables.length > 0) {
      console.log('La table prolongations existe deja.');
    } else {
      console.log('Creation de la table prolongations...');
      await connection.execute(`
        CREATE TABLE prolongations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          emprunt_id INT NOT NULL,
          adherent_id INT NOT NULL,

          -- Type de prolongation
          type ENUM('automatique', 'manuelle') NOT NULL DEFAULT 'automatique'
            COMMENT 'Prolongation auto ou demande manuelle',

          -- Statut de la demande
          statut ENUM('en_attente', 'validee', 'refusee') NOT NULL DEFAULT 'en_attente'
            COMMENT 'Statut de la prolongation',

          -- Dates
          date_demande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            COMMENT 'Date de la demande',
          date_traitement DATETIME NULL
            COMMENT 'Date de validation/refus',

          -- Anciennes et nouvelles dates
          ancienne_date_retour DATE NOT NULL
            COMMENT 'Date de retour avant prolongation',
          nouvelle_date_retour DATE NOT NULL
            COMMENT 'Nouvelle date de retour apres prolongation',
          jours_ajoutes INT NOT NULL
            COMMENT 'Nombre de jours ajoutes',

          -- Reservation en attente
          reservation_en_attente TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'Un autre adherent attend cet article',
          message_reservation_affiche TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'Le message de reservation a ete affiche',

          -- Traitement admin
          traite_par INT NULL
            COMMENT 'ID admin qui a traite (si manuelle)',
          commentaire_admin TEXT NULL
            COMMENT 'Commentaire admin',

          -- Timestamps
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          -- Foreign keys
          CONSTRAINT fk_prolongation_emprunt
            FOREIGN KEY (emprunt_id) REFERENCES emprunts(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_prolongation_adherent
            FOREIGN KEY (adherent_id) REFERENCES adherents(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_prolongation_admin
            FOREIGN KEY (traite_par) REFERENCES adherents(id)
            ON DELETE SET NULL ON UPDATE CASCADE,

          -- Indexes
          INDEX idx_prolongation_emprunt (emprunt_id),
          INDEX idx_prolongation_adherent (adherent_id),
          INDEX idx_prolongation_statut (statut),
          INDEX idx_prolongation_date_demande (date_demande)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Table prolongations creee avec succes.');
    }

    // Ajouter le champ nb_prolongations dans emprunts
    console.log('\n--- Ajout du compteur de prolongations dans emprunts ---');

    const [empruntColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'emprunts'
    `, [process.env.DB_NAME]);

    const existingColumns = empruntColumns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('nb_prolongations')) {
      console.log('Ajout de nb_prolongations...');
      await connection.execute(`
        ALTER TABLE emprunts
        ADD COLUMN nb_prolongations INT NOT NULL DEFAULT 0
        COMMENT 'Nombre de prolongations effectuees'
      `);
    } else {
      console.log('nb_prolongations existe deja.');
    }

    if (!existingColumns.includes('date_retour_initiale')) {
      console.log('Ajout de date_retour_initiale...');
      await connection.execute(`
        ALTER TABLE emprunts
        ADD COLUMN date_retour_initiale DATE NULL
        COMMENT 'Date de retour initiale avant prolongations'
      `);
      // Copier les dates actuelles comme initiales pour les emprunts existants
      await connection.execute(`
        UPDATE emprunts SET date_retour_initiale = date_retour_prevue
        WHERE date_retour_initiale IS NULL
      `);
    } else {
      console.log('date_retour_initiale existe deja.');
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
