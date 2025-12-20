/**
 * Migration: Synchroniser le schema de la table structures
 * Fix pour les colonnes manquantes apres des migrations executees dans le mauvais ordre
 */

const { sequelize } = require('../../backend/models');

async function up() {
  console.log('=== Fix Schema Structures ===');

  // Liste des colonnes attendues avec leurs definitions
  const expectedColumns = [
    {
      name: 'type_structure',
      definition: `ENUM('bibliotheque','ludotheque','mediatheque','relais_petite_enfance','enfance','jeunesse','culturel_sportif','autre') NULL DEFAULT 'ludotheque'`
    },
    {
      name: 'type_structure_label',
      definition: 'VARCHAR(100) NULL'
    },
    {
      name: 'organisation_id',
      definition: 'INT NULL'
    },
    {
      name: 'organisation_nom',
      definition: 'VARCHAR(200) NULL'
    },
    {
      name: 'siret',
      definition: 'VARCHAR(14) NULL'
    },
    {
      name: 'adresse',
      definition: 'TEXT NULL'
    },
    {
      name: 'telephone',
      definition: 'VARCHAR(20) NULL'
    },
    {
      name: 'email',
      definition: 'VARCHAR(255) NULL'
    },
    {
      name: 'modules_actifs',
      definition: `JSON NULL`
    },
    {
      name: 'couleur',
      definition: `VARCHAR(7) NULL DEFAULT '#007bff'`
    },
    {
      name: 'icone',
      definition: `VARCHAR(50) NULL DEFAULT 'building'`
    },
    {
      name: 'code_comptable',
      definition: 'VARCHAR(20) NULL'
    },
    {
      name: 'section_analytique_id',
      definition: 'INT NULL'
    },
    {
      name: 'configuration_email_id',
      definition: 'INT NULL'
    },
    {
      name: 'configuration_sms_id',
      definition: 'INT NULL'
    }
  ];

  for (const col of expectedColumns) {
    // Verifier si la colonne existe
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'structures'
      AND COLUMN_NAME = '${col.name}'
    `);

    if (columns.length === 0) {
      console.log(`  Ajout colonne ${col.name}...`);
      try {
        await sequelize.query(`ALTER TABLE structures ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`    OK`);
      } catch (e) {
        console.log(`    Erreur: ${e.message}`);
      }
    } else {
      console.log(`  Colonne ${col.name} existe deja`);
    }
  }

  // Ajouter les FK si elles n'existent pas
  const fks = [
    { col: 'section_analytique_id', table: 'sections_analytiques', name: 'fk_struct_section' },
    { col: 'configuration_email_id', table: 'configurations_email', name: 'fk_struct_email' },
    { col: 'configuration_sms_id', table: 'configurations_sms', name: 'fk_struct_sms' }
  ];

  for (const fk of fks) {
    try {
      // Verifier si la table referencee existe
      const [tables] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${fk.table}'
      `);

      if (tables.length > 0) {
        // Verifier si la FK existe deja
        const [constraints] = await sequelize.query(`
          SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'structures'
          AND CONSTRAINT_NAME = '${fk.name}'
        `);

        if (constraints.length === 0) {
          console.log(`  Ajout FK ${fk.name}...`);
          await sequelize.query(`
            ALTER TABLE structures
            ADD CONSTRAINT ${fk.name}
            FOREIGN KEY (${fk.col}) REFERENCES ${fk.table}(id)
            ON DELETE SET NULL
          `);
          console.log(`    OK`);
        }
      }
    } catch (e) {
      console.log(`  FK ${fk.name}: ${e.message}`);
    }
  }

  console.log('=== Fix termine ===');
}

async function down() {
  console.log('Rollback: rien a faire');
}

module.exports = { up, down };
