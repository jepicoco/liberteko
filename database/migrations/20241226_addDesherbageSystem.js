/**
 * Migration: Systeme de desherbage ameliore
 *
 * - Table types_sortie: Types de sortie configurables (rebus, don, vente)
 * - Table lots_sortie: Regroupement d'articles pour sortie
 * - Table articles_sortie: Liaison polymorphique lot-articles
 * - Colonnes lot_sortie_id et date_sortie sur jeux/livres/films/disques
 * - Statut 'sorti' ajoute aux ENUMs
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
    // ============================================
    // 1. Table types_sortie
    // ============================================
    console.log('Creating table types_sortie...');

    const [typesSortieExists] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'types_sortie'",
      [process.env.DB_NAME]
    );

    if (typesSortieExists[0].cnt === 0) {
      await connection.query(`
        CREATE TABLE types_sortie (
          id INT PRIMARY KEY AUTO_INCREMENT,
          code VARCHAR(20) NOT NULL UNIQUE,
          libelle VARCHAR(100) NOT NULL,
          description TEXT,
          compte_sortie VARCHAR(20) COMMENT 'Compte comptable pour cette sortie',
          journal_code VARCHAR(10) DEFAULT 'OD',
          prefixe_piece VARCHAR(10) DEFAULT 'SOR',
          generer_ecritures TINYINT(1) DEFAULT 1,
          couleur VARCHAR(7) DEFAULT '#6c757d',
          icone VARCHAR(50) DEFAULT 'box-arrow-right',
          ordre_affichage INT DEFAULT 0,
          actif TINYINT(1) DEFAULT 1,
          structure_id INT NULL COMMENT 'NULL = tous structures',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_actif (actif),
          INDEX idx_structure (structure_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Table types_sortie creee');

      // Seed types par defaut
      await connection.query(`
        INSERT INTO types_sortie (code, libelle, description, compte_sortie, journal_code, prefixe_piece, couleur, icone, ordre_affichage) VALUES
        ('rebus', 'Mise au rebut', 'Article deteriore ou obsolete, destine a la destruction', '6571', 'OD', 'REB', '#dc3545', 'trash', 1),
        ('don', 'Don', 'Article donne a une organisation ou particulier', '6713', 'OD', 'DON', '#28a745', 'gift', 2),
        ('vente', 'Vente', 'Article vendu', '7542', 'VT', 'VEN', '#007bff', 'currency-euro', 3)
      `);
      console.log('  ✓ Types par defaut inseres (rebus, don, vente)');
    } else {
      console.log('  ⚠ Table types_sortie existe deja');
    }

    // ============================================
    // 2. Table lots_sortie
    // ============================================
    console.log('Creating table lots_sortie...');

    const [lotsSortieExists] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'lots_sortie'",
      [process.env.DB_NAME]
    );

    if (lotsSortieExists[0].cnt === 0) {
      await connection.query(`
        CREATE TABLE lots_sortie (
          id INT PRIMARY KEY AUTO_INCREMENT,
          numero VARCHAR(30) NOT NULL UNIQUE COMMENT 'Format: LOT-YYYY-NNNN',
          type_sortie_id INT NOT NULL,
          structure_id INT NULL,
          date_sortie DATE NOT NULL,
          destination TEXT COMMENT 'Beneficiaire, acheteur, lieu de depot',
          commentaire TEXT,
          valeur_totale DECIMAL(12,2) DEFAULT 0 COMMENT 'Somme des valeurs des articles',
          nb_articles INT DEFAULT 0,
          statut ENUM('brouillon','valide','exporte','annule') DEFAULT 'brouillon',
          date_export_comptable DATETIME NULL,
          numero_piece_comptable VARCHAR(50) NULL,
          cree_par INT NULL,
          valide_par INT NULL,
          date_validation DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_numero (numero),
          INDEX idx_statut (statut),
          INDEX idx_date_sortie (date_sortie),
          INDEX idx_structure (structure_id),
          INDEX idx_type (type_sortie_id),
          CONSTRAINT fk_lots_sortie_type FOREIGN KEY (type_sortie_id)
            REFERENCES types_sortie(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT fk_lots_sortie_structure FOREIGN KEY (structure_id)
            REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_lots_sortie_createur FOREIGN KEY (cree_par)
            REFERENCES utilisateurs(id) ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_lots_sortie_validateur FOREIGN KEY (valide_par)
            REFERENCES utilisateurs(id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Table lots_sortie creee');
    } else {
      console.log('  ⚠ Table lots_sortie existe deja');
    }

    // ============================================
    // 3. Table articles_sortie
    // ============================================
    console.log('Creating table articles_sortie...');

    const [articlesSortieExists] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'articles_sortie'",
      [process.env.DB_NAME]
    );

    if (articlesSortieExists[0].cnt === 0) {
      await connection.query(`
        CREATE TABLE articles_sortie (
          id INT PRIMARY KEY AUTO_INCREMENT,
          lot_sortie_id INT NOT NULL,
          type_article ENUM('jeu','livre','film','disque') NOT NULL,
          article_id INT NOT NULL COMMENT 'ID dans la table correspondante',
          valeur DECIMAL(10,2) DEFAULT 0 COMMENT 'Valeur au moment de la sortie',
          etat_avant_sortie VARCHAR(50) COMMENT 'Etat physique avant sortie',
          statut_precedent VARCHAR(50) COMMENT 'Statut pour restauration',
          notes TEXT,
          annule TINYINT(1) DEFAULT 0,
          date_annulation DATETIME NULL,
          annule_par INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_lot (lot_sortie_id),
          INDEX idx_article (type_article, article_id),
          INDEX idx_annule (annule),
          CONSTRAINT fk_articles_sortie_lot FOREIGN KEY (lot_sortie_id)
            REFERENCES lots_sortie(id) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_articles_sortie_annuleur FOREIGN KEY (annule_par)
            REFERENCES utilisateurs(id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Table articles_sortie creee');
    } else {
      console.log('  ⚠ Table articles_sortie existe deja');
    }

    // ============================================
    // 4. Ajouter colonnes sur tables articles
    // ============================================
    console.log('Adding columns to article tables...');

    const tables = ['jeux', 'livres', 'films', 'disques'];

    for (const table of tables) {
      // Colonne lot_sortie_id
      const [lotCol] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'lot_sortie_id'`
      );
      if (lotCol.length === 0) {
        await connection.query(`
          ALTER TABLE ${table}
          ADD COLUMN lot_sortie_id INT NULL COMMENT 'Reference au lot de sortie'
        `);
        console.log(`  ✓ ${table}: colonne lot_sortie_id ajoutee`);
      }

      // Colonne date_sortie
      const [dateCol] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'date_sortie'`
      );
      if (dateCol.length === 0) {
        await connection.query(`
          ALTER TABLE ${table}
          ADD COLUMN date_sortie DATE NULL COMMENT 'Date de sortie du stock'
        `);
        console.log(`  ✓ ${table}: colonne date_sortie ajoutee`);
      }

      // Index sur lot_sortie_id
      const [idxExists] = await connection.query(`
        SELECT COUNT(*) as cnt FROM information_schema.statistics
        WHERE table_schema = ? AND table_name = ? AND index_name = 'idx_lot_sortie'
      `, [process.env.DB_NAME, table]);

      if (idxExists[0].cnt === 0) {
        await connection.query(`
          ALTER TABLE ${table} ADD INDEX idx_lot_sortie (lot_sortie_id)
        `);
        console.log(`  ✓ ${table}: index idx_lot_sortie ajoute`);
      }
    }

    // ============================================
    // 5. Ajouter statut 'sorti' aux ENUMs
    // ============================================
    console.log('Adding "sorti" status to article tables...');

    // Nouveau ENUM avec 'sorti' ajoute
    const newEnum = "'disponible', 'emprunte', 'reserve', 'en_controle', 'en_reparation', 'indisponible', 'maintenance', 'perdu', 'archive', 'sorti'";

    for (const table of tables) {
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'statut'`
      );

      if (columns.length > 0) {
        const currentType = columns[0].Type;

        // Verifier si 'sorti' est deja dans l'enum
        if (!currentType.includes("'sorti'")) {
          await connection.query(`
            ALTER TABLE ${table}
            MODIFY COLUMN statut ENUM(${newEnum}) NOT NULL DEFAULT 'disponible'
          `);
          console.log(`  ✓ ${table}: statut 'sorti' ajoute a l'enum`);
        } else {
          console.log(`  ⚠ ${table}: statut 'sorti' existe deja`);
        }
      }
    }

    // ============================================
    // 6. Table compteur pour numeros de lots
    // ============================================
    console.log('Checking compteur for lot numbers...');

    // Verifier si le type 'LOT' existe dans compteurs_piece
    const [compteurExists] = await connection.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'compteurs_piece'",
      [process.env.DB_NAME]
    );

    if (compteurExists[0].cnt > 0) {
      const [lotCompteur] = await connection.query(
        "SELECT COUNT(*) as cnt FROM compteurs_piece WHERE type_piece = 'LOT'"
      );
      if (lotCompteur[0].cnt === 0) {
        const currentYear = new Date().getFullYear();
        await connection.query(`
          INSERT INTO compteurs_piece (type_piece, exercice, dernier_numero, prefixe)
          VALUES ('LOT', ?, 0, 'LOT')
        `, [currentYear]);
        console.log('  ✓ Compteur LOT initialise');
      }
    }

    console.log('Migration completed successfully!');

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
    console.log('Reverting desherbage system...');

    // 1. Remettre les articles sortis en disponible
    const tables = ['jeux', 'livres', 'films', 'disques'];
    for (const table of tables) {
      await connection.query(`
        UPDATE ${table} SET statut = 'disponible', lot_sortie_id = NULL, date_sortie = NULL
        WHERE statut = 'sorti'
      `);
    }

    // 2. Supprimer les colonnes ajoutees
    for (const table of tables) {
      const [lotCol] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'lot_sortie_id'`
      );
      if (lotCol.length > 0) {
        // Supprimer l'index d'abord
        try {
          await connection.query(`ALTER TABLE ${table} DROP INDEX idx_lot_sortie`);
        } catch (e) { /* ignore */ }
        await connection.query(`ALTER TABLE ${table} DROP COLUMN lot_sortie_id`);
      }

      const [dateCol] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'date_sortie'`
      );
      if (dateCol.length > 0) {
        await connection.query(`ALTER TABLE ${table} DROP COLUMN date_sortie`);
      }

      // Remettre l'ancien ENUM sans 'sorti'
      const oldEnum = "'disponible', 'emprunte', 'reserve', 'en_controle', 'en_reparation', 'indisponible', 'maintenance', 'perdu', 'archive'";
      await connection.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN statut ENUM(${oldEnum}) NOT NULL DEFAULT 'disponible'
      `);
    }

    // 3. Supprimer les tables dans l'ordre inverse (FK)
    await connection.query('DROP TABLE IF EXISTS articles_sortie');
    await connection.query('DROP TABLE IF EXISTS lots_sortie');
    await connection.query('DROP TABLE IF EXISTS types_sortie');

    // 4. Supprimer le compteur LOT
    await connection.query("DELETE FROM compteurs_piece WHERE type_piece = 'LOT'");

    console.log('Rollback completed successfully!');

  } finally {
    await connection.end();
  }
}

module.exports = { up, down };
