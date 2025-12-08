/**
 * Migration: Ajouter les Foreign Keys manquantes sur emprunts
 *
 * Ajoute les contraintes de cle etrangere sur film_id et cd_id
 * qui n'avaient pas ete ajoutees lors de la migration initiale
 * car les tables films et disques n'existaient pas encore.
 *
 * Usage:
 *   node database/migrations/addMissingForeignKeys.js up
 *   node database/migrations/addMissingForeignKeys.js down
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

/**
 * Verifie si une contrainte de cle etrangere existe
 */
async function foreignKeyExists(connection, tableName, constraintName) {
  const [rows] = await connection.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `, [process.env.DB_NAME, tableName, constraintName]);
  return rows.length > 0;
}

/**
 * Verifie si une table existe
 */
async function tableExists(connection, tableName) {
  const [rows] = await connection.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `, [process.env.DB_NAME, tableName]);
  return rows.length > 0;
}

/**
 * Migration UP - Ajoute les FK manquantes
 */
async function up(connection) {
  console.log('=== Migration UP: Ajout des Foreign Keys manquantes ===\n');

  // Verifier que les tables cibles existent
  const filmsExists = await tableExists(connection, 'films');
  const disquesExists = await tableExists(connection, 'disques');

  console.log(`Table films existe: ${filmsExists}`);
  console.log(`Table disques existe: ${disquesExists}\n`);

  // FK sur film_id -> films
  if (filmsExists) {
    const fkFilmExists = await foreignKeyExists(connection, 'emprunts', 'fk_emprunts_film');
    if (!fkFilmExists) {
      console.log('Ajout de la FK sur film_id -> films...');

      // D'abord nettoyer les donnees orphelines si elles existent
      await connection.query(`
        UPDATE emprunts SET film_id = NULL
        WHERE film_id IS NOT NULL
          AND film_id NOT IN (SELECT id FROM films)
      `);

      await connection.query(`
        ALTER TABLE emprunts
        ADD CONSTRAINT fk_emprunts_film
        FOREIGN KEY (film_id) REFERENCES films(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      console.log('  ✓ FK fk_emprunts_film ajoutee');
    } else {
      console.log('  - FK fk_emprunts_film existe deja');
    }
  } else {
    console.log('  ⚠ Table films non trouvee, FK non ajoutee');
  }

  // FK sur cd_id -> disques
  if (disquesExists) {
    const fkCdExists = await foreignKeyExists(connection, 'emprunts', 'fk_emprunts_cd');
    if (!fkCdExists) {
      console.log('Ajout de la FK sur cd_id -> disques...');

      // D'abord nettoyer les donnees orphelines si elles existent
      await connection.query(`
        UPDATE emprunts SET cd_id = NULL
        WHERE cd_id IS NOT NULL
          AND cd_id NOT IN (SELECT id FROM disques)
      `);

      await connection.query(`
        ALTER TABLE emprunts
        ADD CONSTRAINT fk_emprunts_cd
        FOREIGN KEY (cd_id) REFERENCES disques(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      console.log('  ✓ FK fk_emprunts_cd ajoutee');
    } else {
      console.log('  - FK fk_emprunts_cd existe deja');
    }
  } else {
    console.log('  ⚠ Table disques non trouvee, FK non ajoutee');
  }

  console.log('\n=== Migration UP terminee ===');
}

/**
 * Migration DOWN - Supprime les FK ajoutees
 */
async function down(connection) {
  console.log('=== Migration DOWN: Suppression des Foreign Keys ===\n');

  // Supprimer FK film_id
  const fkFilmExists = await foreignKeyExists(connection, 'emprunts', 'fk_emprunts_film');
  if (fkFilmExists) {
    console.log('Suppression de la FK fk_emprunts_film...');
    await connection.query(`
      ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunts_film
    `);
    console.log('  ✓ FK fk_emprunts_film supprimee');
  } else {
    console.log('  - FK fk_emprunts_film n\'existe pas');
  }

  // Supprimer FK cd_id
  const fkCdExists = await foreignKeyExists(connection, 'emprunts', 'fk_emprunts_cd');
  if (fkCdExists) {
    console.log('Suppression de la FK fk_emprunts_cd...');
    await connection.query(`
      ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunts_cd
    `);
    console.log('  ✓ FK fk_emprunts_cd supprimee');
  } else {
    console.log('  - FK fk_emprunts_cd n\'existe pas');
  }

  console.log('\n=== Migration DOWN terminee ===');
}

// Point d'entree
const command = process.argv[2] || 'up';

(async () => {
  const connection = await getConnection();

  try {
    if (command === 'up') {
      await up(connection);
    } else if (command === 'down') {
      await down(connection);
    } else {
      console.log('Usage: node addMissingForeignKeys.js [up|down]');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();

module.exports = { up, down };
