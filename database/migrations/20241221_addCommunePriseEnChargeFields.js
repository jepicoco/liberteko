/**
 * Migration: Ajoute les champs code_postal_prise_en_charge et ville_prise_en_charge
 * aux utilisateurs pour gerer une commune de prise en charge differente de la residence
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si les colonnes existent deja
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'utilisateurs'
    AND COLUMN_NAME IN ('code_postal_prise_en_charge', 'ville_prise_en_charge')
  `);

  const existingColumns = results.map(r => r.COLUMN_NAME);

  // Ajouter code_postal_prise_en_charge si manquant
  if (!existingColumns.includes('code_postal_prise_en_charge')) {
    await sequelize.query(`
      ALTER TABLE utilisateurs
      ADD COLUMN code_postal_prise_en_charge VARCHAR(10) NULL
      COMMENT 'Code postal de prise en charge (si different de residence)'
      AFTER code_postal
    `);
    console.log('Colonne code_postal_prise_en_charge ajoutee');
  } else {
    console.log('Colonne code_postal_prise_en_charge existe deja');
  }

  // Ajouter ville_prise_en_charge si manquant
  if (!existingColumns.includes('ville_prise_en_charge')) {
    await sequelize.query(`
      ALTER TABLE utilisateurs
      ADD COLUMN ville_prise_en_charge VARCHAR(100) NULL
      COMMENT 'Ville de prise en charge (si differente de residence)'
      AFTER code_postal_prise_en_charge
    `);
    console.log('Colonne ville_prise_en_charge ajoutee');
  } else {
    console.log('Colonne ville_prise_en_charge existe deja');
  }

  console.log('Migration addCommunePriseEnChargeFields terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si les colonnes existent avant de supprimer
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'utilisateurs'
    AND COLUMN_NAME IN ('code_postal_prise_en_charge', 'ville_prise_en_charge')
  `);

  const existingColumns = results.map(r => r.COLUMN_NAME);

  if (existingColumns.includes('ville_prise_en_charge')) {
    await queryInterface.removeColumn('utilisateurs', 'ville_prise_en_charge');
    console.log('Colonne ville_prise_en_charge supprimee');
  }

  if (existingColumns.includes('code_postal_prise_en_charge')) {
    await queryInterface.removeColumn('utilisateurs', 'code_postal_prise_en_charge');
    console.log('Colonne code_postal_prise_en_charge supprimee');
  }
}

module.exports = { up, down };
