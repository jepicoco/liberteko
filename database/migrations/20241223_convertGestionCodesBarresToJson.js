/**
 * Migration: Convert gestion_codes_barres from ENUM to JSON
 * Allows per-module barcode management configuration with 3 levels:
 * - 'organisation': centralized at organisation level
 * - 'structure': independent per structure
 * - 'GROUP_NAME': shared across organisations with same group name
 */

const { sequelize } = require('../../backend/models');

const MODULES = ['utilisateur', 'jeu', 'livre', 'film', 'disque'];

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tableInfo = await queryInterface.describeTable('organisations');

  // Check current column type
  const currentColumn = tableInfo.gestion_codes_barres;

  if (!currentColumn) {
    // Column doesn't exist, create it as JSON
    console.log('Creating gestion_codes_barres as JSON column...');
    await queryInterface.addColumn('organisations', 'gestion_codes_barres', {
      type: sequelize.Sequelize.JSON,
      allowNull: true,
      comment: 'Per-module barcode management: organisation, structure, or group name'
    });
  } else if (currentColumn.type.includes('ENUM')) {
    // Column exists as ENUM, need to convert
    console.log('Converting gestion_codes_barres from ENUM to JSON...');

    // Step 1: Read current values
    const [organisations] = await sequelize.query(
      'SELECT id, gestion_codes_barres FROM organisations'
    );

    // Step 2: Drop the ENUM column
    await queryInterface.removeColumn('organisations', 'gestion_codes_barres');

    // Step 3: Add new JSON column
    await queryInterface.addColumn('organisations', 'gestion_codes_barres', {
      type: sequelize.Sequelize.JSON,
      allowNull: true,
      comment: 'Per-module barcode management: organisation, structure, or group name'
    });

    // Step 4: Migrate existing values
    for (const org of organisations) {
      const oldValue = org.gestion_codes_barres || 'organisation';
      // Create JSON with same value for all modules
      const newValue = {};
      MODULES.forEach(module => {
        newValue[module] = oldValue;
      });

      await sequelize.query(
        'UPDATE organisations SET gestion_codes_barres = ? WHERE id = ?',
        {
          replacements: [JSON.stringify(newValue), org.id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`  Migrated organisation ${org.id}: ${oldValue} -> ${JSON.stringify(newValue)}`);
    }
  } else {
    console.log('Column gestion_codes_barres already exists as non-ENUM, skipping...');
  }

  console.log('Migration completed: gestion_codes_barres converted to JSON');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // Read current JSON values
    const [organisations] = await sequelize.query(
      'SELECT id, gestion_codes_barres FROM organisations'
    );

    // Remove JSON column
    await queryInterface.removeColumn('organisations', 'gestion_codes_barres');

    // Recreate as ENUM
    await queryInterface.addColumn('organisations', 'gestion_codes_barres', {
      type: sequelize.Sequelize.ENUM('organisation', 'structure'),
      allowNull: false,
      defaultValue: 'organisation',
      comment: 'Niveau de gestion des codes-barres: organisation ou structure'
    });

    // Migrate back (use first module's value or default to 'organisation')
    for (const org of organisations) {
      let jsonValue = org.gestion_codes_barres;
      if (typeof jsonValue === 'string') {
        try {
          jsonValue = JSON.parse(jsonValue);
        } catch (e) {
          jsonValue = null;
        }
      }

      // Determine the value: if any module is 'structure', use 'structure', else 'organisation'
      let enumValue = 'organisation';
      if (jsonValue) {
        const values = Object.values(jsonValue);
        if (values.includes('structure')) {
          enumValue = 'structure';
        }
      }

      await sequelize.query(
        'UPDATE organisations SET gestion_codes_barres = ? WHERE id = ?',
        {
          replacements: [enumValue, org.id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
    }

    console.log('Rollback completed: gestion_codes_barres reverted to ENUM');
  } catch (e) {
    console.log('Rollback error:', e.message);
  }
}

module.exports = { up, down };
