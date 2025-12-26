/**
 * Script de diagnostic et nettoyage des index dupliqués
 *
 * Usage: node scripts/fix-duplicate-indexes.js [--fix]
 *
 * Sans --fix : affiche uniquement le diagnostic
 * Avec --fix : supprime les index dupliqués
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const FIX_MODE = process.argv.includes('--fix');

async function main() {
  console.log('=== Diagnostic des index MySQL ===\n');
  console.log(`Mode: ${FIX_MODE ? 'CORRECTION' : 'DIAGNOSTIC SEUL'}\n`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Lister les tables avec beaucoup d'index
    console.log('1. Tables avec le plus d\'index:\n');
    const [indexCounts] = await connection.query(`
      SELECT TABLE_NAME, COUNT(DISTINCT INDEX_NAME) as index_count
      FROM information_schema.statistics
      WHERE table_schema = ?
      GROUP BY TABLE_NAME
      HAVING COUNT(DISTINCT INDEX_NAME) > 10
      ORDER BY index_count DESC
    `, [process.env.DB_NAME]);

    indexCounts.forEach(r => {
      const warning = r.index_count > 50 ? ' ⚠️ PROCHE DE LA LIMITE!' : '';
      console.log(`   ${r.TABLE_NAME}: ${r.index_count} index${warning}`);
    });

    // 2. Chercher les index dupliqués (mêmes colonnes)
    console.log('\n2. Recherche d\'index dupliqués (mêmes colonnes):\n');

    // Récupérer tous les index groupés par colonnes
    const [allIndexes] = await connection.query(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        NON_UNIQUE,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
      FROM information_schema.statistics
      WHERE TABLE_SCHEMA = ?
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
      ORDER BY TABLE_NAME, columns
    `, [process.env.DB_NAME]);

    // Trouver les doublons
    const duplicates = [];
    const seen = {};

    for (const idx of allIndexes) {
      const key = `${idx.TABLE_NAME}:${idx.columns}`;
      if (seen[key]) {
        duplicates.push({
          TABLE_NAME: idx.TABLE_NAME,
          index1: seen[key].INDEX_NAME,
          index2: idx.INDEX_NAME,
          columns: idx.columns,
          nonUnique1: seen[key].NON_UNIQUE,
          nonUnique2: idx.NON_UNIQUE
        });
      } else {
        seen[key] = idx;
      }
    }

    if (duplicates.length === 0) {
      console.log('   Aucun index dupliqué trouvé.');
    } else {
      console.log(`   ${duplicates.length} paire(s) d'index dupliqués trouvée(s):\n`);

      for (const dup of duplicates) {
        console.log(`   Table: ${dup.TABLE_NAME}`);
        console.log(`     - ${dup.index1}`);
        console.log(`     - ${dup.index2} (candidat à la suppression)`);
        console.log(`     Colonnes: ${dup.columns}\n`);

        if (FIX_MODE) {
          // Déterminer quel index supprimer :
          // 1. Préférer supprimer l'index non-unique
          // 2. Si les deux sont UNIQUE, supprimer celui avec le nom généré (_2, _3, etc.)
          // 3. Ne jamais supprimer PRIMARY
          let indexToDelete = null;

          if (dup.index1 === 'PRIMARY' || dup.index2 === 'PRIMARY') {
            // Ne rien supprimer si PRIMARY impliqué
            indexToDelete = null;
          } else if (dup.nonUnique2 === 1) {
            indexToDelete = dup.index2;
          } else if (dup.nonUnique1 === 1) {
            indexToDelete = dup.index1;
          } else {
            // Les deux sont UNIQUE - supprimer celui avec le suffixe _N
            const hasNumSuffix1 = /_\d+$/.test(dup.index1);
            const hasNumSuffix2 = /_\d+$/.test(dup.index2);
            if (hasNumSuffix2) {
              indexToDelete = dup.index2;
            } else if (hasNumSuffix1) {
              indexToDelete = dup.index1;
            }
          }

          if (indexToDelete) {
            try {
              await connection.query(`DROP INDEX \`${indexToDelete}\` ON \`${dup.TABLE_NAME}\``);
              console.log(`     ✓ Index ${indexToDelete} supprimé\n`);
            } catch (e) {
              console.log(`     ✗ Erreur: ${e.message}\n`);
            }
          } else {
            console.log(`     ⚠ Impossible de déterminer l'index à supprimer\n`);
          }
        }
      }
    }

    // 3. Chercher les tables problématiques (> 60 index)
    console.log('\n3. Tables proches de la limite (> 50 index):\n');

    const [problematic] = await connection.query(`
      SELECT TABLE_NAME, COUNT(DISTINCT INDEX_NAME) as index_count
      FROM information_schema.statistics
      WHERE table_schema = ?
      GROUP BY TABLE_NAME
      HAVING COUNT(DISTINCT INDEX_NAME) > 50
      ORDER BY index_count DESC
    `, [process.env.DB_NAME]);

    if (problematic.length === 0) {
      console.log('   Aucune table problématique.');
    } else {
      for (const table of problematic) {
        console.log(`   ⚠️ ${table.TABLE_NAME}: ${table.index_count} index`);

        // Lister tous les index de cette table
        const [indexes] = await connection.query(`
          SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns, NON_UNIQUE
          FROM information_schema.statistics
          WHERE table_schema = ? AND table_name = ?
          GROUP BY INDEX_NAME, NON_UNIQUE
          ORDER BY INDEX_NAME
        `, [process.env.DB_NAME, table.TABLE_NAME]);

        console.log('   Index:');
        indexes.forEach(idx => {
          const type = idx.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
          console.log(`     - ${idx.INDEX_NAME} (${type}): ${idx.columns}`);
        });
        console.log('');
      }
    }

    console.log('\n=== Fin du diagnostic ===');

    if (!FIX_MODE && duplicates.length > 0) {
      console.log('\nPour supprimer les index dupliqués, relancer avec: node scripts/fix-duplicate-indexes.js --fix\n');
    }

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
