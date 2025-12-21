/**
 * Migration: Ajouter le champ sexe aux utilisateurs
 *
 * Valeurs possibles:
 * - M : Masculin
 * - F : Feminin
 * - A : Autre
 * - N : Non precise (defaut)
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Ajout du champ sexe a la table utilisateurs...');

  // Verifier si la colonne existe deja
  const [columns] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'utilisateurs'
    AND COLUMN_NAME = 'sexe'
  `);

  if (columns.length === 0) {
    // Ajouter la colonne sexe avec ENUM
    await sequelize.query(`
      ALTER TABLE utilisateurs
      ADD COLUMN sexe ENUM('M', 'F', 'A', 'N') DEFAULT 'N'
      COMMENT 'M=Masculin, F=Feminin, A=Autre, N=Non precise'
      AFTER email
    `);

    console.log('Colonne sexe ajoutee avec succes');
  } else {
    console.log('Colonne sexe existe deja, skip');
  }
}

async function down() {
  console.log('Suppression du champ sexe de la table utilisateurs...');

  const [columns] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'utilisateurs'
    AND COLUMN_NAME = 'sexe'
  `);

  if (columns.length > 0) {
    await sequelize.query('ALTER TABLE utilisateurs DROP COLUMN sexe');
    console.log('Colonne sexe supprimee');
  }
}

module.exports = { up, down };
