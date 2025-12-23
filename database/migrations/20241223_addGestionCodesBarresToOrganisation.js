/**
 * Migration: Add gestion_codes_barres column to organisations table
 * Defines whether barcode management is at organisation or structure level
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tableInfo = await queryInterface.describeTable('organisations');

  // Add gestion_codes_barres column
  if (!tableInfo.gestion_codes_barres) {
    console.log('Adding column gestion_codes_barres...');
    await queryInterface.addColumn('organisations', 'gestion_codes_barres', {
      type: sequelize.Sequelize.ENUM('organisation', 'structure'),
      allowNull: false,
      defaultValue: 'organisation',
      comment: 'Niveau de gestion des codes-barres: organisation ou structure'
    });
  } else {
    console.log('Column gestion_codes_barres already exists, skipping...');
  }

  console.log('Migration completed: gestion_codes_barres added to organisations');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await queryInterface.removeColumn('organisations', 'gestion_codes_barres');
    console.log('Dropped column gestion_codes_barres');
  } catch (e) {
    console.log('Column gestion_codes_barres may not exist, skipping...');
  }
}

module.exports = { up, down };
