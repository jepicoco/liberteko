/**
 * Migration: Add TAG condition type for decision trees
 * Adds TAG as new type (keeps STATUT_SOCIAL for retrocompatibility)
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la table types_condition_tarif existe
  const tables = await queryInterface.showAllTables();
  const tableList = tables.map(t => typeof t === 'string' ? t : t.tableName || t.Tables_in_liberteko || Object.values(t)[0]);

  if (!tableList.includes('types_condition_tarif')) {
    console.log('Table types_condition_tarif non trouvee - migration ignoree');
    return;
  }

  // Verifier si TAG existe deja
  const [existing] = await sequelize.query(
    "SELECT id FROM types_condition_tarif WHERE code = 'TAG'",
    { type: sequelize.QueryTypes.SELECT }
  );

  if (existing) {
    console.log('Type TAG existe deja - migration ignoree');
    return;
  }

  // Ajouter le type TAG
  await queryInterface.bulkInsert('types_condition_tarif', [{
    code: 'TAG',
    libelle: 'Tag utilisateur',
    description: 'Condition basee sur les tags assignes a l\'utilisateur',
    icone: 'bi-tags',
    couleur: '#dc3545',
    config_schema: JSON.stringify({
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['contient', 'ne_contient_pas'],
          description: 'Mode de verification du tag'
        },
        tags: {
          type: 'array',
          items: { type: 'integer' },
          description: 'IDs des tags a verifier'
        }
      }
    }),
    ordre_affichage: 60,
    actif: true,
    created_at: new Date(),
    updated_at: new Date()
  }]);

  // Ajouter l'operation comptable pour les reductions TAG
  if (tableList.includes('operations_comptables_reduction')) {
    const [existingOp] = await sequelize.query(
      "SELECT id FROM operations_comptables_reduction WHERE code = 'REDUC_TAG'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!existingOp) {
      await queryInterface.bulkInsert('operations_comptables_reduction', [{
        code: 'REDUC_TAG',
        libelle: 'Reduction tag utilisateur',
        description: 'Reduction accordee selon les tags de l\'utilisateur',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  }

  // Optionnel: Desactiver STATUT_SOCIAL si on veut forcer la migration vers TAG
  // await sequelize.query(
  //   "UPDATE types_condition_tarif SET actif = false WHERE code = 'STATUT_SOCIAL'"
  // );

  console.log('Type TAG ajoute avec succes');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer le type TAG
  await sequelize.query(
    "DELETE FROM types_condition_tarif WHERE code = 'TAG'"
  );

  // Supprimer l'operation comptable
  await sequelize.query(
    "DELETE FROM operations_comptables_reduction WHERE code = 'REDUC_TAG'"
  );

  console.log('Type TAG supprime');
}

module.exports = { up, down };
