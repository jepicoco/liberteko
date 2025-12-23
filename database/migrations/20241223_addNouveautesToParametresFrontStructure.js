/**
 * Migration: Add nouveaute settings to parametres_front_structure
 *
 * Permet de configurer les parametres de nouveautes par structure
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la table existe
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('parametres_front_structure')) {
    console.log('Table parametres_front_structure n\'existe pas, skip');
    return;
  }

  // Verifier les colonnes existantes
  const columns = await queryInterface.describeTable('parametres_front_structure');

  // Ajouter les colonnes nouveaute pour chaque module
  const modulesNouveaute = [
    { col: 'nouveaute_active_ludotheque', type: 'BOOLEAN', default: true },
    { col: 'nouveaute_duree_ludotheque', type: 'INTEGER', default: 60 },
    { col: 'nouveaute_active_bibliotheque', type: 'BOOLEAN', default: true },
    { col: 'nouveaute_duree_bibliotheque', type: 'INTEGER', default: 30 },
    { col: 'nouveaute_active_filmotheque', type: 'BOOLEAN', default: true },
    { col: 'nouveaute_duree_filmotheque', type: 'INTEGER', default: 45 },
    { col: 'nouveaute_active_discotheque', type: 'BOOLEAN', default: true },
    { col: 'nouveaute_duree_discotheque', type: 'INTEGER', default: 10 }
  ];

  for (const { col, type, default: defaultVal } of modulesNouveaute) {
    if (!columns[col]) {
      console.log(`Ajout de ${col}...`);
      if (type === 'BOOLEAN') {
        await sequelize.query(`
          ALTER TABLE parametres_front_structure
          ADD COLUMN ${col} BOOLEAN DEFAULT ${defaultVal}
          COMMENT 'Nouveautes activees pour ce module'
        `);
      } else {
        await sequelize.query(`
          ALTER TABLE parametres_front_structure
          ADD COLUMN ${col} INTEGER DEFAULT ${defaultVal}
          COMMENT 'Duree en jours pour considerer un article comme nouveau'
        `);
      }
    }
  }

  console.log('Migration nouveautes structure terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const columns = [
    'nouveaute_active_ludotheque', 'nouveaute_duree_ludotheque',
    'nouveaute_active_bibliotheque', 'nouveaute_duree_bibliotheque',
    'nouveaute_active_filmotheque', 'nouveaute_duree_filmotheque',
    'nouveaute_active_discotheque', 'nouveaute_duree_discotheque'
  ];

  for (const col of columns) {
    try {
      await queryInterface.removeColumn('parametres_front_structure', col);
    } catch (e) {
      // Ignore si colonne n'existe pas
    }
  }
}

module.exports = { up, down };
