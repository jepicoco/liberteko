/**
 * Migration: Ajout des tables pour l'editeur de plans
 * - plans : Plans des sites (1 par site)
 * - etages : Etages/annexes d'un plan
 * - elements_plan : Elements graphiques (murs, etageres, zones...)
 * - elements_emplacements : Liaison elements <-> emplacements
 */

const { Sequelize } = require('sequelize');
const configFile = require('../../backend/config/database');

const env = process.env.NODE_ENV || 'development';
const config = configFile[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: console.log
  }
);

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Creation de la table plans...');
  await queryInterface.createTable('plans', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    nom: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    largeur_defaut: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1200
    },
    hauteur_defaut: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 800
    },
    echelle: {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0
    },
    unite_echelle: {
      type: Sequelize.ENUM('cm', 'm', 'px'),
      allowNull: false,
      defaultValue: 'cm'
    },
    afficher_grille: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    taille_grille: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    magnetisme_grille: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  console.log('Creation de la table etages...');
  await queryInterface.createTable('etages', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plan_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    type: {
      type: Sequelize.ENUM('etage', 'annexe', 'exterieur'),
      allowNull: false,
      defaultValue: 'etage'
    },
    numero: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    nom: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    largeur: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    hauteur: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    couleur_fond: {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: '#ffffff'
    },
    image_fond_url: {
      type: Sequelize.STRING(500),
      allowNull: true
    },
    opacite_fond: {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.3
    },
    adresse: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    coordonnees_gps: {
      type: Sequelize.JSON,
      allowNull: true
    },
    ordre_affichage: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  try {
    await queryInterface.addIndex('etages', ['plan_id', 'ordre_affichage']);
  } catch (e) {
    if (e.original?.errno !== 1061) throw e; // ER_DUP_KEYNAME
    console.log('  Index etages_plan_id_ordre_affichage existe deja');
  }

  console.log('Creation de la table elements_plan...');
  await queryInterface.createTable('elements_plan', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    etage_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'etages',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    type_element: {
      type: Sequelize.ENUM('mur', 'etagere', 'meuble', 'table', 'zone'),
      allowNull: false
    },
    points: {
      type: Sequelize.JSON,
      allowNull: false
    },
    rotation: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    style: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: '{}'
    },
    libelle: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    libelle_position: {
      type: Sequelize.JSON,
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    calque: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    chevauchable: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verrouille: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    visible_public: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ordre_affichage: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  try {
    await queryInterface.addIndex('elements_plan', ['etage_id', 'calque', 'ordre_affichage']);
  } catch (e) {
    if (e.original?.errno !== 1061) throw e;
    console.log('  Index elements_plan_etage_id existe deja');
  }
  try {
    await queryInterface.addIndex('elements_plan', ['type_element']);
  } catch (e) {
    if (e.original?.errno !== 1061) throw e;
    console.log('  Index elements_plan_type_element existe deja');
  }

  console.log('Creation de la table elements_emplacements...');
  await queryInterface.createTable('elements_emplacements', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    element_plan_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'elements_plan',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    type_collection: {
      type: Sequelize.ENUM('jeu', 'livre', 'film', 'disque'),
      allowNull: false
    },
    emplacement_jeu_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    emplacement_livre_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_livres',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    emplacement_film_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_films',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    emplacement_disque_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_disques',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    position: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    libelle_override: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  try {
    await queryInterface.addIndex('elements_emplacements', ['element_plan_id', 'type_collection']);
  } catch (e) {
    if (e.original?.errno !== 1061) throw e;
    console.log('  Index elements_emplacements_element_plan_id existe deja');
  }

  console.log('Ajout du module plans dans modules_actifs...');
  await sequelize.query(`
    INSERT INTO modules_actifs (code, libelle, description, icone, couleur, ordre_affichage, actif, created_at, updated_at)
    VALUES ('plans', 'Editeur de Plans', 'Editeur de plans interactifs avec emplacements', 'map', 'info', 20, 1, NOW(), NOW())
    ON DUPLICATE KEY UPDATE libelle = VALUES(libelle), description = VALUES(description)
  `);

  console.log('Migration addPlans terminee avec succes!');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Suppression des tables plans...');

  await queryInterface.dropTable('elements_emplacements');
  await queryInterface.dropTable('elements_plan');
  await queryInterface.dropTable('etages');
  await queryInterface.dropTable('plans');

  await sequelize.query(`DELETE FROM modules_actifs WHERE code = 'plans'`);

  console.log('Rollback addPlans termine!');
}

// Wrapper pour compatibilite avec migrate.js
// migrate.js passe une connection mysql2, mais cette migration utilise sequelize
async function upWrapper(connection) {
  // Ignorer la connection passee, utiliser sequelize directement
  await up();
}

async function downWrapper(connection) {
  await down();
}

// Execution si appele directement
if (require.main === module) {
  const command = process.argv[2];
  (async () => {
    try {
      if (command === 'down') {
        await down();
      } else {
        await up();
      }
      process.exit(0);
    } catch (error) {
      console.error('Erreur migration:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up: upWrapper, down: downWrapper };
