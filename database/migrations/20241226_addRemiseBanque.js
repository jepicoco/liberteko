/**
 * Migration: Add Remise Banque (Bank Deposit) system
 * Allows grouping cash/check movements for bank deposits
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Check if table already exists
  const tables = await queryInterface.showAllTables();

  if (!tables.includes('remises_banque')) {
    await queryInterface.sequelize.query(`
      CREATE TABLE remises_banque (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero_remise VARCHAR(50) UNIQUE COMMENT 'Format: REM-YYYY-NNNNNN',
        caisse_id INT NOT NULL,
        compte_bancaire_id INT,
        date_remise DATE NOT NULL,
        date_depot_effectif DATE COMMENT 'Date du depot effectif en banque',
        montant_total DECIMAL(10,2) NOT NULL DEFAULT 0,
        nb_mouvements INT NOT NULL DEFAULT 0,
        detail_par_mode JSON COMMENT 'Repartition par mode: {"especes": 150, "cheques": 200}',
        statut ENUM('en_preparation', 'deposee', 'validee', 'annulee') NOT NULL DEFAULT 'en_preparation',
        bordereau_reference VARCHAR(100) COMMENT 'Reference du bordereau de remise banque',
        commentaire TEXT,
        operateur_id INT NOT NULL COMMENT 'Utilisateur ayant cree la remise',
        validee_par_id INT COMMENT 'Utilisateur ayant valide la remise',
        date_validation DATETIME,
        structure_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_remise_caisse FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_remise_compte_bancaire FOREIGN KEY (compte_bancaire_id) REFERENCES comptes_bancaires(id) ON DELETE SET NULL,
        CONSTRAINT fk_remise_operateur FOREIGN KEY (operateur_id) REFERENCES utilisateurs(id) ON DELETE RESTRICT,
        CONSTRAINT fk_remise_valideur FOREIGN KEY (validee_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
        CONSTRAINT fk_remise_structure FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE SET NULL,
        INDEX idx_remise_caisse (caisse_id),
        INDEX idx_remise_date (date_remise),
        INDEX idx_remise_statut (statut),
        INDEX idx_remise_structure (structure_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table remises_banque creee');
  } else {
    console.log('Table remises_banque existe deja');
  }

  // Add foreign key constraint to mouvements_caisse.remise_banque_id
  // First check if the column exists
  const [columns] = await queryInterface.sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'mouvements_caisse'
    AND COLUMN_NAME = 'remise_banque_id'
  `);

  if (columns.length > 0) {
    // Check if FK already exists
    const [fks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'mouvements_caisse'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND CONSTRAINT_NAME LIKE '%remise%'
    `);

    if (fks.length === 0) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE mouvements_caisse
          ADD CONSTRAINT fk_mouvement_remise_banque
          FOREIGN KEY (remise_banque_id) REFERENCES remises_banque(id) ON DELETE SET NULL
        `);
        console.log('FK fk_mouvement_remise_banque ajoutee');
      } catch (err) {
        console.log('FK deja presente ou erreur:', err.message);
      }
    } else {
      console.log('FK remise_banque deja presente');
    }
  } else {
    console.log('Colonne remise_banque_id non presente dans mouvements_caisse');
  }

  // Create counter for remise numbering
  if (!tables.includes('compteurs_remises')) {
    await queryInterface.sequelize.query(`
      CREATE TABLE compteurs_remises (
        id INT PRIMARY KEY AUTO_INCREMENT,
        annee INT NOT NULL,
        dernier_numero INT NOT NULL DEFAULT 0,
        structure_id INT,
        UNIQUE KEY uk_compteur_annee_structure (annee, structure_id),
        CONSTRAINT fk_compteur_remise_structure FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table compteurs_remises creee');

    // Initialize counter for current year
    const currentYear = new Date().getFullYear();
    await queryInterface.sequelize.query(`
      INSERT INTO compteurs_remises (annee, dernier_numero, structure_id)
      VALUES (${currentYear}, 0, NULL)
    `);
    console.log(`Compteur initialise pour ${currentYear}`);
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Remove FK from mouvements_caisse
  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE mouvements_caisse
      DROP FOREIGN KEY fk_mouvement_remise_banque
    `);
  } catch (err) {
    console.log('FK non trouvee:', err.message);
  }

  // Drop tables
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS compteurs_remises');
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS remises_banque');

  console.log('Tables remises_banque et compteurs_remises supprimees');
}

module.exports = { up, down };
