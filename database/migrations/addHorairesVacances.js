/**
 * Migration: Ajout gestion horaires vacances
 *
 * Ajoute:
 * - horaires_ouverture.periode (normale/vacances)
 * - parametres_calendrier.horaires_vacances_identiques
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function runMigration() {
  console.log('=== Migration Horaires Vacances ===\n');

  try {
    // 1. Ajouter colonne periode à horaires_ouverture
    console.log('1. Ajout colonne periode à horaires_ouverture...');
    try {
      await sequelize.query(`
        ALTER TABLE horaires_ouverture
        ADD COLUMN periode ENUM('normale', 'vacances') NOT NULL DEFAULT 'normale'
        COMMENT 'normale=hors vacances, vacances=pendant vacances scolaires'
        AFTER recurrence
      `);
      console.log('   ✓ Colonne periode ajoutée');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠ Colonne periode existe déjà');
      } else {
        throw e;
      }
    }

    // 2. Ajouter colonne horaires_vacances_identiques à parametres_calendrier
    console.log('2. Ajout colonne horaires_vacances_identiques à parametres_calendrier...');
    try {
      await sequelize.query(`
        ALTER TABLE parametres_calendrier
        ADD COLUMN horaires_vacances_identiques BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'true = mêmes horaires que période normale, false = horaires spécifiques vacances'
        AFTER ouvert_vacances
      `);
      console.log('   ✓ Colonne horaires_vacances_identiques ajoutée');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠ Colonne horaires_vacances_identiques existe déjà');
      } else {
        throw e;
      }
    }

    // 3. Ajouter index sur periode
    console.log('3. Ajout index sur periode...');
    try {
      await sequelize.query(`
        CREATE INDEX idx_periode ON horaires_ouverture(periode)
      `);
      console.log('   ✓ Index idx_periode créé');
    } catch (e) {
      if (e.message.includes('Duplicate key name')) {
        console.log('   ⚠ Index existe déjà');
      } else {
        throw e;
      }
    }

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    throw error;
  }
}

// Exécution
runMigration()
  .then(() => {
    console.log('\nMigration complète.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration échouée:', error);
    process.exit(1);
  });
