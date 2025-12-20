/**
 * Migration: Ajout de structure_id aux tables de collections
 *
 * Ajoute le champ structure_id a jeux, livres, films, disques
 * pour permettre le filtrage par structure.
 *
 * Note: Les donnees existantes auront structure_id = NULL
 * ce qui signifie "accessible par toutes les structures".
 * Un script ulterieur pourra assigner une structure par defaut.
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = ['jeux', 'livres', 'films', 'disques'];

  console.log('=== Ajout de structure_id aux tables collections ===\n');

  for (const table of tables) {
    try {
      // Verifier si la table existe
      const allTables = await queryInterface.showAllTables();
      if (!allTables.includes(table)) {
        console.log(`Table ${table} n'existe pas, skip`);
        continue;
      }

      // Verifier si la colonne existe deja
      const columns = await queryInterface.describeTable(table);

      if (columns.structure_id) {
        console.log(`${table}.structure_id existe deja, skip`);
      } else {
        await queryInterface.addColumn(table, 'structure_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'structures',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'FK vers la structure proprietaire (NULL = toutes structures)'
        });
        console.log(`${table}.structure_id ajoute avec succes`);

        // Ajouter un index pour optimiser les requetes par structure
        await queryInterface.addIndex(table, ['structure_id'], {
          name: `idx_${table}_structure_id`
        });
        console.log(`Index idx_${table}_structure_id cree`);
      }
    } catch (error) {
      console.error(`Erreur sur table ${table}:`, error.message);
    }
  }

  console.log('\n=== Migration terminee ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = ['jeux', 'livres', 'films', 'disques'];

  console.log('=== Suppression de structure_id des tables collections ===\n');

  for (const table of tables) {
    try {
      const allTables = await queryInterface.showAllTables();
      if (!allTables.includes(table)) {
        continue;
      }

      const columns = await queryInterface.describeTable(table);

      if (columns.structure_id) {
        // Supprimer l'index d'abord
        try {
          await queryInterface.removeIndex(table, `idx_${table}_structure_id`);
          console.log(`Index idx_${table}_structure_id supprime`);
        } catch (e) {
          console.log(`Index idx_${table}_structure_id n'existe pas`);
        }

        await queryInterface.removeColumn(table, 'structure_id');
        console.log(`${table}.structure_id supprime`);
      }
    } catch (error) {
      console.error(`Erreur sur table ${table}:`, error.message);
    }
  }

  console.log('\n=== Rollback termine ===');
}

module.exports = { up, down };
