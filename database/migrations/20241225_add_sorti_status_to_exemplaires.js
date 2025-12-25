/**
 * Migration: Ajouter le statut 'sorti' aux tables exemplaires
 *
 * Cette migration ajoute le statut 'sorti' a l'ENUM statut des 4 tables exemplaires
 * pour permettre le suivi des exemplaires sortis du stock (desherbage).
 */

const { sequelize } = require('../../backend/models');

const TABLES = [
  'exemplaires_jeux',
  'exemplaires_livres',
  'exemplaires_films',
  'exemplaires_disques'
];

const NEW_ENUM = "'disponible','emprunte','reserve','maintenance','perdu','archive','sorti'";

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  for (const table of TABLES) {
    // Verifier que la table existe
    const tables = await queryInterface.showAllTables();
    if (!tables.includes(table)) {
      console.log(`Table ${table} n'existe pas, skip`);
      continue;
    }

    // Verifier si 'sorti' est deja dans l'ENUM
    const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table} WHERE Field = 'statut'`);
    if (columns.length > 0) {
      const columnType = columns[0].Type;
      if (columnType.includes('sorti')) {
        console.log(`${table}.statut contient deja 'sorti', skip`);
        continue;
      }
    }

    // Modifier l'ENUM pour ajouter 'sorti'
    await sequelize.query(`
      ALTER TABLE ${table}
      MODIFY COLUMN statut ENUM(${NEW_ENUM})
      NOT NULL DEFAULT 'disponible'
    `);
    console.log(`${table}.statut: ajout de 'sorti' OK`);
  }

  console.log('Migration 20241225_add_sorti_status_to_exemplaires terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const OLD_ENUM = "'disponible','emprunte','reserve','maintenance','perdu','archive'";

  for (const table of TABLES) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes(table)) continue;

    // D'abord, mettre a jour les enregistrements 'sorti' vers 'archive'
    await sequelize.query(`
      UPDATE ${table} SET statut = 'archive' WHERE statut = 'sorti'
    `);

    // Puis modifier l'ENUM pour retirer 'sorti'
    await sequelize.query(`
      ALTER TABLE ${table}
      MODIFY COLUMN statut ENUM(${OLD_ENUM})
      NOT NULL DEFAULT 'disponible'
    `);
    console.log(`${table}.statut: retrait de 'sorti' OK`);
  }
}

module.exports = { up, down };
