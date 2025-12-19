/**
 * Migration: Table JeuEan pour EAN multiples
 *
 * Cree la table jeu_eans pour stocker plusieurs EAN par jeu.
 * Migre les EAN existants depuis la colonne jeux.ean
 *
 * Usage: npm run migrate-jeu-eans
 */

// Charger les variables d'environnement
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Table JeuEan pour EAN multiples ===\n');

  try {
    // ========================================
    // 1. Creation de la table jeu_eans
    // ========================================

    console.log('1. Creation de la table jeu_eans...');

    await queryInterface.createTable('jeu_eans', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ean: {
        type: sequelize.Sequelize.STRING(13),
        allowNull: false,
        unique: true,
        comment: 'Code EAN-13 (unique globalement)'
      },
      principal: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'EAN principal affiche par defaut'
      },
      source: {
        type: sequelize.Sequelize.ENUM('import', 'manuel', 'bgg', 'upcitemdb'),
        allowNull: false,
        defaultValue: 'import',
        comment: 'Origine de l\'EAN'
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('  - Table jeu_eans existe deja');
      } else {
        throw err;
      }
    });
    console.log('  - Table jeu_eans creee');

    // ========================================
    // 2. Ajout des index
    // ========================================

    console.log('\n2. Ajout des index...');

    await queryInterface.addIndex('jeu_eans', ['jeu_id'], {
      name: 'idx_jeu_eans_jeu_id'
    }).catch(() => console.log('  - Index idx_jeu_eans_jeu_id existe deja'));

    await queryInterface.addIndex('jeu_eans', ['ean'], {
      name: 'idx_jeu_eans_ean',
      unique: true
    }).catch(() => console.log('  - Index idx_jeu_eans_ean existe deja'));

    console.log('  - Index crees');

    // ========================================
    // 3. Migration des EAN existants
    // ========================================

    console.log('\n3. Migration des EAN existants depuis jeux.ean...');

    // Recuperer tous les jeux avec un EAN
    const [jeux] = await sequelize.query(`
      SELECT id, ean FROM jeux
      WHERE ean IS NOT NULL AND ean != '' AND ean NOT LIKE '%,%'
    `);

    console.log(`  - ${jeux.length} jeux avec EAN simple a migrer`);

    let migrated = 0;
    let errors = 0;

    for (const jeu of jeux) {
      try {
        // Verifier que l'EAN n'existe pas deja
        const [existing] = await sequelize.query(`
          SELECT id FROM jeu_eans WHERE ean = ?
        `, { replacements: [jeu.ean.trim()] });

        if (existing.length === 0) {
          await sequelize.query(`
            INSERT INTO jeu_eans (jeu_id, ean, principal, source, created_at)
            VALUES (?, ?, TRUE, 'import', NOW())
          `, { replacements: [jeu.id, jeu.ean.trim()] });
          migrated++;
        }
      } catch (err) {
        errors++;
        console.error(`  - Erreur jeu ${jeu.id}: ${err.message}`);
      }
    }

    console.log(`  - ${migrated} EAN migres, ${errors} erreurs`);

    // Migrer les EAN multiples (contenant des virgules)
    const [jeuxMulti] = await sequelize.query(`
      SELECT id, ean FROM jeux
      WHERE ean IS NOT NULL AND ean LIKE '%,%'
    `);

    console.log(`\n  - ${jeuxMulti.length} jeux avec EAN multiples a migrer`);

    let multiMigrated = 0;

    for (const jeu of jeuxMulti) {
      const eans = jeu.ean.split(',').map(e => e.trim()).filter(e => e.length >= 8);

      for (let i = 0; i < eans.length; i++) {
        try {
          // Verifier que l'EAN n'existe pas deja
          const [existing] = await sequelize.query(`
            SELECT id FROM jeu_eans WHERE ean = ?
          `, { replacements: [eans[i]] });

          if (existing.length === 0) {
            await sequelize.query(`
              INSERT INTO jeu_eans (jeu_id, ean, principal, source, created_at)
              VALUES (?, ?, ?, 'import', NOW())
            `, { replacements: [jeu.id, eans[i], i === 0] });
            multiMigrated++;
          }
        } catch (err) {
          console.error(`  - Erreur jeu ${jeu.id} EAN ${eans[i]}: ${err.message}`);
        }
      }

      // Mettre a jour jeux.ean avec le premier EAN seulement
      if (eans.length > 0) {
        await sequelize.query(`
          UPDATE jeux SET ean = ? WHERE id = ?
        `, { replacements: [eans[0], jeu.id] });
      }
    }

    console.log(`  - ${multiMigrated} EAN alternatifs migres`);

    // ========================================
    // 4. Resume
    // ========================================

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN principal = 1 THEN 1 ELSE 0 END) as principaux
      FROM jeu_eans
    `);

    console.log('\n=== Migration terminee ===');
    console.log(`Total EAN dans jeu_eans: ${stats[0].total}`);
    console.log(`EAN principaux: ${stats[0].principaux}`);
    console.log(`EAN alternatifs: ${stats[0].total - stats[0].principaux}`);

  } catch (error) {
    console.error('\nErreur lors de la migration:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Lancer la migration
migrate()
  .then(() => {
    console.log('\nMigration executee avec succes');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nErreur:', err.message);
    process.exit(1);
  });
