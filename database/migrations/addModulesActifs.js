/**
 * Migration: Creation de la table modules_actifs
 * Gestion des modules activables/desactivables du site
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../../backend/config/sequelize');
const { DataTypes } = require('sequelize');

async function up(connection) {
  // Connection peut être passée par migrate.js ou on utilise sequelize directement
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('=== Migration Modules Actifs ===\n');

    // 1. Verifier si la table existe
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('modules_actifs');

    if (!tableExists) {
      // 2. Creer la table
      console.log('Creation de la table modules_actifs...');
      await queryInterface.createTable('modules_actifs', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true
        },
        libelle: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        icone: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: 'box'
        },
        couleur: {
          type: DataTypes.STRING(20),
          allowNull: true,
          defaultValue: 'secondary'
        },
        actif: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        ordre_affichage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
      console.log('Table modules_actifs creee.');
    }

    // 3. Inserer les modules par defaut
    console.log('\nInsertion des modules par defaut...');

    const modulesDefaut = [
      {
        code: 'scanner',
        libelle: 'Scanner',
        description: 'Scanner de codes-barres pour les adherents et les jeux. Desactive le bouton Scanner du menu.',
        icone: 'upc-scan',
        couleur: 'success',
        actif: true,
        ordre_affichage: 0
      },
      {
        code: 'ludotheque',
        libelle: 'Ludotheque',
        description: 'Gestion des jeux de societe. Desactive le menu Ludotheque et le module sur le site public.',
        icone: 'dice-6',
        couleur: '#FFE5B4',
        actif: true,
        ordre_affichage: 1
      },
      {
        code: 'bibliotheque',
        libelle: 'Bibliotheque',
        description: 'Gestion des livres et magazines. Desactive le menu Bibliotheque et le module sur le site public.',
        icone: 'book',
        couleur: '#B4D8E7',
        actif: true,
        ordre_affichage: 2
      },
      {
        code: 'filmotheque',
        libelle: 'Filmotheque',
        description: 'Gestion des films et DVD. Desactive le menu Filmotheque et le module sur le site public.',
        icone: 'film',
        couleur: '#E7B4D8',
        actif: true,
        ordre_affichage: 3
      },
      {
        code: 'discotheque',
        libelle: 'Discotheque',
        description: 'Gestion des disques et vinyles. Desactive le menu Discotheque et le module sur le site public.',
        icone: 'vinyl',
        couleur: '#B4E7C4',
        actif: true,
        ordre_affichage: 4
      },
      {
        code: 'comptabilite',
        libelle: 'Comptabilite',
        description: 'Onglet Comptabilite dans les parametres (tarifs, codes reduction, comptes bancaires).',
        icone: 'calculator',
        couleur: 'warning',
        actif: true,
        ordre_affichage: 5
      },
      {
        code: 'communications',
        libelle: 'Communications',
        description: 'Envoi d\'emails et SMS. Desactive le menu Communications, l\'onglet dans les parametres, et bloque les envois automatiques.',
        icone: 'envelope',
        couleur: 'info',
        actif: true,
        ordre_affichage: 6
      },
      {
        code: 'outils',
        libelle: 'Outils',
        description: 'Onglet Outils dans les parametres (import, archives RGPD, export, maintenance).',
        icone: 'tools',
        couleur: 'secondary',
        actif: true,
        ordre_affichage: 7
      },
      {
        code: 'reservations',
        libelle: 'Reservations',
        description: 'Systeme de reservations pour les articles. Permet aux usagers de reserver des articles indisponibles.',
        icone: 'bookmark-check',
        couleur: '#e8daef',
        actif: false,
        ordre_affichage: 8
      },
      {
        code: 'recherche_ia',
        libelle: 'Recherche IA',
        description: 'Recherche en langage naturel et enrichissement automatique des fiches via IA.',
        icone: 'robot',
        couleur: '#e0cffc',
        actif: false,
        ordre_affichage: 9
      },
      {
        code: 'plans',
        libelle: 'Editeur de Plans',
        description: 'Editeur de plans interactifs pour visualiser les emplacements des collections.',
        icone: 'map',
        couleur: '#c3f0ca',
        actif: false,
        ordre_affichage: 10
      },
      {
        code: 'frequentation',
        libelle: 'Frequentation',
        description: 'Comptage des visiteurs. Deployer des tablettes pour enregistrer adultes/enfants et communes.',
        icone: 'people-fill',
        couleur: '#17a2b8',
        actif: false,
        ordre_affichage: 11
      },
      {
        code: 'charte',
        libelle: 'Charte usager',
        description: 'Validation de charte lors des cotisations. Les usagers doivent signer numeriquement via code OTP.',
        icone: 'file-earmark-check',
        couleur: '#5bc0de',
        actif: false,
        ordre_affichage: 12
      }
    ];

    for (const module of modulesDefaut) {
      // Verifier si le module existe deja
      const [existing] = await sequelize.query(
        `SELECT id FROM modules_actifs WHERE code = ?`,
        { replacements: [module.code] }
      );

      if (existing.length > 0) {
        console.log(`  - ${module.libelle} (${module.code}) - existe deja`);
      } else {
        await queryInterface.bulkInsert('modules_actifs', [{
          ...module,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        console.log(`  - ${module.libelle} (${module.code}) - ajoute`);
      }
    }

    console.log('\n=== Migration terminee avec succes ===');

  } catch (error) {
    console.error('\nErreur lors de la migration:', error.message);
    throw error;
  }
}

async function down(connection) {
  // Note: On ne supprime pas les modules par defaut car cela pourrait casser l'application
  console.log('Rollback addModulesActifs: rien a faire (modules conserves)');
}

// Execution si appele directement
if (require.main === module) {
  up()
    .then(() => {
      console.log('\nMigration terminee.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
