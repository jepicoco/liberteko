/**
 * Migration: Add Disques (Music/Vinyl) Normalization Tables
 * Creates all tables for managing music discs with normalized references
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Starting Disques normalization migration...');

  try {
    // 1. Table des genres musicaux
    console.log('Creating genres_musicaux table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS genres_musicaux (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        couleur VARCHAR(7),
        actif BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Table des formats de disques
    console.log('Creating formats_disques table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS formats_disques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Table des labels
    console.log('Creating labels_disques table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS labels_disques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        pays VARCHAR(100),
        site_web VARCHAR(500),
        actif BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Table des emplacements
    console.log('Creating emplacements_disques table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS emplacements_disques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        libelle VARCHAR(100) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Table des artistes
    console.log('Creating artistes table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS artistes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        prenom VARCHAR(100),
        nom_scene VARCHAR(255),
        type ENUM('solo', 'groupe', 'orchestre', 'ensemble', 'autre') DEFAULT 'solo',
        pays VARCHAR(100),
        annee_formation INT,
        annee_dissolution INT,
        biographie TEXT,
        image_url VARCHAR(500),
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Table principale des disques
    console.log('Creating disques table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS disques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(255) NOT NULL,
        titre_original VARCHAR(255),
        annee_sortie INT,
        nb_pistes INT,
        duree_totale INT COMMENT 'Durée totale en minutes',
        code_barre VARCHAR(50) UNIQUE,
        ean VARCHAR(13) COMMENT 'Code-barres commercial EAN',
        catalogue_number VARCHAR(50) COMMENT 'Numéro de catalogue du label',
        image_url VARCHAR(500),
        description TEXT,
        format_id INT,
        label_id INT,
        emplacement_id INT,
        statut ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive') DEFAULT 'disponible',
        etat ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais') DEFAULT 'bon',
        date_acquisition DATE,
        prix_indicatif DECIMAL(10,2),
        prix_achat DECIMAL(10,2),
        nb_emprunts INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (format_id) REFERENCES formats_disques(id) ON DELETE SET NULL,
        FOREIGN KEY (label_id) REFERENCES labels_disques(id) ON DELETE SET NULL,
        FOREIGN KEY (emplacement_id) REFERENCES emplacements_disques(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Table de jonction Disque <-> Artiste
    console.log('Creating disque_artistes table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS disque_artistes (
        disque_id INT NOT NULL,
        artiste_id INT NOT NULL,
        role VARCHAR(100) COMMENT 'Rôle: principal, featuring, producteur, etc.',
        PRIMARY KEY (disque_id, artiste_id),
        FOREIGN KEY (disque_id) REFERENCES disques(id) ON DELETE CASCADE,
        FOREIGN KEY (artiste_id) REFERENCES artistes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Table de jonction Disque <-> Genre
    console.log('Creating disque_genres table...');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS disque_genres (
        disque_id INT NOT NULL,
        genre_id INT NOT NULL,
        PRIMARY KEY (disque_id, genre_id),
        FOREIGN KEY (disque_id) REFERENCES disques(id) ON DELETE CASCADE,
        FOREIGN KEY (genre_id) REFERENCES genres_musicaux(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. Ajouter colonne disque_id dans emprunts si pas présente
    console.log('Adding disque_id to emprunts table...');
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE emprunts ADD COLUMN disque_id INT NULL,
        ADD CONSTRAINT fk_emprunts_disque FOREIGN KEY (disque_id) REFERENCES disques(id) ON DELETE SET NULL
      `);
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        console.log('disque_id column may already exist or other error:', e.message);
      }
    }

    // 10. Insérer des données de référence
    console.log('Inserting reference data...');

    // Genres musicaux
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO genres_musicaux (nom, couleur) VALUES
      ('Rock', '#e74c3c'),
      ('Pop', '#e91e63'),
      ('Jazz', '#9c27b0'),
      ('Classique', '#673ab7'),
      ('Blues', '#3f51b5'),
      ('Metal', '#212121'),
      ('Punk', '#ff5722'),
      ('Reggae', '#4caf50'),
      ('Hip-Hop', '#ff9800'),
      ('Rap', '#795548'),
      ('Électronique', '#00bcd4'),
      ('Techno', '#009688'),
      ('House', '#8bc34a'),
      ('Folk', '#cddc39'),
      ('Country', '#ffc107'),
      ('Soul', '#9e9e9e'),
      ('Funk', '#607d8b'),
      ('R&B', '#f44336'),
      ('Disco', '#e040fb'),
      ('World Music', '#00e676'),
      ('Chanson française', '#2196f3'),
      ('Variété', '#03a9f4'),
      ('Bande originale', '#ff4081'),
      ('Ambient', '#b2ebf2'),
      ('Indie', '#c5e1a5')
    `);

    // Formats de disques
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO formats_disques (nom, description) VALUES
      ('Vinyle 33 tours', 'Disque vinyle 33 tours (LP)'),
      ('Vinyle 45 tours', 'Disque vinyle 45 tours (Single)'),
      ('Vinyle 78 tours', 'Disque vinyle 78 tours (ancien format)'),
      ('CD', 'Compact Disc'),
      ('CD Single', 'CD Single / Maxi'),
      ('Double CD', 'Album double CD'),
      ('Coffret CD', 'Coffret multi-CD'),
      ('DVD Audio', 'DVD Audio'),
      ('SACD', 'Super Audio CD'),
      ('Cassette', 'Cassette audio'),
      ('MiniDisc', 'MiniDisc Sony'),
      ('Vinyle 180g', 'Vinyle audiophile 180 grammes'),
      ('Vinyle coloré', 'Vinyle édition colorée'),
      ('Picture Disc', 'Vinyle illustré')
    `);

    // Emplacements
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO emplacements_disques (libelle) VALUES
      ('Bac Vinyles A-F'),
      ('Bac Vinyles G-L'),
      ('Bac Vinyles M-R'),
      ('Bac Vinyles S-Z'),
      ('Bac CD A-F'),
      ('Bac CD G-L'),
      ('Bac CD M-R'),
      ('Bac CD S-Z'),
      ('Rayon Classique'),
      ('Rayon Jazz'),
      ('Rayon World'),
      ('Nouveautés'),
      ('Collection spéciale'),
      ('Réserve')
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
