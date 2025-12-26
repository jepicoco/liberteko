/**
 * Migration: Fix articles_sortie missing exemplaire columns
 *
 * La migration 20241225_refactor_article_sortie_to_exemplaires.js a été skippée
 * car articles_sortie n'existait pas encore. Cette migration ajoute les colonnes
 * manquantes type_exemplaire et exemplaire_id si elles n'existent pas.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function up() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Vérifier si la table articles_sortie existe
    const [tables] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'articles_sortie'",
      [process.env.DB_NAME]
    );

    if (tables[0].cnt === 0) {
      console.log('Table articles_sortie n\'existe pas, skip');
      return;
    }

    // Vérifier et ajouter type_exemplaire
    const [cols1] = await connection.query(
      "SHOW COLUMNS FROM articles_sortie LIKE 'type_exemplaire'"
    );

    if (cols1.length === 0) {
      console.log('Ajout de la colonne type_exemplaire...');
      await connection.query(`
        ALTER TABLE articles_sortie
        ADD COLUMN type_exemplaire ENUM('jeu','livre','film','disque') NULL
        COMMENT 'Type d\\'exemplaire (V2)' AFTER type_article
      `);
      console.log('  ✓ type_exemplaire ajoutée');
    } else {
      console.log('  ⚠ type_exemplaire existe déjà');
    }

    // Vérifier et ajouter exemplaire_id
    const [cols2] = await connection.query(
      "SHOW COLUMNS FROM articles_sortie LIKE 'exemplaire_id'"
    );

    if (cols2.length === 0) {
      console.log('Ajout de la colonne exemplaire_id...');
      await connection.query(`
        ALTER TABLE articles_sortie
        ADD COLUMN exemplaire_id INT NULL
        COMMENT 'ID de l\\'exemplaire (V2)' AFTER type_exemplaire
      `);
      console.log('  ✓ exemplaire_id ajoutée');
    } else {
      console.log('  ⚠ exemplaire_id existe déjà');
    }

    // Vérifier et ajouter l'index
    const [idx] = await connection.query(`
      SELECT COUNT(*) as cnt FROM information_schema.statistics
      WHERE table_schema = ?
      AND table_name = 'articles_sortie'
      AND index_name = 'idx_article_sortie_exemplaire'
    `, [process.env.DB_NAME]);

    if (idx[0].cnt === 0) {
      console.log('Ajout de l\'index idx_article_sortie_exemplaire...');
      await connection.query(
        'CREATE INDEX idx_article_sortie_exemplaire ON articles_sortie(type_exemplaire, exemplaire_id)'
      );
      console.log('  ✓ Index ajouté');
    } else {
      console.log('  ⚠ Index existe déjà');
    }

    console.log('Migration terminée avec succès');

  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Supprimer l'index
    try {
      await connection.query('DROP INDEX idx_article_sortie_exemplaire ON articles_sortie');
      console.log('Index idx_article_sortie_exemplaire supprimé');
    } catch (e) {
      console.log('Index n\'existait pas');
    }

    // Supprimer les colonnes
    const [cols1] = await connection.query("SHOW COLUMNS FROM articles_sortie LIKE 'exemplaire_id'");
    if (cols1.length > 0) {
      await connection.query('ALTER TABLE articles_sortie DROP COLUMN exemplaire_id');
      console.log('Colonne exemplaire_id supprimée');
    }

    const [cols2] = await connection.query("SHOW COLUMNS FROM articles_sortie LIKE 'type_exemplaire'");
    if (cols2.length > 0) {
      await connection.query('ALTER TABLE articles_sortie DROP COLUMN type_exemplaire');
      console.log('Colonne type_exemplaire supprimée');
    }

  } finally {
    await connection.end();
  }
}

module.exports = { up, down };
