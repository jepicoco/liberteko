/**
 * Migration: Ajouter theme_code a parametres_front
 *
 * Cette migration ajoute la colonne theme_code pour stocker le code du theme
 * (nom du dossier) au lieu de theme_id (ancien systeme base sur la BDD).
 *
 * Les themes sont maintenant detectes depuis le filesystem (frontend/themes/)
 * et chaque theme est identifie par son code (nom de dossier).
 *
 * Usage: node database/migrations/addThemeCodeToParametresFront.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

async function migrate() {
  console.log('=== Migration: Ajout theme_code a parametres_front ===\n');

  try {
    await sequelize.authenticate();
    console.log('Connexion a la base de donnees etablie.\n');

    // Verifier si la colonne existe deja
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'parametres_front'
      AND COLUMN_NAME = 'theme_code'
    `);

    if (columns.length > 0) {
      console.log('La colonne theme_code existe deja. Migration ignoree.\n');
      return;
    }

    // Ajouter la colonne theme_code
    console.log('Ajout de la colonne theme_code...');
    await sequelize.query(`
      ALTER TABLE parametres_front
      ADD COLUMN theme_code VARCHAR(50) DEFAULT 'default'
      COMMENT 'Code du theme actif (nom du dossier dans frontend/themes/)'
      AFTER theme_id
    `);
    console.log('Colonne theme_code ajoutee.\n');

    // Migrer les donnees existantes de theme_id vers theme_code si possible
    // On va essayer de recuperer le code depuis la table themes_site
    const [themesExist] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'themes_site'
    `);

    if (themesExist[0].count > 0) {
      console.log('Migration des donnees theme_id vers theme_code...');

      // Mettre a jour theme_code en fonction de theme_id
      await sequelize.query(`
        UPDATE parametres_front pf
        LEFT JOIN themes_site ts ON pf.theme_id = ts.id
        SET pf.theme_code = COALESCE(ts.code, 'default')
        WHERE pf.theme_code IS NULL OR pf.theme_code = ''
      `);

      console.log('Donnees migrees.\n');
    }

    // S'assurer qu'on a une valeur par defaut
    await sequelize.query(`
      UPDATE parametres_front
      SET theme_code = 'default'
      WHERE theme_code IS NULL OR theme_code = ''
    `);

    console.log('=== Migration terminee avec succes ===\n');

  } catch (error) {
    console.error('Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Fonction rollback
async function rollback() {
  console.log('=== Rollback: Suppression theme_code ===\n');

  try {
    await sequelize.authenticate();

    await sequelize.query(`
      ALTER TABLE parametres_front DROP COLUMN IF EXISTS theme_code
    `);

    console.log('Colonne theme_code supprimee.\n');

  } catch (error) {
    console.error('Erreur lors du rollback:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executer selon l'argument
const arg = process.argv[2];
if (arg === 'rollback') {
  rollback().catch(console.error);
} else {
  migrate().catch(console.error);
}
