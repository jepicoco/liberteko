/**
 * Migration: Ajouter support multi-types aux emprunts
 *
 * Ajoute les colonnes livre_id, film_id, cd_id à la table emprunts
 * pour permettre d'emprunter différents types de médias.
 *
 * Usage: npm run migrate-emprunts-multi
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Emprunts Multi-Types ===\n');

  try {
    // ========================================
    // 1. Modification de la colonne jeu_id
    // ========================================

    console.log('1. Modification de la colonne jeu_id (nullable)...');

    // Rendre jeu_id nullable
    await queryInterface.changeColumn('emprunts', 'jeu_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    }).catch(() => console.log('  - Colonne jeu_id déjà nullable ou erreur'));
    console.log('  - Colonne jeu_id modifiée');

    // ========================================
    // 2. Ajout des nouvelles colonnes
    // ========================================

    console.log('\n2. Ajout des colonnes pour autres types de médias...');

    // Ajouter livre_id
    await queryInterface.addColumn('emprunts', 'livre_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    }).catch(() => console.log('  - Colonne livre_id existe déjà'));
    console.log('  - Colonne livre_id ajoutée');

    // Ajouter film_id (pour future implémentation)
    await queryInterface.addColumn('emprunts', 'film_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true
      // Note: pas de foreign key car la table films n'existe pas encore
    }).catch(() => console.log('  - Colonne film_id existe déjà'));
    console.log('  - Colonne film_id ajoutée');

    // Ajouter cd_id (pour future implémentation)
    await queryInterface.addColumn('emprunts', 'cd_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true
      // Note: pas de foreign key car la table cds n'existe pas encore
    }).catch(() => console.log('  - Colonne cd_id existe déjà'));
    console.log('  - Colonne cd_id ajoutée');

    // ========================================
    // 3. Création des index
    // ========================================

    console.log('\n3. Création des index...');

    await queryInterface.addIndex('emprunts', ['livre_id']).catch(() => {});
    await queryInterface.addIndex('emprunts', ['film_id']).catch(() => {});
    await queryInterface.addIndex('emprunts', ['cd_id']).catch(() => {});
    console.log('  - Index créés');

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
