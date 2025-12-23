/**
 * Migration: Add limites emprunt and reservation columns to parametres_front_structure
 *
 * Permet de configurer les limites d'emprunt et de reservation par structure.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier les colonnes existantes
  const columns = await queryInterface.describeTable('parametres_front_structure');

  const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

  // Colonnes pour limites d'emprunt
  const empruntColumns = [
    { prefix: 'limite_emprunt_', type: 'INTEGER', default: 5, comment: 'Limite emprunts simultanes' },
    { prefix: 'limite_emprunt_nouveaute_', type: 'INTEGER', default: 1, comment: 'Limite emprunts nouveautes' },
    { prefix: 'limite_emprunt_bloquante_', type: 'BOOLEAN', default: true, comment: 'Limite bloquante (si false, warning)' },
    { prefix: 'limite_emprunt_active_', type: 'BOOLEAN', default: true, comment: 'Limites emprunt actives' }
  ];

  // Colonnes pour limites de reservation
  const reservationColumns = [
    { prefix: 'limite_reservation_', type: 'INTEGER', default: 2, comment: 'Limite reservations actives' },
    { prefix: 'limite_reservation_nouveaute_', type: 'INTEGER', default: 0, comment: 'Limite reservations nouveautes (0=non reservable)' },
    { prefix: 'reservation_expiration_jours_', type: 'INTEGER', default: 15, comment: 'Jours pour recuperer apres notification' },
    { prefix: 'reservation_active_', type: 'BOOLEAN', default: true, comment: 'Reservations actives pour ce module' }
  ];

  const allColumns = [...empruntColumns, ...reservationColumns];

  for (const mod of modules) {
    for (const col of allColumns) {
      const colName = col.prefix + mod;
      if (!columns[colName]) {
        console.log(`Ajout de ${colName}...`);
        if (col.type === 'BOOLEAN') {
          await sequelize.query(`
            ALTER TABLE parametres_front_structure
            ADD COLUMN ${colName} BOOLEAN DEFAULT ${col.default}
            COMMENT '${col.comment}'
          `);
        } else {
          await sequelize.query(`
            ALTER TABLE parametres_front_structure
            ADD COLUMN ${colName} INTEGER DEFAULT ${col.default}
            COMMENT '${col.comment}'
          `);
        }
      }
    }
  }

  console.log('Migration limites structure terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
  const prefixes = [
    'limite_emprunt_', 'limite_emprunt_nouveaute_', 'limite_emprunt_bloquante_', 'limite_emprunt_active_',
    'limite_reservation_', 'limite_reservation_nouveaute_', 'reservation_expiration_jours_', 'reservation_active_'
  ];

  for (const mod of modules) {
    for (const prefix of prefixes) {
      const colName = prefix + mod;
      try {
        await queryInterface.removeColumn('parametres_front_structure', colName);
      } catch (e) {
        // Ignore si colonne n'existe pas
      }
    }
  }
}

module.exports = { up, down };
