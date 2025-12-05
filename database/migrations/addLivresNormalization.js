/**
 * Migration: Normalisation de la table livres
 *
 * Crée les tables de référence et de liaison pour la collection Livres
 *
 * Usage: npm run migrate-livres
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Collection Livres ===\n');

  try {
    // ========================================
    // 1. Création des tables de référence
    // ========================================

    console.log('1. Création des tables de référence...');

    // Table genres_litteraires
    await queryInterface.createTable('genres_litteraires', {
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
        defaultValue: 'book'
      },
      couleur: {
        type: sequelize.Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#6c757d'
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(() => console.log('  - Table genres_litteraires existe déjà'));
    console.log('  - Table genres_litteraires créée');

    // Table formats_livres
    await queryInterface.createTable('formats_livres', {
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
    }).catch(() => console.log('  - Table formats_livres existe déjà'));
    console.log('  - Table formats_livres créée');

    // Table collections_livres
    await queryInterface.createTable('collections_livres', {
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
    }).catch(() => console.log('  - Table collections_livres existe déjà'));
    console.log('  - Table collections_livres créée');

    // Table emplacements_livres
    await queryInterface.createTable('emplacements_livres', {
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
    }).catch(() => console.log('  - Table emplacements_livres existe déjà'));
    console.log('  - Table emplacements_livres créée');

    // ========================================
    // 2. Création de la table principale livres
    // ========================================

    console.log('\n2. Création de la table livres...');

    await queryInterface.createTable('livres', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: sequelize.Sequelize.STRING(20),
        unique: true,
        allowNull: true
      },
      isbn: {
        type: sequelize.Sequelize.STRING(20),
        unique: true,
        allowNull: true
      },
      titre: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false
      },
      sous_titre: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      },
      tome: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      annee_publication: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      nb_pages: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      resume: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      format_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'formats_livres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      collection_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'collections_livres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      emplacement_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_livres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      prix_indicatif: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      prix_achat: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      date_acquisition: {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: true
      },
      etat: {
        type: sequelize.Sequelize.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
        allowNull: true,
        defaultValue: 'bon'
      },
      statut: {
        type: sequelize.Sequelize.ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive'),
        allowNull: false,
        defaultValue: 'disponible'
      },
      image_url: {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true
      },
      nb_emprunts: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }).catch(() => console.log('  - Table livres existe déjà'));
    console.log('  - Table livres créée');

    // ========================================
    // 3. Création des tables de liaison
    // ========================================

    console.log('\n3. Création des tables de liaison...');

    // livre_auteurs
    await queryInterface.createTable('livre_auteurs', {
      livre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'livres',
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
    }).catch(() => console.log('  - Table livre_auteurs existe déjà'));
    console.log('  - Table livre_auteurs créée');

    // livre_editeurs
    await queryInterface.createTable('livre_editeurs', {
      livre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'livres',
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
    }).catch(() => console.log('  - Table livre_editeurs existe déjà'));
    console.log('  - Table livre_editeurs créée');

    // livre_genres
    await queryInterface.createTable('livre_genres', {
      livre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'livres',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      genre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'genres_litteraires',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(() => console.log('  - Table livre_genres existe déjà'));
    console.log('  - Table livre_genres créée');

    // livre_themes
    await queryInterface.createTable('livre_themes', {
      livre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'livres',
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
    }).catch(() => console.log('  - Table livre_themes existe déjà'));
    console.log('  - Table livre_themes créée');

    // livre_langues
    await queryInterface.createTable('livre_langues', {
      livre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'livres',
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
    }).catch(() => console.log('  - Table livre_langues existe déjà'));
    console.log('  - Table livre_langues créée');

    // ========================================
    // 4. Création des index
    // ========================================

    console.log('\n4. Création des index...');

    // Index sur les tables de référence
    await queryInterface.addIndex('genres_litteraires', ['nom']).catch(() => {});
    await queryInterface.addIndex('formats_livres', ['nom']).catch(() => {});
    await queryInterface.addIndex('collections_livres', ['nom']).catch(() => {});
    await queryInterface.addIndex('emplacements_livres', ['libelle']).catch(() => {});
    console.log('  - Index créés sur les tables de référence');

    // Index sur la table livres
    await queryInterface.addIndex('livres', ['code_barre']).catch(() => {});
    await queryInterface.addIndex('livres', ['isbn']).catch(() => {});
    await queryInterface.addIndex('livres', ['titre']).catch(() => {});
    await queryInterface.addIndex('livres', ['statut']).catch(() => {});
    await queryInterface.addIndex('livres', ['format_id']).catch(() => {});
    await queryInterface.addIndex('livres', ['collection_id']).catch(() => {});
    await queryInterface.addIndex('livres', ['emplacement_id']).catch(() => {});
    console.log('  - Index créés sur la table livres');

    // ========================================
    // 5. Insertion des données initiales
    // ========================================

    console.log('\n5. Insertion des données initiales...');

    // Genres littéraires
    const genres = [
      { nom: 'Roman', icone: 'book', couleur: '#0d6efd' },
      { nom: 'BD', icone: 'image', couleur: '#6f42c1' },
      { nom: 'Manga', icone: 'book-open', couleur: '#e83e8c' },
      { nom: 'Comics', icone: 'zap', couleur: '#fd7e14' },
      { nom: 'Science-Fiction', icone: 'rocket', couleur: '#20c997' },
      { nom: 'Fantasy', icone: 'wand', couleur: '#6610f2' },
      { nom: 'Policier', icone: 'search', couleur: '#dc3545' },
      { nom: 'Thriller', icone: 'alert-triangle', couleur: '#343a40' },
      { nom: 'Horreur', icone: 'skull', couleur: '#212529' },
      { nom: 'Jeunesse', icone: 'smile', couleur: '#ffc107' },
      { nom: 'Documentaire', icone: 'file-text', couleur: '#17a2b8' },
      { nom: 'Biographie', icone: 'user', couleur: '#6c757d' },
      { nom: 'Histoire', icone: 'clock', couleur: '#795548' },
      { nom: 'Essai', icone: 'pen-tool', couleur: '#607d8b' },
      { nom: 'Poésie', icone: 'feather', couleur: '#9c27b0' },
      { nom: 'Théâtre', icone: 'theater', couleur: '#ff5722' },
      { nom: 'Magazine', icone: 'newspaper', couleur: '#00bcd4' }
    ];

    for (const genre of genres) {
      await sequelize.query(
        `INSERT IGNORE INTO genres_litteraires (nom, icone, couleur, actif) VALUES (?, ?, ?, 1)`,
        { replacements: [genre.nom, genre.icone, genre.couleur] }
      );
    }
    console.log('  - Genres littéraires insérés');

    // Formats de livres
    const formats = [
      { nom: 'Poche' },
      { nom: 'Grand format' },
      { nom: 'Album' },
      { nom: 'BD standard' },
      { nom: 'Manga tankobon' },
      { nom: 'Comics US' },
      { nom: 'Magazine' },
      { nom: 'Broché' },
      { nom: 'Relié' }
    ];

    for (const format of formats) {
      await sequelize.query(
        `INSERT IGNORE INTO formats_livres (nom, actif) VALUES (?, 1)`,
        { replacements: [format.nom] }
      );
    }
    console.log('  - Formats de livres insérés');

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
