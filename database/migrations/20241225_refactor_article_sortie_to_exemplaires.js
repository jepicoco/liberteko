/**
 * Migration: Refactoring ArticleSortie pour utiliser les exemplaires
 *
 * Ajoute les colonnes pour referencer les exemplaires au lieu des articles:
 * - type_exemplaire: le type d'exemplaire (jeu, livre, film, disque)
 * - exemplaire_id: l'ID de l'exemplaire specifique
 * - article_id_backup: sauvegarde de article_id pour rollback
 *
 * Migre les donnees existantes en trouvant l'exemplaire #1 de chaque article.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier que la table existe
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('articles_sortie')) {
    console.log('Table articles_sortie n\'existe pas, skip');
    return;
  }

  // Verifier si les colonnes existent deja
  const [columns] = await sequelize.query('SHOW COLUMNS FROM articles_sortie');
  const columnNames = columns.map(c => c.Field);

  // Ajouter type_exemplaire si n'existe pas
  if (!columnNames.includes('type_exemplaire')) {
    await sequelize.query(`
      ALTER TABLE articles_sortie
      ADD COLUMN type_exemplaire ENUM('jeu','livre','film','disque') NULL AFTER type_article
    `);
    console.log('Colonne type_exemplaire ajoutee');
  }

  // Ajouter exemplaire_id si n'existe pas
  if (!columnNames.includes('exemplaire_id')) {
    await sequelize.query(`
      ALTER TABLE articles_sortie
      ADD COLUMN exemplaire_id INT NULL AFTER article_id
    `);
    console.log('Colonne exemplaire_id ajoutee');
  }

  // Ajouter article_id_backup si n'existe pas
  if (!columnNames.includes('article_id_backup')) {
    await sequelize.query(`
      ALTER TABLE articles_sortie
      ADD COLUMN article_id_backup INT NULL COMMENT 'Backup de article_id pour rollback'
    `);
    console.log('Colonne article_id_backup ajoutee');
  }

  // Migrer les donnees existantes - pour chaque article_sortie, trouver l'exemplaire #1
  const EXEMPLAIRE_TABLES = {
    jeu: { table: 'exemplaires_jeux', fk: 'jeu_id' },
    livre: { table: 'exemplaires_livres', fk: 'livre_id' },
    film: { table: 'exemplaires_films', fk: 'film_id' },
    disque: { table: 'exemplaires_disques', fk: 'disque_id' }
  };

  for (const [type, config] of Object.entries(EXEMPLAIRE_TABLES)) {
    // Verifier si la table d'exemplaires existe
    if (!tables.includes(config.table)) {
      console.log(`Table ${config.table} n'existe pas, skip migration des donnees`);
      continue;
    }

    // Migrer les ArticleSortie de ce type
    await sequelize.query(`
      UPDATE articles_sortie AS2
      INNER JOIN ${config.table} ex ON ex.${config.fk} = AS2.article_id AND ex.numero_exemplaire = 1
      SET
        AS2.type_exemplaire = '${type}',
        AS2.exemplaire_id = ex.id,
        AS2.article_id_backup = AS2.article_id
      WHERE AS2.type_article = '${type}'
        AND AS2.type_exemplaire IS NULL
    `);

    const [result] = await sequelize.query(`
      SELECT COUNT(*) as count FROM articles_sortie
      WHERE type_article = '${type}' AND type_exemplaire IS NOT NULL
    `);
    console.log(`${type}: ${result[0].count} ArticleSortie migres vers exemplaires`);
  }

  // Creer un index sur les nouvelles colonnes
  try {
    await sequelize.query(`
      CREATE INDEX idx_article_sortie_exemplaire ON articles_sortie(type_exemplaire, exemplaire_id)
    `);
    console.log('Index idx_article_sortie_exemplaire cree');
  } catch (e) {
    if (e.message.includes('Duplicate key name')) {
      console.log('Index idx_article_sortie_exemplaire existe deja');
    } else {
      throw e;
    }
  }

  console.log('Migration 20241225_refactor_article_sortie_to_exemplaires terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tables = await queryInterface.showAllTables();
  if (!tables.includes('articles_sortie')) return;

  // Restaurer article_id depuis backup
  await sequelize.query(`
    UPDATE articles_sortie
    SET article_id = article_id_backup
    WHERE article_id_backup IS NOT NULL
  `);
  console.log('article_id restaure depuis backup');

  // Supprimer l'index
  try {
    await sequelize.query('DROP INDEX idx_article_sortie_exemplaire ON articles_sortie');
  } catch (e) {
    // Index n'existe peut-etre pas
  }

  // Supprimer les colonnes
  const [columns] = await sequelize.query('SHOW COLUMNS FROM articles_sortie');
  const columnNames = columns.map(c => c.Field);

  if (columnNames.includes('article_id_backup')) {
    await sequelize.query('ALTER TABLE articles_sortie DROP COLUMN article_id_backup');
  }
  if (columnNames.includes('exemplaire_id')) {
    await sequelize.query('ALTER TABLE articles_sortie DROP COLUMN exemplaire_id');
  }
  if (columnNames.includes('type_exemplaire')) {
    await sequelize.query('ALTER TABLE articles_sortie DROP COLUMN type_exemplaire');
  }

  console.log('Rollback 20241225_refactor_article_sortie_to_exemplaires termine');
}

module.exports = { up, down };
