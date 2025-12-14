/**
 * Seed: Roles contributeur livre
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');
const config = require('../../backend/config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

async function seed() {
  console.log('Insertion des roles contributeur livre...');

  // Vider la table d'abord
  await sequelize.query('DELETE FROM roles_contributeur_livre');

  // Insérer les rôles
  await sequelize.query(`
    INSERT INTO roles_contributeur_livre (code, libelle, ordre, actif) VALUES
    ('auteur', 'Auteur', 1, TRUE),
    ('scenariste', 'Scénariste', 2, TRUE),
    ('dessinateur', 'Dessinateur', 3, TRUE),
    ('coloriste', 'Coloriste', 4, TRUE),
    ('illustrateur', 'Illustrateur', 5, TRUE),
    ('traducteur', 'Traducteur', 6, TRUE),
    ('adaptateur', 'Adaptateur', 7, TRUE),
    ('prefacier', 'Préfacier', 8, TRUE),
    ('directeur_collection', 'Directeur de collection', 9, TRUE)
  `);

  console.log('Roles inseres avec succes');

  // Vérifier
  const [rows] = await sequelize.query('SELECT * FROM roles_contributeur_livre ORDER BY ordre');
  console.log('Roles:', rows);

  await sequelize.close();
}

seed().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
