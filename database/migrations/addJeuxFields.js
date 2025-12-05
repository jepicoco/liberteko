/**
 * Migration: Ajouter les nouveaux champs au modele Jeu
 * Compatible avec l'import MyLudo CSV
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
    logging: console.log
  }
);

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connexion a la base de donnees etablie.');

    // Liste des colonnes a ajouter
    const columnsToAdd = [
      // Identifiants
      { name: 'id_externe', type: 'INT', after: 'code_barre' },
      { name: 'ean', type: 'VARCHAR(20)', after: 'id_externe' },

      // Informations de base
      { name: 'sous_titre', type: 'VARCHAR(255)', after: 'titre' },
      { name: 'type_jeu', type: "ENUM('basegame', 'extension', 'standalone', 'accessoire')", default: "'basegame'", after: 'sous_titre' },
      { name: 'illustrateur', type: 'VARCHAR(255)', after: 'auteur' },

      // Multi-valeurs
      { name: 'langues', type: 'VARCHAR(255)', after: 'duree_partie' },
      { name: 'categories', type: 'TEXT', after: 'langues' },
      { name: 'themes', type: 'TEXT', after: 'categories' },
      { name: 'mecanismes', type: 'TEXT', after: 'themes' },
      { name: 'univers', type: 'VARCHAR(255)', after: 'mecanismes' },
      { name: 'gamme', type: 'VARCHAR(255)', after: 'univers' },

      // Physique
      { name: 'dimensions', type: 'VARCHAR(100)', after: 'gamme' },
      { name: 'poids', type: 'VARCHAR(50)', after: 'dimensions' },

      // Prix
      { name: 'prix_indicatif', type: 'DECIMAL(10,2)', after: 'poids' },
      { name: 'gratuit', type: 'TINYINT(1)', default: '0', after: 'prix_achat' },

      // Gestion
      { name: 'etat', type: "ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais')", after: 'statut' },
      { name: 'proprietaire', type: 'VARCHAR(100)', after: 'date_acquisition' },
      { name: 'cadeau', type: 'TINYINT(1)', default: '0', after: 'proprietaire' },

      // Flags
      { name: 'prive', type: 'TINYINT(1)', default: '0', after: 'cadeau' },
      { name: 'protege', type: 'TINYINT(1)', default: '0', after: 'prive' },
      { name: 'organise', type: 'TINYINT(1)', default: '0', after: 'protege' },
      { name: 'personnalise', type: 'TINYINT(1)', default: '0', after: 'organise' },
      { name: 'figurines_peintes', type: 'TINYINT(1)', default: '0', after: 'personnalise' },

      // References
      { name: 'reference', type: 'VARCHAR(100)', after: 'notes' },
      { name: 'referent', type: 'VARCHAR(100)', after: 'reference' },

      // Stats
      { name: 'derniere_partie', type: 'DATE', after: 'image_url' },
      { name: 'nb_emprunts', type: 'INT', default: '0', after: 'derniere_partie' }
    ];

    // Verifier quelles colonnes existent deja
    const [existingColumns] = await sequelize.query(`SHOW COLUMNS FROM jeux`);
    const existingColumnNames = existingColumns.map(col => col.Field);

    console.log('\nColonnes existantes:', existingColumnNames.join(', '));

    // Ajouter les colonnes manquantes
    for (const col of columnsToAdd) {
      if (!existingColumnNames.includes(col.name)) {
        let sql = `ALTER TABLE jeux ADD COLUMN ${col.name} ${col.type}`;
        if (col.default !== undefined) {
          sql += ` DEFAULT ${col.default}`;
        }
        if (col.after) {
          sql += ` AFTER ${col.after}`;
        }

        try {
          await sequelize.query(sql);
          console.log(`✅ Colonne ajoutee: ${col.name}`);
        } catch (err) {
          // Si la colonne "after" n'existe pas, essayer sans
          if (err.message.includes('Unknown column')) {
            sql = `ALTER TABLE jeux ADD COLUMN ${col.name} ${col.type}`;
            if (col.default !== undefined) {
              sql += ` DEFAULT ${col.default}`;
            }
            await sequelize.query(sql);
            console.log(`✅ Colonne ajoutee (fin de table): ${col.name}`);
          } else {
            throw err;
          }
        }
      } else {
        console.log(`⏭️  Colonne existe deja: ${col.name}`);
      }
    }

    // Renommer 'categorie' en 'categories' si necessaire (ancien champ)
    if (existingColumnNames.includes('categorie') && !existingColumnNames.includes('categories')) {
      // Migrer les donnees de categorie vers categories
      await sequelize.query(`UPDATE jeux SET categories = categorie WHERE categorie IS NOT NULL`);
      console.log('✅ Donnees migrees de categorie vers categories');

      // Supprimer l'ancienne colonne
      await sequelize.query(`ALTER TABLE jeux DROP COLUMN categorie`);
      console.log('✅ Ancienne colonne categorie supprimee');
    }

    // Modifier l'ENUM statut pour ajouter 'archive' si pas present
    try {
      await sequelize.query(`ALTER TABLE jeux MODIFY COLUMN statut ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive') NOT NULL DEFAULT 'disponible'`);
      console.log('✅ ENUM statut mis a jour');
    } catch (err) {
      console.log('⏭️  ENUM statut deja a jour ou erreur:', err.message);
    }

    console.log('\n✅ Migration terminee avec succes!');

  } catch (error) {
    console.error('❌ Erreur de migration:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executer si appele directement
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
