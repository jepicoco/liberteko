/**
 * Migration: Films Normalization
 *
 * Creates all tables for normalized film management:
 * - Reference tables: genres_films, realisateurs, acteurs, studios, supports_video, emplacements_films
 * - Main table: films
 * - Junction tables: film_realisateurs, film_acteurs, film_genres, film_themes, film_langues, film_sous_titres, film_studios
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../backend/models');

async function runMigration() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('🎬 Starting Films Normalization Migration...\n');

  try {
    // ============================================
    // 1. Create reference tables
    // ============================================

    // genres_films
    console.log('Creating genres_films table...');
    await queryInterface.createTable('genres_films', {
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table genres_films already exists, skipping...');
      } else throw err;
    });

    // realisateurs
    console.log('Creating realisateurs table...');
    await queryInterface.createTable('realisateurs', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      prenom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      nationalite: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table realisateurs already exists, skipping...');
      } else throw err;
    });

    // acteurs
    console.log('Creating acteurs table...');
    await queryInterface.createTable('acteurs', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      prenom: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      nationalite: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table acteurs already exists, skipping...');
      } else throw err;
    });

    // studios
    console.log('Creating studios table...');
    await queryInterface.createTable('studios', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: sequelize.Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      pays: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table studios already exists, skipping...');
      } else throw err;
    });

    // supports_video
    console.log('Creating supports_video table...');
    await queryInterface.createTable('supports_video', {
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table supports_video already exists, skipping...');
      } else throw err;
    });

    // emplacements_films
    console.log('Creating emplacements_films table...');
    await queryInterface.createTable('emplacements_films', {
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
        }
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table emplacements_films already exists, skipping...');
      } else throw err;
    });

    // ============================================
    // 2. Create main films table
    // ============================================

    console.log('Creating films table...');
    await queryInterface.createTable('films', {
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
      ean: {
        type: sequelize.Sequelize.STRING(20),
        unique: true,
        allowNull: true
      },
      titre: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: false
      },
      titre_original: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      },
      annee_sortie: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      duree: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      synopsis: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      support_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'supports_video',
          key: 'id'
        }
      },
      emplacement_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_films',
          key: 'id'
        }
      },
      classification: {
        type: sequelize.Sequelize.ENUM('TP', '-10', '-12', '-16', '-18'),
        allowNull: true,
        defaultValue: 'TP'
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
      bande_annonce_url: {
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table films already exists, skipping...');
      } else throw err;
    });

    // ============================================
    // 3. Create junction tables
    // ============================================

    // film_realisateurs
    console.log('Creating film_realisateurs junction table...');
    await queryInterface.createTable('film_realisateurs', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      realisateur_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'realisateurs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_realisateurs already exists, skipping...');
      } else throw err;
    });

    // film_acteurs (avec champ role)
    console.log('Creating film_acteurs junction table...');
    await queryInterface.createTable('film_acteurs', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      acteur_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'acteurs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      role: {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_acteurs already exists, skipping...');
      } else throw err;
    });

    // film_genres
    console.log('Creating film_genres junction table...');
    await queryInterface.createTable('film_genres', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      genre_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'genres_films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_genres already exists, skipping...');
      } else throw err;
    });

    // film_themes (réutilise la table themes existante)
    console.log('Creating film_themes junction table...');
    await queryInterface.createTable('film_themes', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_themes already exists, skipping...');
      } else throw err;
    });

    // film_langues (langues audio)
    console.log('Creating film_langues junction table...');
    await queryInterface.createTable('film_langues', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_langues already exists, skipping...');
      } else throw err;
    });

    // film_sous_titres (langues des sous-titres)
    console.log('Creating film_sous_titres junction table...');
    await queryInterface.createTable('film_sous_titres', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
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
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_sous_titres already exists, skipping...');
      } else throw err;
    });

    // film_studios
    console.log('Creating film_studios junction table...');
    await queryInterface.createTable('film_studios', {
      film_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      studio_id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'studios',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    }).catch(err => {
      if (err.original?.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  → Table film_studios already exists, skipping...');
      } else throw err;
    });

    // ============================================
    // 4. Insert initial reference data
    // ============================================

    console.log('\n📝 Inserting initial reference data...');

    // Genres de films
    const genresFilms = [
      { nom: 'Action', description: 'Films d\'action et aventure' },
      { nom: 'Comédie', description: 'Films comiques' },
      { nom: 'Drame', description: 'Films dramatiques' },
      { nom: 'Science-Fiction', description: 'Films de science-fiction' },
      { nom: 'Fantastique', description: 'Films fantastiques' },
      { nom: 'Horreur', description: 'Films d\'horreur' },
      { nom: 'Thriller', description: 'Films à suspense' },
      { nom: 'Romance', description: 'Films romantiques' },
      { nom: 'Animation', description: 'Films d\'animation' },
      { nom: 'Documentaire', description: 'Films documentaires' },
      { nom: 'Aventure', description: 'Films d\'aventure' },
      { nom: 'Policier', description: 'Films policiers' },
      { nom: 'Guerre', description: 'Films de guerre' },
      { nom: 'Western', description: 'Films western' },
      { nom: 'Musical', description: 'Comédies musicales' },
      { nom: 'Biopic', description: 'Films biographiques' },
      { nom: 'Historique', description: 'Films historiques' },
      { nom: 'Jeunesse', description: 'Films pour enfants' }
    ];

    for (const genre of genresFilms) {
      await queryInterface.bulkInsert('genres_films', [genre], {
        ignoreDuplicates: true
      }).catch(() => {});
    }
    console.log('  → Genres de films insérés');

    // Supports vidéo
    const supportsVideo = [
      { nom: 'DVD', description: 'Digital Versatile Disc' },
      { nom: 'Blu-ray', description: 'Blu-ray Disc' },
      { nom: '4K UHD', description: 'Ultra HD Blu-ray' },
      { nom: 'VHS', description: 'Video Home System (cassette)' },
      { nom: 'Numérique', description: 'Format numérique dématérialisé' }
    ];

    for (const support of supportsVideo) {
      await queryInterface.bulkInsert('supports_video', [support], {
        ignoreDuplicates: true
      }).catch(() => {});
    }
    console.log('  → Supports vidéo insérés');

    // Emplacement par défaut
    await queryInterface.bulkInsert('emplacements_films', [{
      code: 'FILM-DEF',
      libelle: 'Rayon Films',
      description: 'Emplacement par défaut pour les films',
      actif: true
    }], {
      ignoreDuplicates: true
    }).catch(() => {});
    console.log('  → Emplacement films par défaut inséré');

    // Studios majeurs
    const studios = [
      { nom: 'Warner Bros.', pays: 'États-Unis' },
      { nom: 'Universal Pictures', pays: 'États-Unis' },
      { nom: 'Paramount Pictures', pays: 'États-Unis' },
      { nom: 'Walt Disney Pictures', pays: 'États-Unis' },
      { nom: '20th Century Studios', pays: 'États-Unis' },
      { nom: 'Sony Pictures', pays: 'États-Unis' },
      { nom: 'Metro-Goldwyn-Mayer', pays: 'États-Unis' },
      { nom: 'Lionsgate', pays: 'États-Unis' },
      { nom: 'DreamWorks', pays: 'États-Unis' },
      { nom: 'Pixar', pays: 'États-Unis' },
      { nom: 'Studio Ghibli', pays: 'Japon' },
      { nom: 'Gaumont', pays: 'France' },
      { nom: 'Pathé', pays: 'France' },
      { nom: 'StudioCanal', pays: 'France' },
      { nom: 'EuropaCorp', pays: 'France' }
    ];

    for (const studio of studios) {
      await queryInterface.bulkInsert('studios', [studio], {
        ignoreDuplicates: true
      }).catch(() => {});
    }
    console.log('  → Studios insérés');

    console.log('\n✅ Films Normalization Migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   - genres_films (reference)');
    console.log('   - realisateurs (reference)');
    console.log('   - acteurs (reference)');
    console.log('   - studios (reference)');
    console.log('   - supports_video (reference)');
    console.log('   - emplacements_films (reference)');
    console.log('   - films (main)');
    console.log('   - film_realisateurs (junction)');
    console.log('   - film_acteurs (junction with role)');
    console.log('   - film_genres (junction)');
    console.log('   - film_themes (junction)');
    console.log('   - film_langues (junction)');
    console.log('   - film_sous_titres (junction)');
    console.log('   - film_studios (junction)');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
