/**
 * Migration: Ajouter les tables de facturation
 * - factures: documents de facturation
 * - lignes_facture: lignes détaillées
 * - reglements_facture: règlements associés
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
    console.log('Migration Factures - Début...');

    // ================================================
    // Table: factures
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS factures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: FAC-YYYY-NNNNNN',
        type_document ENUM('facture', 'avoir', 'proforma') NOT NULL DEFAULT 'facture',

        -- Client
        utilisateur_id INT NULL,
        client_nom VARCHAR(200) NOT NULL,
        client_prenom VARCHAR(100) NULL,
        client_adresse TEXT NULL,
        client_code_postal VARCHAR(10) NULL,
        client_ville VARCHAR(100) NULL,
        client_email VARCHAR(255) NULL,

        -- Dates
        date_emission DATE NOT NULL,
        date_echeance DATE NULL,

        -- Montants
        montant_ht DECIMAL(10, 2) NOT NULL DEFAULT 0,
        montant_tva DECIMAL(10, 2) NOT NULL DEFAULT 0,
        montant_ttc DECIMAL(10, 2) NOT NULL DEFAULT 0,
        montant_regle DECIMAL(10, 2) NOT NULL DEFAULT 0,

        -- Statut
        statut ENUM('brouillon', 'emise', 'partiellement_reglee', 'reglee', 'annulee') NOT NULL DEFAULT 'brouillon',

        -- Références
        cotisation_id INT NULL,
        facture_avoir_reference_id INT NULL COMMENT 'Pour les avoirs: facture origine',

        -- Métadonnées
        objet VARCHAR(255) NULL COMMENT 'Objet/titre de la facture',
        notes TEXT NULL,
        conditions_paiement TEXT NULL,
        mentions_legales TEXT NULL,

        -- Comptabilité
        exercice INT NULL,
        ecriture_comptable_id INT NULL,

        -- Traçabilité
        cree_par_id INT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
        FOREIGN KEY (cotisation_id) REFERENCES cotisations(id) ON DELETE SET NULL,
        FOREIGN KEY (facture_avoir_reference_id) REFERENCES factures(id) ON DELETE SET NULL,
        FOREIGN KEY (ecriture_comptable_id) REFERENCES ecritures_comptables(id) ON DELETE SET NULL,
        FOREIGN KEY (cree_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,

        INDEX idx_numero (numero),
        INDEX idx_date_emission (date_emission),
        INDEX idx_statut (statut),
        INDEX idx_utilisateur (utilisateur_id),
        INDEX idx_cotisation (cotisation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table factures créée');

    // ================================================
    // Table: lignes_facture
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lignes_facture (
        id INT PRIMARY KEY AUTO_INCREMENT,
        facture_id INT NOT NULL,
        ordre INT NOT NULL DEFAULT 0,

        -- Description
        reference VARCHAR(50) NULL COMMENT 'Référence article/prestation',
        description VARCHAR(500) NOT NULL,

        -- Quantité et prix
        quantite DECIMAL(10, 3) NOT NULL DEFAULT 1,
        unite VARCHAR(20) NULL DEFAULT 'unité',
        prix_unitaire_ht DECIMAL(10, 2) NOT NULL,

        -- Remise
        remise_pourcent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        remise_montant DECIMAL(10, 2) NOT NULL DEFAULT 0,

        -- TVA
        taux_tva DECIMAL(5, 2) NOT NULL DEFAULT 0,

        -- Montants calculés
        montant_ht DECIMAL(10, 2) NOT NULL,
        montant_tva DECIMAL(10, 2) NOT NULL DEFAULT 0,
        montant_ttc DECIMAL(10, 2) NOT NULL,

        -- Comptabilité
        compte_comptable VARCHAR(20) NULL,
        section_analytique_id INT NULL,

        -- Référence optionnelle
        cotisation_id INT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (facture_id) REFERENCES factures(id) ON DELETE CASCADE,
        FOREIGN KEY (section_analytique_id) REFERENCES sections_analytiques(id) ON DELETE SET NULL,
        FOREIGN KEY (cotisation_id) REFERENCES cotisations(id) ON DELETE SET NULL,

        INDEX idx_facture (facture_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table lignes_facture créée');

    // ================================================
    // Table: reglements_facture
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reglements_facture (
        id INT PRIMARY KEY AUTO_INCREMENT,
        facture_id INT NOT NULL,
        date_reglement DATE NOT NULL,
        montant DECIMAL(10, 2) NOT NULL,

        -- Mode de paiement
        mode_paiement_id INT NULL,
        mode_paiement_code VARCHAR(50) NOT NULL DEFAULT 'especes',
        reference VARCHAR(100) NULL COMMENT 'N° chèque, référence CB, etc.',
        commentaire TEXT NULL,

        -- Liens
        mouvement_caisse_id INT NULL,
        compte_bancaire_id INT NULL,

        -- Traçabilité
        enregistre_par_id INT NULL,

        -- Statut
        statut ENUM('valide', 'annule') NOT NULL DEFAULT 'valide',
        date_annulation DATETIME NULL,
        motif_annulation TEXT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (facture_id) REFERENCES factures(id) ON DELETE CASCADE,
        FOREIGN KEY (mode_paiement_id) REFERENCES modes_paiement(id) ON DELETE SET NULL,
        FOREIGN KEY (mouvement_caisse_id) REFERENCES mouvements_caisse(id) ON DELETE SET NULL,
        FOREIGN KEY (compte_bancaire_id) REFERENCES comptes_bancaires(id) ON DELETE SET NULL,
        FOREIGN KEY (enregistre_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,

        INDEX idx_facture (facture_id),
        INDEX idx_date (date_reglement),
        INDEX idx_statut (statut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table reglements_facture créée');

    // ================================================
    // Table: compteur_factures (numérotation séquentielle)
    // ================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS compteurs_factures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_document VARCHAR(20) NOT NULL,
        annee INT NOT NULL,
        dernier_numero INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_type_annee (type_document, annee)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ Table compteurs_factures créée');

    // Initialiser les compteurs pour l'année en cours
    const annee = new Date().getFullYear();
    const [existingCompteurs] = await connection.query(
      'SELECT COUNT(*) as count FROM compteurs_factures WHERE annee = ?',
      [annee]
    );

    if (existingCompteurs[0].count === 0) {
      await connection.query(`
        INSERT INTO compteurs_factures (type_document, annee, dernier_numero, created_at, updated_at) VALUES
        ('facture', ?, 0, NOW(), NOW()),
        ('avoir', ?, 0, NOW(), NOW()),
        ('proforma', ?, 0, NOW(), NOW())
      `, [annee, annee, annee]);
      console.log(`  ✓ Compteurs initialisés pour ${annee}`);
    }

    console.log('Migration Factures - Terminée avec succès!');

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
