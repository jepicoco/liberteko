/**
 * Ajoute le module frequentation a modules_actifs
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addFrequentationModule() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [existing] = await connection.query(
      "SELECT id FROM modules_actifs WHERE code = 'frequentation'"
    );

    if (existing.length === 0) {
      const [maxOrder] = await connection.query(
        'SELECT MAX(ordre_affichage) as max_ordre FROM modules_actifs'
      );
      const ordre = (maxOrder[0].max_ordre || 0) + 1;

      await connection.query(`
        INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
        VALUES (
          'frequentation',
          'Frequentation',
          'Comptage des visiteurs avec tablettes',
          'people-fill',
          '#17a2b8',
          FALSE,
          ?,
          NOW(),
          NOW()
        )
      `, [ordre]);
      console.log('✓ Module frequentation ajoute avec succes (ordre:', ordre, ')');
    } else {
      console.log('→ Module frequentation existe deja');
    }
  } finally {
    await connection.end();
  }
}

addFrequentationModule()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur:', err.message);
    process.exit(1);
  });
