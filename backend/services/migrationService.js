/**
 * Migration Service
 * Service pour gerer les migrations de base de donnees
 * Wrapper autour de database/migrate.js pour l'API
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');
const MIGRATIONS_TABLE = 'migrations';

/**
 * Obtient une connexion a la base de donnees
 */
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

/**
 * Cree la table migrations si elle n'existe pas
 */
async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      batch INT NOT NULL DEFAULT 1
    )
  `);
}

/**
 * Recupere les migrations deja executees
 */
async function getExecutedMigrations(connection) {
  const [rows] = await connection.query(
    `SELECT name, batch, executed_at FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`
  );
  return rows;
}

/**
 * Recupere le dernier batch
 */
async function getLastBatch(connection) {
  const [rows] = await connection.query(
    `SELECT MAX(batch) as lastBatch FROM ${MIGRATIONS_TABLE}`
  );
  return rows[0].lastBatch || 0;
}

/**
 * Recupere tous les fichiers de migration
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .sort();
}

/**
 * Charge un module de migration
 */
function loadMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // Clear require cache pour recharger le module
  delete require.cache[require.resolve(filepath)];

  const migration = require(filepath);

  // Verifier que la migration a les fonctions up et down
  if (typeof migration.up !== 'function') {
    return {
      up: async () => {},
      down: async () => {},
      isLegacy: true
    };
  }

  return migration;
}

/**
 * Marque une migration comme executee
 */
async function markAsExecuted(connection, name, batch) {
  await connection.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name, batch) VALUES (?, ?)`,
    [name, batch]
  );
}

/**
 * Obtient le statut complet des migrations
 * @returns {Promise<Object>} { executed, pending, total, hasPending }
 */
async function getStatus() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    const pending = allFiles.filter(f => !executedNames.includes(f));

    // Enrichir les migrations executees avec leur statut
    const executedList = executed.map(m => ({
      name: m.name,
      batch: m.batch,
      executedAt: m.executed_at,
      status: 'executed'
    }));

    // Ajouter les migrations en attente
    const pendingList = pending.map(name => ({
      name,
      batch: null,
      executedAt: null,
      status: 'pending'
    }));

    return {
      executed: executedList,
      pending: pendingList,
      total: allFiles.length,
      hasPending: pending.length > 0,
      pendingCount: pending.length,
      executedCount: executed.length
    };

  } finally {
    await connection.end();
  }
}

/**
 * Execute toutes les migrations en attente
 * @returns {Promise<Object>} { success, executed, errors }
 */
async function runPending() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    const pending = allFiles.filter(f => !executedNames.includes(f));

    if (pending.length === 0) {
      return {
        success: true,
        executed: [],
        message: 'Aucune migration en attente'
      };
    }

    const batch = (await getLastBatch(connection)) + 1;
    const results = [];
    const errors = [];

    for (const file of pending) {
      try {
        const migration = loadMigration(file);

        if (migration.isLegacy) {
          results.push({
            name: file,
            status: 'skipped',
            message: 'Migration legacy (format standalone)'
          });
          continue;
        }

        await migration.up(connection);
        await markAsExecuted(connection, file, batch);

        results.push({
          name: file,
          status: 'success',
          batch
        });
      } catch (error) {
        errors.push({
          name: file,
          status: 'error',
          message: error.message
        });
        // Arreter a la premiere erreur
        break;
      }
    }

    return {
      success: errors.length === 0,
      executed: results,
      errors,
      batch: errors.length === 0 ? batch : null
    };

  } finally {
    await connection.end();
  }
}

/**
 * Obtient juste le nombre de migrations en attente (pour l'indicateur)
 * @returns {Promise<number>}
 */
async function getPendingCount() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const [executed] = await connection.query(
      `SELECT name FROM ${MIGRATIONS_TABLE}`
    );
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    return allFiles.filter(f => !executedNames.includes(f)).length;

  } finally {
    await connection.end();
  }
}

module.exports = {
  getStatus,
  runPending,
  getPendingCount
};
