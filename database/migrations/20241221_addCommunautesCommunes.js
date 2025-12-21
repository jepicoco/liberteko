/**
 * Migration: Ajouter tables CommunautesCommunes
 * Tables pour les intercommunalites et leurs communes membres
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  // Table communautes_communes
  if (!tables.includes('communautes_communes')) {
    console.log('[Migration] Creation table communautes_communes...');
    await queryInterface.createTable('communautes_communes', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(200),
        allowNull: false
      },
      code_siren: {
        type: sequelize.Sequelize.STRING(15),
        allowNull: true
      },
      type_epci: {
        type: sequelize.Sequelize.ENUM('CC', 'CA', 'CU', 'ME'),
        allowNull: true,
        defaultValue: 'CC'
      },
      departement: {
        type: sequelize.Sequelize.STRING(3),
        allowNull: true
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      structure_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Index
    await queryInterface.addIndex('communautes_communes', ['code'], {
      name: 'idx_cc_code',
      unique: true
    });
    await queryInterface.addIndex('communautes_communes', ['nom'], {
      name: 'idx_cc_nom'
    });
    await queryInterface.addIndex('communautes_communes', ['structure_id'], {
      name: 'idx_cc_structure'
    });

    console.log('[Migration] Table communautes_communes creee');
  }

  // Table communautes_communes_membres
  if (!tables.includes('communautes_communes_membres')) {
    console.log('[Migration] Creation table communautes_communes_membres...');
    await queryInterface.createTable('communautes_communes_membres', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      communaute_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'communautes_communes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      commune_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'communes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Index
    await queryInterface.addIndex('communautes_communes_membres', ['communaute_id'], {
      name: 'idx_ccm_communaute'
    });
    await queryInterface.addIndex('communautes_communes_membres', ['commune_id'], {
      name: 'idx_ccm_commune'
    });
    await queryInterface.addIndex('communautes_communes_membres', ['communaute_id', 'commune_id'], {
      name: 'idx_ccm_unique',
      unique: true
    });

    console.log('[Migration] Table communautes_communes_membres creee');
  }

  console.log('[Migration] addCommunautesCommunes terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer dans l'ordre inverse (contraintes FK)
  await queryInterface.dropTable('communautes_communes_membres');
  await queryInterface.dropTable('communautes_communes');

  console.log('[Migration] Tables communautes supprimees');
}

module.exports = { up, down };
