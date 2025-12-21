/**
 * Migration: Ajouter les criteres dynamiques aux types de tarifs
 * - Colonne criteres (JSON) pour stocker les conditions d'affichage
 * - Migration des anciennes conditions d'age vers le nouveau format
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la colonne criteres existe deja
  const [columns] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'types_tarifs'
    AND COLUMN_NAME = 'criteres'
  `);

  if (columns.length === 0) {
    // Ajouter la colonne criteres
    await sequelize.query(`
      ALTER TABLE types_tarifs
      ADD COLUMN criteres JSON DEFAULT NULL
      COMMENT 'Criteres d affichage dynamiques (age, sexe, commune, adhesion, tags)'
      AFTER description
    `);
    console.log('Colonne criteres ajoutee a types_tarifs');
  } else {
    console.log('Colonne criteres existe deja');
  }

  // Migrer les anciennes conditions d'age vers le nouveau format JSON
  const [typeTarifs] = await sequelize.query(`
    SELECT id, code, condition_age_operateur, condition_age_min, condition_age_max
    FROM types_tarifs
    WHERE condition_age_operateur != 'aucune'
    AND (criteres IS NULL OR JSON_LENGTH(criteres) = 0)
  `);

  for (const typeTarif of typeTarifs) {
    let criteresAge = null;

    switch (typeTarif.condition_age_operateur) {
      case '<':
        criteresAge = { operateur: '<', max: typeTarif.condition_age_max };
        break;
      case '<=':
        criteresAge = { operateur: '<=', max: typeTarif.condition_age_max };
        break;
      case '>':
        criteresAge = { operateur: '>', min: typeTarif.condition_age_max };
        break;
      case '>=':
        criteresAge = { operateur: '>=', min: typeTarif.condition_age_max };
        break;
      case 'entre':
        criteresAge = {
          operateur: 'entre',
          min: typeTarif.condition_age_min || 0,
          max: typeTarif.condition_age_max || 999
        };
        break;
    }

    if (criteresAge) {
      const criteres = JSON.stringify({ age: criteresAge });
      await sequelize.query(`
        UPDATE types_tarifs
        SET criteres = :criteres
        WHERE id = :id
      `, {
        replacements: { criteres, id: typeTarif.id }
      });
      console.log(`Criteres migres pour type ${typeTarif.code}`);
    }
  }

  console.log('Migration des criteres terminee');
}

async function down() {
  // Supprimer la colonne criteres
  await sequelize.query(`
    ALTER TABLE types_tarifs
    DROP COLUMN IF EXISTS criteres
  `);

  console.log('Colonne criteres supprimee de types_tarifs');
}

module.exports = { up, down };
