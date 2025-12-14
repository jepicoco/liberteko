/**
 * Migration: Parametrage Comptable Avance
 * Ajoute les tables pour le parametrage comptable configurable
 *
 * Format compatible avec le migration runner (database/migrate.js)
 */

module.exports = {
  up: async (connection) => {
    // 1. Table journaux_comptables
    const [journauxExists] = await connection.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'journaux_comptables'
    `);

    if (journauxExists[0].count === 0) {
      await connection.query(`
        CREATE TABLE journaux_comptables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(10) NOT NULL UNIQUE,
          libelle VARCHAR(100) NOT NULL,
          type ENUM('ventes', 'achats', 'banque', 'caisse', 'operations_diverses', 'a_nouveaux') NOT NULL,
          compte_contrepartie VARCHAR(20),
          description TEXT,
          actif TINYINT(1) NOT NULL DEFAULT 1,
          ordre_affichage INT NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('    Table journaux_comptables creee');

      // Inserer les journaux par defaut
      await connection.query(`
        INSERT INTO journaux_comptables (code, libelle, type, compte_contrepartie, ordre_affichage) VALUES
        ('VT', 'Journal des ventes', 'ventes', NULL, 1),
        ('AC', 'Journal des achats', 'achats', NULL, 2),
        ('BQ', 'Journal de banque', 'banque', '5121', 3),
        ('CA', 'Journal de caisse', 'caisse', '5300', 4),
        ('OD', 'Journal des operations diverses', 'operations_diverses', NULL, 5),
        ('AN', 'Journal des a-nouveaux', 'a_nouveaux', NULL, 6)
      `);
      console.log('    Journaux comptables par defaut inseres');
    }

    // 2. Table comptes_comptables
    const [comptesExists] = await connection.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comptes_comptables'
    `);

    if (comptesExists[0].count === 0) {
      await connection.query(`
        CREATE TABLE comptes_comptables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          numero VARCHAR(20) NOT NULL UNIQUE,
          libelle VARCHAR(150) NOT NULL,
          classe ENUM('1', '2', '3', '4', '5', '6', '7', '8') NOT NULL,
          type ENUM('general', 'auxiliaire', 'analytique') NOT NULL DEFAULT 'general',
          nature ENUM('actif', 'passif', 'charge', 'produit'),
          parent_id INT,
          accepte_saisie TINYINT(1) NOT NULL DEFAULT 1,
          description TEXT,
          actif TINYINT(1) NOT NULL DEFAULT 1,
          ordre_affichage INT NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_compte_parent FOREIGN KEY (parent_id) REFERENCES comptes_comptables(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('    Table comptes_comptables creee');

      // Inserer les comptes de base
      await connection.query(`
        INSERT INTO comptes_comptables (numero, libelle, classe, nature, accepte_saisie, ordre_affichage) VALUES
        -- Classe 4: Tiers
        ('411', 'Clients', '4', 'actif', 0, 10),
        ('4110', 'Clients divers', '4', 'actif', 1, 11),
        ('4457', 'TVA collectee', '4', 'passif', 1, 20),
        ('4456', 'TVA deductible', '4', 'actif', 1, 21),
        ('467', 'Autres comptes debiteurs ou crediteurs', '4', 'actif', 1, 30),
        -- Classe 5: Financiers
        ('512', 'Banque', '5', 'actif', 0, 40),
        ('5121', 'Compte courant', '5', 'actif', 1, 41),
        ('5122', 'Livret A', '5', 'actif', 1, 42),
        ('530', 'Caisse', '5', 'actif', 0, 50),
        ('5300', 'Caisse principale', '5', 'actif', 1, 51),
        -- Classe 6: Charges
        ('606', 'Achats non stockes', '6', 'charge', 1, 60),
        ('613', 'Locations', '6', 'charge', 1, 61),
        ('625', 'Deplacements et missions', '6', 'charge', 1, 62),
        ('627', 'Services bancaires', '6', 'charge', 1, 63),
        -- Classe 7: Produits
        ('706', 'Prestations de services', '7', 'produit', 0, 70),
        ('7061', 'Cotisations', '7', 'produit', 1, 71),
        ('7062', 'Locations', '7', 'produit', 1, 72),
        ('7063', 'Animations et ateliers', '7', 'produit', 1, 73),
        ('758', 'Produits divers de gestion courante', '7', 'produit', 1, 80),
        ('754', 'Dons', '7', 'produit', 1, 81),
        ('741', 'Subventions exploitation', '7', 'produit', 1, 82)
      `);
      console.log('    Comptes comptables de base inseres');

      // Mettre a jour les parent_id
      await connection.query(`
        UPDATE comptes_comptables SET parent_id = (SELECT id FROM (SELECT id FROM comptes_comptables WHERE numero = '512') t) WHERE numero IN ('5121', '5122')
      `);
      await connection.query(`
        UPDATE comptes_comptables SET parent_id = (SELECT id FROM (SELECT id FROM comptes_comptables WHERE numero = '530') t) WHERE numero = '5300'
      `);
      await connection.query(`
        UPDATE comptes_comptables SET parent_id = (SELECT id FROM (SELECT id FROM comptes_comptables WHERE numero = '706') t) WHERE numero IN ('7061', '7062', '7063')
      `);
      console.log('    Hierarchie des comptes mise a jour');
    }

    // 3. Table parametrage_comptable_operations
    const [parametrageExists] = await connection.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametrage_comptable_operations'
    `);

    if (parametrageExists[0].count === 0) {
      await connection.query(`
        CREATE TABLE parametrage_comptable_operations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type_operation ENUM('cotisation', 'location', 'retard', 'amende', 'vente', 'don', 'subvention', 'animation', 'caution', 'remboursement_caution') NOT NULL UNIQUE,
          libelle VARCHAR(100) NOT NULL,
          description TEXT,
          journal_code VARCHAR(10) NOT NULL DEFAULT 'VT',
          compte_produit VARCHAR(20) NOT NULL,
          compte_produit_libelle VARCHAR(150),
          compte_encaissement_defaut VARCHAR(20),
          compte_tva VARCHAR(20),
          taux_tva_id INT,
          section_analytique_id INT,
          prefixe_piece VARCHAR(10) NOT NULL DEFAULT 'OP',
          generer_ecritures_auto TINYINT(1) NOT NULL DEFAULT 1,
          actif TINYINT(1) NOT NULL DEFAULT 1,
          ordre_affichage INT NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_type_operation (type_operation),
          CONSTRAINT fk_param_taux_tva FOREIGN KEY (taux_tva_id) REFERENCES taux_tva(id) ON DELETE SET NULL,
          CONSTRAINT fk_param_section FOREIGN KEY (section_analytique_id) REFERENCES sections_analytiques(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('    Table parametrage_comptable_operations creee');

      // Inserer les parametrages par defaut
      await connection.query(`
        INSERT INTO parametrage_comptable_operations (type_operation, libelle, journal_code, compte_produit, compte_produit_libelle, prefixe_piece, ordre_affichage) VALUES
        ('cotisation', 'Cotisations membres', 'VT', '7061', 'Cotisations', 'COT', 1),
        ('location', 'Location d''articles', 'VT', '7062', 'Locations', 'LOC', 2),
        ('retard', 'Penalites de retard', 'VT', '758', 'Produits divers', 'RET', 3),
        ('amende', 'Amendes diverses', 'VT', '758', 'Produits divers', 'AMD', 4),
        ('vente', 'Ventes diverses', 'VT', '706', 'Prestations de services', 'VTE', 5),
        ('don', 'Dons recus', 'OD', '754', 'Dons', 'DON', 6),
        ('subvention', 'Subventions', 'OD', '741', 'Subventions exploitation', 'SUB', 7),
        ('animation', 'Animations et ateliers', 'VT', '7063', 'Animations et ateliers', 'ANI', 8),
        ('caution', 'Cautions recues', 'CA', '467', 'Autres comptes', 'CAU', 9),
        ('remboursement_caution', 'Remboursement cautions', 'CA', '467', 'Autres comptes', 'RBC', 10)
      `);
      console.log('    Parametrages operations par defaut inseres');
    }

    // 4. Table comptes_encaissement_modes_paiement
    const [encaissementExists] = await connection.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comptes_encaissement_modes_paiement'
    `);

    if (encaissementExists[0].count === 0) {
      await connection.query(`
        CREATE TABLE comptes_encaissement_modes_paiement (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mode_paiement_id INT NOT NULL UNIQUE,
          compte_numero VARCHAR(20) NOT NULL,
          compte_libelle VARCHAR(150),
          journal_code VARCHAR(10),
          description TEXT,
          actif TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_encaissement_mode FOREIGN KEY (mode_paiement_id) REFERENCES modes_paiement(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('    Table comptes_encaissement_modes_paiement creee');

      // Inserer les configurations par defaut si les modes de paiement existent
      const [modes] = await connection.query(`
        SELECT id, code FROM modes_paiement WHERE actif = 1
      `);

      for (const mode of modes) {
        let compte = '5121';
        let libelle = 'Banque - Compte courant';
        let journal = null;

        if (mode.code === 'especes') {
          compte = '5300';
          libelle = 'Caisse principale';
          journal = 'CA';
        }

        await connection.query(`
          INSERT INTO comptes_encaissement_modes_paiement (mode_paiement_id, compte_numero, compte_libelle, journal_code)
          VALUES (?, ?, ?, ?)
        `, [mode.id, compte, libelle, journal]);
      }
      console.log('    Comptes encaissement par mode de paiement configures');
    }

    console.log('    Migration addParametrageComptable terminee');
  },

  down: async (connection) => {
    // Supprimer les tables dans l'ordre inverse des FK
    const tables = [
      'comptes_encaissement_modes_paiement',
      'parametrage_comptable_operations',
      'comptes_comptables',
      'journaux_comptables'
    ];

    for (const table of tables) {
      try {
        await connection.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`    Table ${table} supprimee`);
      } catch (e) {
        console.log(`    Erreur suppression ${table}: ${e.message}`);
      }
    }

    console.log('    Rollback addParametrageComptable termine');
  }
};
