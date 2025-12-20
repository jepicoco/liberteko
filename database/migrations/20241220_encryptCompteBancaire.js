/**
 * Migration: Chiffrement des données bancaires sensibles (IBAN/BIC)
 *
 * IMPORTANT: Faire un backup de la base de données avant d'exécuter cette migration!
 *
 * Cette migration:
 * 1. Augmente la taille des colonnes iban et bic pour stocker les données chiffrées
 * 2. Chiffre toutes les valeurs existantes avec AES-256-CBC
 */

const { sequelize } = require('../../backend/models');
const crypto = require('crypto');

// Utilise la même clé de chiffrement que les emails
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  ? Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex')
  : null;

/**
 * Chiffre une valeur sensible
 */
function encryptValue(value) {
  if (!value || !ENCRYPTION_KEY) return value;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffre une valeur sensible (pour rollback)
 */
function decryptValue(encryptedValue) {
  if (!encryptedValue || !encryptedValue.includes(':') || !ENCRYPTION_KEY) return encryptedValue;
  try {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur déchiffrement:', error.message);
    return encryptedValue;
  }
}

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Chiffrement IBAN/BIC ===');

  // Vérifier que la clé de chiffrement est disponible
  if (!ENCRYPTION_KEY) {
    throw new Error('EMAIL_ENCRYPTION_KEY non définie. Impossible de chiffrer les données bancaires.');
  }

  // Vérifier si la table existe
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('comptes_bancaires')) {
    console.log('Table comptes_bancaires non trouvée, migration ignorée.');
    return;
  }

  // 0. Corriger les dates invalides (0000-00-00) qui bloquent les ALTER TABLE
  console.log('0. Correction des dates invalides...');
  try {
    // Désactiver temporairement le mode strict pour permettre la comparaison
    await sequelize.query("SET SESSION sql_mode = ''");
    await sequelize.query(`
      UPDATE comptes_bancaires
      SET created_at = NOW()
      WHERE created_at = '0000-00-00 00:00:00' OR created_at IS NULL OR created_at < '1970-01-01'
    `);
    await sequelize.query(`
      UPDATE comptes_bancaires
      SET updated_at = NOW()
      WHERE updated_at = '0000-00-00 00:00:00' OR updated_at IS NULL OR updated_at < '1970-01-01'
    `);
    // Restaurer le mode par défaut
    await sequelize.query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
    console.log('   - Dates invalides corrigées');
  } catch (e) {
    console.log('   - Correction des dates:', e.message);
  }

  // 1. Augmenter la taille des colonnes pour stocker les données chiffrées
  console.log('1. Extension des colonnes iban et bic...');

  const columns = await queryInterface.describeTable('comptes_bancaires');

  // IBAN: 34 chars max en clair -> ~100 chars chiffrés (iv:encrypted)
  // Utiliser SQL brut pour éviter les problèmes de mode strict MySQL
  if (columns.iban) {
    try {
      await sequelize.query('ALTER TABLE comptes_bancaires MODIFY COLUMN iban VARCHAR(255)');
      console.log('   - Colonne iban étendue à VARCHAR(255)');
    } catch (e) {
      console.log('   - Colonne iban déjà VARCHAR(255) ou erreur:', e.message);
    }
  }

  // BIC: 11 chars max en clair -> ~80 chars chiffrés
  if (columns.bic) {
    try {
      await sequelize.query('ALTER TABLE comptes_bancaires MODIFY COLUMN bic VARCHAR(255)');
      console.log('   - Colonne bic étendue à VARCHAR(255)');
    } catch (e) {
      console.log('   - Colonne bic déjà VARCHAR(255) ou erreur:', e.message);
    }
  }

  // 2. Récupérer et chiffrer les données existantes
  console.log('2. Chiffrement des données existantes...');

  const [comptes] = await sequelize.query('SELECT id, iban, bic FROM comptes_bancaires');

  if (comptes.length === 0) {
    console.log('   Aucun compte bancaire à chiffrer.');
    return;
  }

  let encrypted = 0;
  for (const compte of comptes) {
    const updates = {};
    let needsUpdate = false;

    // Chiffrer IBAN s'il n'est pas déjà chiffré (ne contient pas ':')
    if (compte.iban && !compte.iban.includes(':')) {
      updates.iban = encryptValue(compte.iban);
      needsUpdate = true;
    }

    // Chiffrer BIC s'il n'est pas déjà chiffré
    if (compte.bic && !compte.bic.includes(':')) {
      updates.bic = encryptValue(compte.bic);
      needsUpdate = true;
    }

    if (needsUpdate) {
      await sequelize.query(
        'UPDATE comptes_bancaires SET iban = ?, bic = ? WHERE id = ?',
        {
          replacements: [updates.iban || compte.iban, updates.bic || compte.bic, compte.id]
        }
      );
      encrypted++;
    }
  }

  console.log(`   ${encrypted} compte(s) chiffré(s) sur ${comptes.length} total.`);
  console.log('=== Migration terminée avec succès ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback: Déchiffrement IBAN/BIC ===');

  if (!ENCRYPTION_KEY) {
    throw new Error('EMAIL_ENCRYPTION_KEY non définie. Impossible de déchiffrer les données bancaires.');
  }

  // Récupérer et déchiffrer les données
  const [comptes] = await sequelize.query('SELECT id, iban, bic FROM comptes_bancaires');

  for (const compte of comptes) {
    const decryptedIban = compte.iban ? decryptValue(compte.iban) : null;
    const decryptedBic = compte.bic ? decryptValue(compte.bic) : null;

    await sequelize.query(
      'UPDATE comptes_bancaires SET iban = ?, bic = ? WHERE id = ?',
      {
        replacements: [decryptedIban, decryptedBic, compte.id]
      }
    );
  }

  // Réduire la taille des colonnes (SQL brut pour éviter les problèmes de mode strict)
  try {
    await sequelize.query('ALTER TABLE comptes_bancaires MODIFY COLUMN iban VARCHAR(34)');
    await sequelize.query('ALTER TABLE comptes_bancaires MODIFY COLUMN bic VARCHAR(11)');
  } catch (e) {
    console.log('Erreur lors de la réduction des colonnes:', e.message);
  }

  console.log('=== Rollback terminé ===');
}

module.exports = { up, down };
