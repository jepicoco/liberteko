/**
 * Migration: Ajouter organisation_id a structures
 * Fix pour le cas ou 20241220_add_organisations.js a ete executee avant addStructures.js
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la colonne organisation_id existe deja
  const [columns] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'structures'
    AND COLUMN_NAME = 'organisation_id'
  `);

  if (columns.length === 0) {
    console.log('  Ajout de la colonne organisation_id a structures...');
    await sequelize.query(`
      ALTER TABLE structures
      ADD COLUMN organisation_id INT NULL COMMENT 'FK vers organisations - organisation parente'
    `);

    // Ajouter la FK si possible
    const [orgs] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organisations'
    `);

    if (orgs.length > 0) {
      try {
        await sequelize.query(`
          ALTER TABLE structures
          ADD CONSTRAINT fk_structures_organisation
          FOREIGN KEY (organisation_id) REFERENCES organisations(id)
        `);
        console.log('  FK structures.organisation_id ajoutee');
      } catch (e) {
        console.log('  FK deja existante ou erreur:', e.message);
      }
    }

    console.log('  Colonne organisation_id ajoutee avec succes');
  } else {
    console.log('  Colonne organisation_id existe deja - rien a faire');
  }
}

async function down() {
  // Ne rien faire en rollback - la colonne est necessaire
  console.log('  Rollback: rien a faire');
}

module.exports = { up, down };
