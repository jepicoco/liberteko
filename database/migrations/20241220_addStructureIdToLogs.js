/**
 * Migration: Ajouter structure_id aux tables email_logs et sms_logs
 * Pour le support multi-structure dans l'historique des communications
 */

const { sequelize } = require('../../backend/models');
const { Sequelize } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Adding structure_id to email_logs and sms_logs...');

  // email_logs
  const emailCols = await queryInterface.describeTable('email_logs');
  if (!emailCols.structure_id) {
    await queryInterface.addColumn('email_logs', 'structure_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    console.log('  - Added structure_id to email_logs');

    // Index pour performance
    await queryInterface.addIndex('email_logs', ['structure_id'], {
      name: 'email_logs_structure_id_idx'
    });
    console.log('  - Added index on email_logs.structure_id');
  } else {
    console.log('  - structure_id already exists in email_logs');
  }

  // sms_logs
  const smsCols = await queryInterface.describeTable('sms_logs');
  if (!smsCols.structure_id) {
    await queryInterface.addColumn('sms_logs', 'structure_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    console.log('  - Added structure_id to sms_logs');

    // Index pour performance
    await queryInterface.addIndex('sms_logs', ['structure_id'], {
      name: 'sms_logs_structure_id_idx'
    });
    console.log('  - Added index on sms_logs.structure_id');
  } else {
    console.log('  - structure_id already exists in sms_logs');
  }

  console.log('Migration completed.');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Removing structure_id from email_logs and sms_logs...');

  // email_logs
  const emailCols = await queryInterface.describeTable('email_logs');
  if (emailCols.structure_id) {
    await queryInterface.removeIndex('email_logs', 'email_logs_structure_id_idx');
    await queryInterface.removeColumn('email_logs', 'structure_id');
    console.log('  - Removed structure_id from email_logs');
  }

  // sms_logs
  const smsCols = await queryInterface.describeTable('sms_logs');
  if (smsCols.structure_id) {
    await queryInterface.removeIndex('sms_logs', 'sms_logs_structure_id_idx');
    await queryInterface.removeColumn('sms_logs', 'structure_id');
    console.log('  - Removed structure_id from sms_logs');
  }

  console.log('Rollback completed.');
}

module.exports = { up, down };
