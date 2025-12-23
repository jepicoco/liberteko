/**
 * Migration: Add limite_emprunt_active columns for all modules
 *
 * Permet d'activer/desactiver les limites d'emprunt par module.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier les colonnes existantes
  const columns = await queryInterface.describeTable('parametres_front');

  const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

  for (const mod of modules) {
    const colName = `limite_emprunt_active_${mod}`;
    if (!columns[colName]) {
      console.log(`Ajout de ${colName}...`);
      await sequelize.query(`
        ALTER TABLE parametres_front
        ADD COLUMN ${colName} BOOLEAN DEFAULT TRUE
        COMMENT 'Limites d''emprunt actives pour ${mod}'
      `);
    }
  }

  console.log('Migration limite_emprunt_active terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

  for (const mod of modules) {
    const colName = `limite_emprunt_active_${mod}`;
    try {
      await queryInterface.removeColumn('parametres_front', colName);
    } catch (e) {
      // Ignore si colonne n'existe pas
    }
  }
}

module.exports = { up, down };
