/**
 * Migration: Relations Familiales
 * Ajoute les champs pour lier les utilisateurs en famille (parent/tuteur - enfant)
 *
 * Format compatible avec le migration runner (database/migrate.js)
 */

module.exports = {
  up: async (connection) => {
    // Verifier si les colonnes existent deja
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs'
      AND COLUMN_NAME IN ('utilisateur_parent_id', 'type_lien_famille', 'date_lien_famille', 'est_compte_enfant')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    // Ajouter utilisateur_parent_id
    if (!existingColumns.includes('utilisateur_parent_id')) {
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN utilisateur_parent_id INT NULL
        COMMENT 'ID du parent/tuteur responsable'
      `);
      console.log('    Colonne utilisateur_parent_id ajoutee');

      // Ajouter la FK
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD CONSTRAINT fk_utilisateur_parent
        FOREIGN KEY (utilisateur_parent_id) REFERENCES utilisateurs(id)
        ON DELETE SET NULL
      `);
      console.log('    Foreign key fk_utilisateur_parent ajoutee');
    }

    // Ajouter type_lien_famille
    if (!existingColumns.includes('type_lien_famille')) {
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN type_lien_famille ENUM('parent', 'tuteur', 'autre') NULL
        COMMENT 'Type de lien avec le responsable'
      `);
      console.log('    Colonne type_lien_famille ajoutee');
    }

    // Ajouter date_lien_famille
    if (!existingColumns.includes('date_lien_famille')) {
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN date_lien_famille DATETIME NULL
        COMMENT 'Date de creation du lien familial'
      `);
      console.log('    Colonne date_lien_famille ajoutee');
    }

    // Ajouter est_compte_enfant
    if (!existingColumns.includes('est_compte_enfant')) {
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN est_compte_enfant TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Indique si c est un compte enfant rattache a un parent'
      `);
      console.log('    Colonne est_compte_enfant ajoutee');
    }

    // Ajouter index sur utilisateur_parent_id (si pas deja cree via FK)
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs'
      AND COLUMN_NAME = 'utilisateur_parent_id'
    `);

    if (indexes.length === 0) {
      await connection.query(`
        CREATE INDEX idx_utilisateurs_parent ON utilisateurs (utilisateur_parent_id)
      `);
      console.log('    Index idx_utilisateurs_parent ajoute');
    }

    console.log('    Migration addRelationsFamiliales terminee');
  },

  down: async (connection) => {
    // Supprimer la FK
    try {
      await connection.query(`
        ALTER TABLE utilisateurs DROP FOREIGN KEY fk_utilisateur_parent
      `);
      console.log('    Foreign key fk_utilisateur_parent supprimee');
    } catch (e) {
      console.log('    FK fk_utilisateur_parent n\'existe pas');
    }

    // Supprimer les colonnes
    const columnsToRemove = ['utilisateur_parent_id', 'type_lien_famille', 'date_lien_famille', 'est_compte_enfant'];

    for (const col of columnsToRemove) {
      try {
        await connection.query(`ALTER TABLE utilisateurs DROP COLUMN ${col}`);
        console.log(`    Colonne ${col} supprimee`);
      } catch (e) {
        console.log(`    Colonne ${col} n'existe pas`);
      }
    }

    console.log('    Rollback addRelationsFamiliales termine');
  }
};
