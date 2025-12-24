/**
 * Migration: Ajout des options d'emprunt par structure
 *
 * Ajoute les champs pour controler si cotisation/adhesion sont obligatoires
 * pour emprunter dans cette structure
 */

async function up(connection) {
  console.log('  Ajout des options d\'emprunt dans structures...');

  // Verifier et ajouter cotisation_obligatoire
  const [colCotisation] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures' AND COLUMN_NAME = 'cotisation_obligatoire'`
  );

  if (colCotisation.length === 0) {
    await connection.query(`
      ALTER TABLE structures
      ADD COLUMN cotisation_obligatoire BOOLEAN NOT NULL DEFAULT TRUE
      COMMENT 'Si TRUE, cotisation valide requise pour emprunter'
    `);
    console.log('    - cotisation_obligatoire ajoutee');
  } else {
    console.log('    - cotisation_obligatoire existe deja');
  }

  // Verifier et ajouter adhesion_organisation_obligatoire
  const [colAdhesion] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures' AND COLUMN_NAME = 'adhesion_organisation_obligatoire'`
  );

  if (colAdhesion.length === 0) {
    await connection.query(`
      ALTER TABLE structures
      ADD COLUMN adhesion_organisation_obligatoire BOOLEAN NOT NULL DEFAULT FALSE
      COMMENT 'Si TRUE, adhesion a l organisation parente requise pour emprunter'
    `);
    console.log('    - adhesion_organisation_obligatoire ajoutee');
  } else {
    console.log('    - adhesion_organisation_obligatoire existe deja');
  }

  console.log('  Migration terminee');
}

async function down(connection) {
  console.log('  Suppression des options d\'emprunt...');

  try {
    await connection.query(`
      ALTER TABLE structures
      DROP COLUMN IF EXISTS cotisation_obligatoire,
      DROP COLUMN IF EXISTS adhesion_organisation_obligatoire
    `);
    console.log('  Colonnes supprimees');
  } catch (e) {
    console.log('  Erreur suppression:', e.message);
  }
}

module.exports = { up, down };
