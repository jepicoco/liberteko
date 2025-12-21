/**
 * Migration: Ajouter organisation_id aux tables de tarification
 * Permet de lier les configurations a une organisation (toutes les structures y ont acces)
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const { DataTypes } = require('sequelize');

  console.log('Ajout de organisation_id aux tables de tarification...');

  // 1. types_tarifs
  const typesTarifsColumns = await queryInterface.describeTable('types_tarifs').catch(() => null);
  if (typesTarifsColumns && !typesTarifsColumns.organisation_id) {
    await queryInterface.addColumn('types_tarifs', 'organisation_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Organisation proprietaire (toutes les structures y ont acces)'
    });
    console.log('  - types_tarifs.organisation_id ajoute');
  }

  // 2. configurations_quotient_familial
  const configQfColumns = await queryInterface.describeTable('configurations_quotient_familial').catch(() => null);
  if (configQfColumns && !configQfColumns.organisation_id) {
    await queryInterface.addColumn('configurations_quotient_familial', 'organisation_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Organisation proprietaire (toutes les structures y ont acces)'
    });
    console.log('  - configurations_quotient_familial.organisation_id ajoute');
  }

  // 3. regles_reduction
  const reglesColumns = await queryInterface.describeTable('regles_reduction').catch(() => null);
  if (reglesColumns && !reglesColumns.organisation_id) {
    await queryInterface.addColumn('regles_reduction', 'organisation_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Organisation proprietaire (toutes les structures y ont acces)'
    });
    console.log('  - regles_reduction.organisation_id ajoute');
  }

  console.log('Migration organisation_id terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Suppression de organisation_id des tables de tarification...');

  // 1. types_tarifs
  const typesTarifsColumns = await queryInterface.describeTable('types_tarifs').catch(() => null);
  if (typesTarifsColumns && typesTarifsColumns.organisation_id) {
    await queryInterface.removeColumn('types_tarifs', 'organisation_id');
    console.log('  - types_tarifs.organisation_id supprime');
  }

  // 2. configurations_quotient_familial
  const configQfColumns = await queryInterface.describeTable('configurations_quotient_familial').catch(() => null);
  if (configQfColumns && configQfColumns.organisation_id) {
    await queryInterface.removeColumn('configurations_quotient_familial', 'organisation_id');
    console.log('  - configurations_quotient_familial.organisation_id supprime');
  }

  // 3. regles_reduction
  const reglesColumns = await queryInterface.describeTable('regles_reduction').catch(() => null);
  if (reglesColumns && reglesColumns.organisation_id) {
    await queryInterface.removeColumn('regles_reduction', 'organisation_id');
    console.log('  - regles_reduction.organisation_id supprime');
  }

  console.log('Rollback organisation_id termine');
}

module.exports = { up, down };
