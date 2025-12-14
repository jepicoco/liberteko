/**
 * Migration: Ajouter les tables de gestion de caisse
 * - caisses: registres de caisse
 * - sessions_caisse: sessions d'ouverture/fermeture
 * - mouvements_caisse: entrées et sorties
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ludotheque',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Migration Caisse - Début...');

    // ================================================
    // Table: caisses
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS caisses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nom VARCHAR(100) NOT NULL COMMENT 'Nom de la caisse (ex: Caisse principale)',
        code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Code unique (ex: CAISSE_PRINC)',
        site_id INT NULL COMMENT 'Site associé à cette caisse',
        solde_actuel DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Solde actuel de la caisse',
        solde_initial DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Fond de caisse initial',
        compte_comptable VARCHAR(20) DEFAULT '5300' COMMENT 'Compte comptable associé (classe 53)',
        devise VARCHAR(3) NOT NULL DEFAULT 'EUR',
        description TEXT NULL,
        utilisateur_responsable_id INT NULL COMMENT 'Utilisateur responsable de la caisse',
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
        FOREIGN KEY (utilisateur_responsable_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table caisses créée');

    // ================================================
    // Table: sessions_caisse
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions_caisse (
        id INT PRIMARY KEY AUTO_INCREMENT,
        caisse_id INT NOT NULL,
        utilisateur_id INT NOT NULL COMMENT 'Utilisateur qui a ouvert la session',
        date_ouverture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_cloture DATETIME NULL,
        utilisateur_cloture_id INT NULL COMMENT 'Utilisateur qui a cloturé la session',
        solde_ouverture DECIMAL(10, 2) NOT NULL COMMENT 'Solde au moment de l''ouverture',
        solde_cloture_theorique DECIMAL(10, 2) NULL COMMENT 'Solde calculé automatiquement',
        solde_cloture_reel DECIMAL(10, 2) NULL COMMENT 'Solde compté par l''utilisateur',
        ecart DECIMAL(10, 2) NULL COMMENT 'Différence entre théorique et réel',
        nb_mouvements INT NOT NULL DEFAULT 0,
        total_entrees DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_sorties DECIMAL(10, 2) NOT NULL DEFAULT 0,
        detail_comptage JSON NULL COMMENT 'Comptage détaillé: {"especes": 150.00, "cheques": 200.00, ...}',
        commentaire_ouverture TEXT NULL,
        commentaire_cloture TEXT NULL,
        statut ENUM('ouverte', 'cloturee', 'annulee') NOT NULL DEFAULT 'ouverte',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE RESTRICT,
        FOREIGN KEY (utilisateur_cloture_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
        INDEX idx_caisse_statut (caisse_id, statut),
        INDEX idx_date_ouverture (date_ouverture)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table sessions_caisse créée');

    // ================================================
    // Table: mouvements_caisse
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mouvements_caisse (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_caisse_id INT NOT NULL,
        type_mouvement ENUM('entree', 'sortie') NOT NULL,
        categorie ENUM(
          'cotisation',
          'location',
          'retard',
          'amende',
          'vente',
          'don',
          'caution',
          'remboursement_caution',
          'remise_banque',
          'approvisionnement',
          'retrait',
          'autre'
        ) NOT NULL DEFAULT 'autre',
        montant DECIMAL(10, 2) NOT NULL,
        mode_paiement VARCHAR(50) NOT NULL DEFAULT 'especes' COMMENT 'especes, cheque, cb, virement, etc.',
        cotisation_id INT NULL,
        emprunt_id INT NULL,
        utilisateur_id INT NULL COMMENT 'Utilisateur concerné par le mouvement (adhérent)',
        operateur_id INT NOT NULL COMMENT 'Utilisateur qui a saisi le mouvement (bénévole/admin)',
        reference VARCHAR(50) NULL COMMENT 'Numéro de chèque, référence transaction CB, etc.',
        libelle VARCHAR(255) NOT NULL COMMENT 'Description du mouvement',
        commentaire TEXT NULL,
        date_mouvement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ecriture_comptable_id INT NULL,
        remise_banque_id INT NULL COMMENT 'Référence vers une remise en banque groupée',
        statut ENUM('valide', 'annule') NOT NULL DEFAULT 'valide',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_caisse_id) REFERENCES sessions_caisse(id) ON DELETE CASCADE,
        FOREIGN KEY (cotisation_id) REFERENCES cotisations(id) ON DELETE SET NULL,
        FOREIGN KEY (emprunt_id) REFERENCES emprunts(id) ON DELETE SET NULL,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
        FOREIGN KEY (operateur_id) REFERENCES utilisateurs(id) ON DELETE RESTRICT,
        FOREIGN KEY (ecriture_comptable_id) REFERENCES ecritures_comptables(id) ON DELETE SET NULL,
        INDEX idx_session (session_caisse_id),
        INDEX idx_date (date_mouvement),
        INDEX idx_type (type_mouvement),
        INDEX idx_categorie (categorie),
        INDEX idx_statut (statut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table mouvements_caisse créée');

    // ================================================
    // Données par défaut: une caisse principale
    // ================================================
    const [existingCaisses] = await connection.query(
      'SELECT COUNT(*) as count FROM caisses'
    );

    if (existingCaisses[0].count === 0) {
      await connection.query(`
        INSERT INTO caisses (nom, code, solde_initial, solde_actuel, compte_comptable, description, actif, created_at, updated_at)
        VALUES ('Caisse principale', 'CAISSE_PRINC', 0, 0, '5300', 'Caisse principale de l''association', TRUE, NOW(), NOW())
      `);
      console.log('  ✓ Caisse principale créée par défaut');
    } else {
      console.log('  ℹ Des caisses existent déjà, pas de données insérées');
    }

    console.log('Migration Caisse - Terminée avec succès!');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = migrate;
