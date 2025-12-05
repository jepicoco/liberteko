/**
 * Migration: Normalisation de la table jeux
 *
 * Crée les tables de référence et de liaison pour normaliser les champs
 * multi-valeurs de la table jeux (categories, themes, mecanismes, etc.)
 *
 * Usage: npm run migrate-jeux-normalization
 */

// Charger les variables d'environnement
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Normalisation des jeux ===\n');

  try {
    // ========================================
    // 1. Création des tables de référence
    // ========================================

    console.log('1. Création des tables de référence...');

    // Table categories
    await queryInterface.createTable('categories', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      icone: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'tag'
      },
      couleur: {
        type: sequelize.Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#0d6efd'
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table categories existe déjà'));
    console.log('  - Table categories créée');

    // Table themes
    await queryInterface.createTable('themes', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      icone: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'bookmark'
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table themes existe déjà'));
    console.log('  - Table themes créée');

    // Table mecanismes
    await queryInterface.createTable('mecanismes', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table mecanismes existe déjà'));
    console.log('  - Table mecanismes créée');

    // Table langues
    await queryInterface.createTable('langues', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.STRING(10),
        allowNull: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table langues existe déjà'));
    console.log('  - Table langues créée');

    // Table editeurs
    await queryInterface.createTable('editeurs', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      pays: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      site_web: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table editeurs existe déjà'));
    console.log('  - Table editeurs créée');

    // Table auteurs
    await queryInterface.createTable('auteurs', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      prenom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      nationalite: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table auteurs existe déjà'));
    console.log('  - Table auteurs créée');

    // Table illustrateurs
    await queryInterface.createTable('illustrateurs', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      prenom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      site_web: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table illustrateurs existe déjà'));
    console.log('  - Table illustrateurs créée');

    // Table gammes
    await queryInterface.createTable('gammes', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      editeur_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'editeurs',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table gammes existe déjà'));
    console.log('  - Table gammes créée');

    // Table emplacements_jeux
    await queryInterface.createTable('emplacements_jeux', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true
      },
      libelle: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      site_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sites',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table emplacements_jeux existe déjà'));
    console.log('  - Table emplacements_jeux créée');

    // ========================================
    // 2. Création des tables de liaison
    // ========================================

    console.log('\n2. Création des tables de liaison...');

    // jeu_categories
    await queryInterface.createTable('jeu_categories', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      categorie_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_categories existe déjà'));
    console.log('  - Table jeu_categories créée');

    // jeu_themes
    await queryInterface.createTable('jeu_themes', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      theme_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'themes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_themes existe déjà'));
    console.log('  - Table jeu_themes créée');

    // jeu_mecanismes
    await queryInterface.createTable('jeu_mecanismes', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      mecanisme_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'mecanismes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_mecanismes existe déjà'));
    console.log('  - Table jeu_mecanismes créée');

    // jeu_langues
    await queryInterface.createTable('jeu_langues', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      langue_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'langues',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_langues existe déjà'));
    console.log('  - Table jeu_langues créée');

    // jeu_editeurs
    await queryInterface.createTable('jeu_editeurs', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      editeur_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'editeurs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_editeurs existe déjà'));
    console.log('  - Table jeu_editeurs créée');

    // jeu_auteurs
    await queryInterface.createTable('jeu_auteurs', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      auteur_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'auteurs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_auteurs existe déjà'));
    console.log('  - Table jeu_auteurs créée');

    // jeu_illustrateurs
    await queryInterface.createTable('jeu_illustrateurs', {
      jeu_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      illustrateur_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'illustrateurs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table jeu_illustrateurs existe déjà'));
    console.log('  - Table jeu_illustrateurs créée');

    // ========================================
    // 3. Ajout des FK dans la table jeux
    // ========================================

    console.log('\n3. Ajout des colonnes FK dans la table jeux...');

    // Ajouter gamme_id
    await queryInterface.addColumn('jeux', 'gamme_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'gammes',
        key: 'id'
      },
      onDelete: 'SET NULL'
    }).catch(() => console.log('  - Colonne gamme_id existe déjà'));
    console.log('  - Colonne gamme_id ajoutée');

    // Ajouter emplacement_id
    await queryInterface.addColumn('jeux', 'emplacement_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_jeux',
        key: 'id'
      },
      onDelete: 'SET NULL'
    }).catch(() => console.log('  - Colonne emplacement_id existe déjà'));
    console.log('  - Colonne emplacement_id ajoutée');

    // ========================================
    // 4. Création des index
    // ========================================

    console.log('\n4. Création des index...');

    // Index sur les tables de référence
    await queryInterface.addIndex('categories', ['nom']).catch(() => {});
    await queryInterface.addIndex('themes', ['nom']).catch(() => {});
    await queryInterface.addIndex('mecanismes', ['nom']).catch(() => {});
    await queryInterface.addIndex('langues', ['nom']).catch(() => {});
    await queryInterface.addIndex('editeurs', ['nom']).catch(() => {});
    await queryInterface.addIndex('auteurs', ['nom']).catch(() => {});
    await queryInterface.addIndex('illustrateurs', ['nom']).catch(() => {});
    await queryInterface.addIndex('gammes', ['nom']).catch(() => {});
    await queryInterface.addIndex('emplacements_jeux', ['libelle']).catch(() => {});
    console.log('  - Index créés sur les tables de référence');

    // Index sur les FK de jeux
    await queryInterface.addIndex('jeux', ['gamme_id']).catch(() => {});
    await queryInterface.addIndex('jeux', ['emplacement_id']).catch(() => {});
    console.log('  - Index créés sur les FK de jeux');

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
