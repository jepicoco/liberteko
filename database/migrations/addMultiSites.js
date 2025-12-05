/**
 * Migration: Multi-Sites Architecture
 *
 * Crée les tables pour la gestion multi-sites:
 * - comptes_bancaires
 * - sites
 * - horaires_ouverture
 * - fermetures_exceptionnelles
 * - parametres_calendrier
 *
 * Et migre les données existantes de parametres_structure
 */

// Charger les variables d'environnement depuis la racine du projet
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  console.log('=== Migration Multi-Sites ===\n');

  try {
    // 1. Créer la table comptes_bancaires
    console.log('1. Création table comptes_bancaires...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS comptes_bancaires (
        id INT PRIMARY KEY AUTO_INCREMENT,
        libelle VARCHAR(100) NOT NULL COMMENT 'ex: Compte principal, Compte événementiel',
        titulaire VARCHAR(255) NULL COMMENT 'Nom du titulaire du compte',
        banque VARCHAR(100) NULL COMMENT 'Nom de la banque',
        iban VARCHAR(34) NULL,
        bic VARCHAR(11) NULL,
        par_defaut BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Compte par défaut pour les nouvelles opérations',
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Table comptes_bancaires créée');

    // 2. Créer la table sites
    console.log('2. Création table sites...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Code unique ex: LUDO_PRINCIPAL, BIBLIO_MOBILE',
        nom VARCHAR(100) NOT NULL COMMENT 'Nom affiché ex: Ludothèque, Bibliothèque',
        type ENUM('fixe', 'mobile') NOT NULL DEFAULT 'fixe' COMMENT 'fixe = adresse permanente, mobile = lieux variables',
        description TEXT NULL,
        adresse TEXT NULL COMMENT 'Adresse complète pour sites fixes',
        code_postal VARCHAR(10) NULL,
        ville VARCHAR(100) NULL,
        pays VARCHAR(2) NOT NULL DEFAULT 'FR' COMMENT 'Code pays ISO 3166-1 alpha-2 (FR, CH, DE, BE)',
        telephone VARCHAR(20) NULL,
        email VARCHAR(255) NULL,
        compte_bancaire_id INT NULL,
        google_place_id VARCHAR(255) NULL COMMENT 'Google Place ID pour synchronisation future',
        couleur VARCHAR(20) DEFAULT '#0d6efd' COMMENT 'Couleur pour badge UI (hex)',
        icone VARCHAR(50) DEFAULT 'building' COMMENT 'Nom icône Bootstrap ex: building, truck, book',
        ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\\'affichage dans les listes',
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (compte_bancaire_id) REFERENCES comptes_bancaires(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Table sites créée');

    // 3. Créer la table horaires_ouverture
    console.log('3. Création table horaires_ouverture...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS horaires_ouverture (
        id INT PRIMARY KEY AUTO_INCREMENT,
        site_id INT NOT NULL,
        jour_semaine TINYINT NOT NULL COMMENT '0=lundi, 1=mardi, 2=mercredi, 3=jeudi, 4=vendredi, 5=samedi, 6=dimanche',
        heure_debut TIME NOT NULL COMMENT 'Heure d\\'ouverture ex: 09:00',
        heure_fin TIME NOT NULL COMMENT 'Heure de fermeture ex: 12:00',
        recurrence ENUM('toutes', 'paires', 'impaires') NOT NULL DEFAULT 'toutes' COMMENT 'toutes=chaque semaine, paires=semaines paires, impaires=semaines impaires',
        lieu_specifique VARCHAR(255) NULL COMMENT 'Nom du lieu pour sites mobiles ex: Salle des fêtes',
        adresse_specifique TEXT NULL COMMENT 'Adresse complète pour ce créneau (sites mobiles)',
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        INDEX idx_site_jour (site_id, jour_semaine)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Table horaires_ouverture créée');

    // 4. Créer la table fermetures_exceptionnelles
    console.log('4. Création table fermetures_exceptionnelles...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fermetures_exceptionnelles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        site_id INT NULL COMMENT 'NULL = fermeture pour tous les sites',
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        motif VARCHAR(255) NULL COMMENT 'ex: Jour férié, Vacances été, Travaux',
        type ENUM('ponctuel', 'ferie', 'vacances', 'autre') NOT NULL DEFAULT 'ponctuel' COMMENT 'Type de fermeture pour filtrage et statistiques',
        recurrent_annuel BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'true = se répète chaque année (ex: 25 décembre)',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        INDEX idx_site (site_id),
        INDEX idx_dates (date_debut, date_fin),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Table fermetures_exceptionnelles créée');

    // 5. Créer la table parametres_calendrier
    console.log('5. Création table parametres_calendrier...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS parametres_calendrier (
        id INT PRIMARY KEY AUTO_INCREMENT,
        site_id INT NULL UNIQUE COMMENT 'NULL = paramètres globaux par défaut',
        pays VARCHAR(2) NOT NULL DEFAULT 'FR' COMMENT 'Code pays ISO 3166-1 alpha-2 (FR, CH, DE, BE)',
        zone_vacances CHAR(1) NULL COMMENT 'Zone académique France: A, B ou C (null si autre pays)',
        ouvert_jours_feries BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Site ouvert les jours fériés',
        ouvert_vacances BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Site ouvert pendant les vacances scolaires',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Table parametres_calendrier créée');

    // 6. Migrer les données existantes
    console.log('6. Migration des données existantes...');

    // Récupérer les paramètres actuels
    const [existingParams] = await sequelize.query(`
      SELECT * FROM parametres_structure LIMIT 1
    `, { type: QueryTypes.SELECT }).catch(() => [null]);

    if (existingParams) {
      console.log('   Données existantes trouvées, migration en cours...');

      // Créer le compte bancaire par défaut si IBAN existe
      if (existingParams.iban) {
        await sequelize.query(`
          INSERT INTO comptes_bancaires (libelle, titulaire, banque, iban, bic, par_defaut, actif, created_at, updated_at)
          VALUES ('Compte principal', ?, ?, ?, ?, TRUE, TRUE, NOW(), NOW())
        `, {
          replacements: [
            existingParams.nom || null,
            null,
            existingParams.iban,
            existingParams.bic || null
          ]
        });
        console.log('   ✓ Compte bancaire migré');
      }

      // Créer le site par défaut
      const compteBancaireId = existingParams.iban ? 1 : null;
      await sequelize.query(`
        INSERT INTO sites (code, nom, type, adresse, code_postal, ville, telephone, email, compte_bancaire_id, couleur, icone, ordre_affichage, actif, created_at, updated_at)
        VALUES ('SITE_PRINCIPAL', ?, 'fixe', ?, ?, ?, ?, ?, ?, '#0d6efd', 'building', 0, TRUE, NOW(), NOW())
      `, {
        replacements: [
          existingParams.nom || 'Site principal',
          existingParams.adresse || null,
          existingParams.code_postal || null,
          existingParams.ville || null,
          existingParams.telephone || null,
          existingParams.email || null,
          compteBancaireId
        ]
      });
      console.log('   ✓ Site principal créé');

      // Migrer les horaires si format JSON existant
      if (existingParams.horaires_ouverture) {
        try {
          const horaires = JSON.parse(existingParams.horaires_ouverture);
          const joursMap = {
            'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3,
            'vendredi': 4, 'samedi': 5, 'dimanche': 6
          };

          for (const [jour, creneaux] of Object.entries(horaires)) {
            if (creneaux && creneaux.ouvert && creneaux.debut && creneaux.fin) {
              const jourNum = joursMap[jour.toLowerCase()];
              if (jourNum !== undefined) {
                await sequelize.query(`
                  INSERT INTO horaires_ouverture (site_id, jour_semaine, heure_debut, heure_fin, recurrence, actif, created_at, updated_at)
                  VALUES (1, ?, ?, ?, 'toutes', TRUE, NOW(), NOW())
                `, {
                  replacements: [jourNum, creneaux.debut, creneaux.fin]
                });
              }
            }
          }
          console.log('   ✓ Horaires migrés');
        } catch (e) {
          console.log('   ⚠ Impossible de parser les horaires JSON existants');
        }
      }
    } else {
      console.log('   Aucune donnée existante, création des valeurs par défaut...');

      // Créer un compte bancaire vide par défaut
      await sequelize.query(`
        INSERT INTO comptes_bancaires (libelle, par_defaut, actif, created_at, updated_at)
        VALUES ('Compte principal', TRUE, TRUE, NOW(), NOW())
      `);

      // Créer un site par défaut
      await sequelize.query(`
        INSERT INTO sites (code, nom, type, compte_bancaire_id, couleur, icone, ordre_affichage, actif, created_at, updated_at)
        VALUES ('SITE_PRINCIPAL', 'Site principal', 'fixe', 1, '#0d6efd', 'building', 0, TRUE, NOW(), NOW())
      `);
    }

    // Créer les paramètres calendrier globaux par défaut
    await sequelize.query(`
      INSERT INTO parametres_calendrier (site_id, pays, zone_vacances, ouvert_jours_feries, ouvert_vacances, created_at, updated_at)
      VALUES (NULL, 'FR', 'B', FALSE, TRUE, NOW(), NOW())
    `);
    console.log('   ✓ Paramètres calendrier globaux créés');

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    throw error;
  }
}

// Exécution
runMigration()
  .then(() => {
    console.log('\nMigration complète.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration échouée:', error);
    process.exit(1);
  });
