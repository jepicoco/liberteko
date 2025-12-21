/**
 * Migration: Cotisation Reductions
 * Table pour stocker les réductions appliquées à chaque cotisation
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Cotisation Reductions ===');

  // Vérifier si la table existe déjà
  const tables = await queryInterface.showAllTables();
  if (tables.includes('cotisation_reductions')) {
    console.log('Table cotisation_reductions existe déjà, migration ignorée.');
    return;
  }

  // Vérifier les tables de dépendance
  const hasReglesReduction = tables.includes('regles_reduction');
  const hasSectionsAnalytiques = tables.includes('sections_analytiques');
  const hasRegroupementsAnalytiques = tables.includes('regroupements_analytiques');

  if (!hasReglesReduction) {
    console.log('Table regles_reduction n\'existe pas - migration ignoree (sera creee par addRegleReduction)');
    return;
  }

  // Créer la table cotisation_reductions
  await queryInterface.createTable('cotisation_reductions', {
    id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cotisation_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cotisations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Cotisation concernée'
    },
    regle_reduction_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'regles_reduction',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Règle de réduction appliquée (null si manuelle)'
    },
    type_source: {
      type: sequelize.Sequelize.DataTypes.ENUM(
        'commune', 'quotient_familial', 'statut_social', 'multi_enfants',
        'fidelite', 'partenariat', 'handicap', 'age', 'manuel', 'code_reduction'
      ),
      allowNull: false,
      comment: 'Source de la réduction'
    },
    libelle: {
      type: sequelize.Sequelize.DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé affiché (ex: "Réduction QF 0-400")'
    },
    type_calcul: {
      type: sequelize.Sequelize.DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      comment: 'Type de calcul'
    },
    valeur: {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valeur de la réduction (montant ou pourcentage)'
    },
    montant_reduction: {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant effectif de la réduction en euros'
    },
    ordre_application: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre dans lequel la réduction a été appliquée'
    },
    base_calcul: {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Montant sur lequel la réduction a été calculée'
    },
    // Contexte de la réduction (pour traçabilité)
    contexte_json: {
      type: sequelize.Sequelize.DataTypes.JSON,
      allowNull: true,
      comment: 'Données contextuelles (QF utilisé, commune, etc.)'
    },
    // Comptabilité analytique (FK ajoutées si tables existent)
    section_analytique_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Section analytique pour la réduction'
    },
    regroupement_analytique_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Regroupement analytique pour la réduction'
    },
    created_at: {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  console.log('Table cotisation_reductions créée');

  // Index
  await queryInterface.addIndex('cotisation_reductions', ['cotisation_id']);
  await queryInterface.addIndex('cotisation_reductions', ['regle_reduction_id']);
  await queryInterface.addIndex('cotisation_reductions', ['type_source']);

  console.log('Index créés');

  // Ajouter les FK conditionnelles pour les tables analytiques
  if (hasSectionsAnalytiques) {
    try {
      await queryInterface.addConstraint('cotisation_reductions', {
        fields: ['section_analytique_id'],
        type: 'foreign key',
        name: 'fk_cotisation_reductions_section',
        references: { table: 'sections_analytiques', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('FK section_analytique_id ajoutée');
    } catch (e) {
      console.log('FK section_analytique_id non ajoutée:', e.message);
    }
  }

  if (hasRegroupementsAnalytiques) {
    try {
      await queryInterface.addConstraint('cotisation_reductions', {
        fields: ['regroupement_analytique_id'],
        type: 'foreign key',
        name: 'fk_cotisation_reductions_regroupement',
        references: { table: 'regroupements_analytiques', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('FK regroupement_analytique_id ajoutée');
    } catch (e) {
      console.log('FK regroupement_analytique_id non ajoutée:', e.message);
    }
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('cotisation_reductions');
  console.log('Table cotisation_reductions supprimée');
}

module.exports = { up, down };
