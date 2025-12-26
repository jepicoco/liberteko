/**
 * Migration: Ajouter le module Caisse aux modules_actifs
 * Permet d'activer/desactiver la caisse rapide dans l'interface admin
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../../backend/config/sequelize');

async function up() {
  console.log('=== Migration: Ajout module Caisse ===\n');

  try {
    // Verifier si le module existe deja
    const [existing] = await sequelize.query(
      `SELECT id FROM modules_actifs WHERE code = 'caisse'`
    );

    if (existing.length > 0) {
      console.log('Module caisse existe deja - rien a faire');
      return;
    }

    // Trouver le prochain ordre_affichage
    const [maxOrder] = await sequelize.query(
      `SELECT MAX(ordre_affichage) as max_ordre FROM modules_actifs`
    );
    const nextOrder = (maxOrder[0]?.max_ordre || 0) + 1;

    // Inserer le module caisse
    await sequelize.query(`
      INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
      VALUES (
        'caisse',
        'Caisse Rapide',
        'Interface simplifiee de caisse pour encaisser cotisations, adhesions et ventes. Affiche un bouton Caisse a cote du Scanner.',
        'cash-stack',
        '#ffc107',
        1,
        ?,
        NOW(),
        NOW()
      )
    `, { replacements: [nextOrder] });

    console.log('Module caisse ajoute avec succes');
    console.log(`  - Code: caisse`);
    console.log(`  - Libelle: Caisse Rapide`);
    console.log(`  - Actif: oui`);
    console.log(`  - Ordre: ${nextOrder}`);

  } catch (error) {
    console.error('Erreur:', error.message);
    throw error;
  }
}

async function down() {
  console.log('=== Rollback: Suppression module Caisse ===\n');

  try {
    await sequelize.query(`DELETE FROM modules_actifs WHERE code = 'caisse'`);
    console.log('Module caisse supprime');
  } catch (error) {
    console.error('Erreur rollback:', error.message);
    throw error;
  }
}

module.exports = { up, down };
