/**
 * Script de génération massive de données de test
 * Usage: node database/scripts/generateMassData.js [nombre]
 */

require('dotenv').config();
const readline = require('readline');
const { Adherent, Jeu, Livre, Film, Disque, sequelize } = require('../../backend/models');

// ============================================
// LIBRAIRIES DE MOTS
// ============================================

const PRENOMS = [
  'Jean', 'Pierre', 'Marie', 'Sophie', 'Lucas', 'Emma', 'Louis', 'Léa', 'Gabriel', 'Chloé',
  'Hugo', 'Manon', 'Arthur', 'Camille', 'Jules', 'Inès', 'Adam', 'Jade', 'Raphaël', 'Louise',
  'Paul', 'Alice', 'Victor', 'Lola', 'Nathan', 'Sarah', 'Thomas', 'Anna', 'Maxime', 'Clara',
  'Antoine', 'Eva', 'Alexandre', 'Zoé', 'Théo', 'Juliette', 'Mathis', 'Léna', 'Noah', 'Laura',
  'Clément', 'Margot', 'Enzo', 'Rose', 'Léo', 'Ambre', 'Ethan', 'Lucie', 'Tom', 'Océane',
  'Baptiste', 'Charlotte', 'Romain', 'Julie', 'Nicolas', 'Pauline', 'Valentin', 'Mathilde', 'Quentin', 'Marine'
];

const NOMS = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand',
  'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin',
  'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin', 'Masson'
];

const VILLES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Le Havre', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand',
  'Saint-Étienne', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Besançon', 'Orléans'
];

const RUES = [
  'rue de la Paix', 'avenue des Champs-Élysées', 'boulevard Voltaire', 'rue du Commerce', 'avenue Victor Hugo',
  'rue de la République', 'boulevard Gambetta', 'rue Jean Jaurès', 'avenue de la Liberté', 'rue Pasteur',
  'rue des Fleurs', 'avenue du Général de Gaulle', 'rue du Moulin', 'boulevard Saint-Michel', 'rue de la Gare',
  'rue des Lilas', 'avenue Foch', 'rue Nationale', 'boulevard Carnot', 'rue de l\'Église'
];

// Jeux de société
const JEUX_PREFIXES = [
  'Les Aventuriers', 'Le Secret', 'La Quête', 'Les Légendes', 'Le Mystère', 'La Conquête', 'Les Royaumes',
  'L\'Empire', 'La Cité', 'Les Chroniques', 'Le Trésor', 'La Forteresse', 'Les Gardiens', 'Le Pouvoir',
  'L\'Ordre', 'Les Héros', 'Le Destin', 'La Malédiction', 'Les Ombres', 'Le Règne'
];

const JEUX_SUFFIXES = [
  'de Catan', 'Perdus', 'des Dragons', 'Oubliées', 'du Pharaon', 'des Mers', 'du Nord', 'des Étoiles',
  'Maudits', 'Anciens', 'de l\'Ouest', 'du Donjon', 'Sacrés', 'des Abysses', 'Interdits', 'du Crépuscule',
  'de Cristal', 'du Chaos', 'Éternels', 'du Royaume'
];

const JEUX_SIMPLES = [
  'Azul', 'Carcassonne', 'Dixit', 'Pandemic', 'Ticket to Ride', 'Splendor', 'Codenames', '7 Wonders',
  'Dominion', 'Terraforming Mars', 'Wingspan', 'Everdell', 'Root', 'Gloomhaven', 'Scythe', 'Viticulture',
  'Agricola', 'Puerto Rico', 'Eclipse', 'Spirit Island', 'Ark Nova', 'Brass', 'Concordia', 'Dune'
];

const EDITEURS_JEUX = [
  'Asmodee', 'Iello', 'Days of Wonder', 'Fantasy Flight Games', 'Matagot', 'Z-Man Games', 'Ravensburger',
  'Gigamic', 'Space Cowboys', 'Stonemaier Games', 'Leder Games', 'Ludonaute', 'Pearl Games', 'Repos Production'
];

const AUTEURS_JEUX = [
  'Bruno Cathala', 'Antoine Bauza', 'Uwe Rosenberg', 'Reiner Knizia', 'Stefan Feld', 'Vlaada Chvátil',
  'Eric M. Lang', 'Jamey Stegmaier', 'Cole Wehrle', 'Martin Wallace', 'Wolfgang Kramer', 'Michael Kiesling'
];

// Livres
const LIVRES_PREFIXES = [
  'Le Dernier', 'La Première', 'Les Enfants', 'Le Sang', 'La Nuit', 'Le Livre', 'Les Ombres', 'Le Jardin',
  'La Maison', 'Le Temps', 'La Route', 'Le Monde', 'Les Secrets', 'La Vie', 'Le Chemin', 'La Porte',
  'L\'Héritage', 'Le Silence', 'La Mémoire', 'Le Voyage'
];

const LIVRES_SUFFIXES = [
  'des Rois', 'Éternelle', 'du Désert', 'des Étoiles', 'Oubliée', 'des Songes', 'du Temps', 'Perdue',
  'des Ténèbres', 'de Feu', 'de Glace', 'des Loups', 'Secret', 'Maudit', 'Interdit', 'des Âmes',
  'du Nord', 'de l\'Est', 'du Silence', 'Invisible'
];

const AUTEURS_LIVRES = [
  'Victor Hugo', 'Albert Camus', 'Marcel Proust', 'Émile Zola', 'Gustave Flaubert', 'Alexandre Dumas',
  'Honoré de Balzac', 'Stendhal', 'Guy de Maupassant', 'Jules Verne', 'Molière', 'Jean-Paul Sartre',
  'Simone de Beauvoir', 'Marguerite Duras', 'Patrick Modiano', 'Michel Houellebecq', 'Marc Levy',
  'Guillaume Musso', 'Amélie Nothomb', 'Fred Vargas', 'Bernard Werber', 'Maxime Chattam'
];

const EDITEURS_LIVRES = [
  'Gallimard', 'Hachette', 'Flammarion', 'Albin Michel', 'Robert Laffont', 'Seuil', 'Grasset', 'Actes Sud',
  'Pocket', 'Folio', 'J\'ai Lu', 'Le Livre de Poche', 'Bragelonne', 'Mnémos', 'L\'Atalante'
];

// Films
const FILMS_PREFIXES = [
  'Le Retour', 'La Chute', 'Les Derniers', 'Le Règne', 'La Légende', 'Le Secret', 'Les Aventures',
  'L\'Ombre', 'La Revanche', 'Le Destin', 'Les Gardiens', 'Le Pouvoir', 'La Quête', 'Le Sang',
  'L\'Éveil', 'La Fin', 'Le Commencement', 'Les Héritiers', 'Le Choix', 'La Promesse'
];

const FILMS_SUFFIXES = [
  'du Roi', 'de l\'Empire', 'des Étoiles', 'du Passé', 'de l\'Ombre', 'du Héros', 'des Temps',
  'de Fer', 'des Dieux', 'du Dragon', 'Maudit', 'Éternel', 'Perdu', 'Sacré', 'Interdit',
  'du Crépuscule', 'de l\'Aube', 'des Âmes', 'du Néant', 'de la Mort'
];

const REALISATEURS = [
  'Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese', 'Quentin Tarantino', 'Ridley Scott',
  'James Cameron', 'Denis Villeneuve', 'Luc Besson', 'Jean-Pierre Jeunet', 'Michel Hazanavicius',
  'François Ozon', 'Jacques Audiard', 'Olivier Nakache', 'Éric Toledano', 'Cédric Klapisch'
];

const ACTEURS = [
  'Jean Dujardin', 'Marion Cotillard', 'Omar Sy', 'Léa Seydoux', 'Vincent Cassel', 'Audrey Tautou',
  'Gérard Depardieu', 'Catherine Deneuve', 'Isabelle Huppert', 'Romain Duris', 'Mélanie Laurent',
  'Tahar Rahim', 'Adèle Exarchopoulos', 'François Cluzet', 'Guillaume Canet'
];

// Musique/Disques
const DISQUES_PREFIXES = [
  'The Best of', 'Greatest Hits', 'Live at', 'Unplugged', 'Sessions', 'Acoustic', 'Electric',
  'Dark Side of', 'Bright Lights', 'Midnight', 'Sunrise', 'Echoes of', 'Sounds of', 'Dreams of'
];

const DISQUES_SUFFIXES = [
  'Collection', 'Anthology', 'Remastered', 'Deluxe Edition', 'Special Edition', 'Revisited',
  'Chronicles', 'Memories', 'Stories', 'Tales', 'Sessions', 'Experience', 'Journey'
];

const ARTISTES = [
  'Daft Punk', 'Air', 'Phoenix', 'Justice', 'M83', 'Christine and the Queens', 'Stromae',
  'David Guetta', 'Jean-Michel Jarre', 'Serge Gainsbourg', 'Edith Piaf', 'Charles Aznavour',
  'Johnny Hallyday', 'Francis Cabrel', 'Jean-Jacques Goldman', 'Mylène Farmer', 'Indochine',
  'The Beatles', 'Pink Floyd', 'Led Zeppelin', 'Queen', 'Nirvana', 'Radiohead', 'Coldplay'
];

const LABELS = [
  'Universal Music', 'Sony Music', 'Warner Music', 'EMI', 'Virgin Records', 'Columbia Records',
  'Atlantic Records', 'Interscope', 'Def Jam', 'Capitol Records', 'Polydor', 'Island Records'
];

const GENRES_MUSIQUE = [
  'Rock', 'Pop', 'Jazz', 'Classique', 'Électronique', 'Hip-Hop', 'R&B', 'Folk', 'Metal', 'Indie',
  'Blues', 'Soul', 'Funk', 'Reggae', 'Country', 'World Music', 'Ambient', 'Techno', 'House'
];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateEmail(prenom, nom, index) {
  const domains = ['gmail.com', 'yahoo.fr', 'outlook.com', 'hotmail.fr', 'orange.fr', 'free.fr'];
  const cleanPrenom = prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanNom = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanPrenom}.${cleanNom}${index}@${random(domains)}`;
}

function generatePhone() {
  return `0${randomInt(6, 7)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`;
}

function generateCodePostal() {
  return String(randomInt(10000, 99999));
}

function generateISBN() {
  return `978-${randomInt(0, 9)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}-${randomInt(0, 9)}`;
}

function generateEAN() {
  let ean = '37';
  for (let i = 0; i < 11; i++) ean += randomInt(0, 9);
  return ean;
}

// ============================================
// GÉNÉRATEURS DE DONNÉES
// ============================================

function generateAdherent(index) {
  const prenom = random(PRENOMS);
  const nom = random(NOMS);
  const ville = random(VILLES);

  return {
    nom,
    prenom,
    email: generateEmail(prenom, nom, index),
    telephone: generatePhone(),
    adresse: `${randomInt(1, 150)} ${random(RUES)}`,
    ville,
    code_postal: generateCodePostal(),
    date_naissance: formatDate(randomDate(1950, 2010)),
    date_adhesion: formatDate(randomDate(2020, 2024)),
    statut: random(['actif', 'actif', 'actif', 'inactif', 'suspendu']), // Plus de actifs
    password: 'Test1234!',
    role: 'usager'
  };
}

function generateJeu() {
  const useSimple = Math.random() > 0.5;
  const titre = useSimple
    ? random(JEUX_SIMPLES) + (Math.random() > 0.7 ? ` ${randomInt(2, 5)}` : '')
    : `${random(JEUX_PREFIXES)} ${random(JEUX_SUFFIXES)}`;

  return {
    titre,
    editeur: random(EDITEURS_JEUX),
    auteur: random(AUTEURS_JEUX),
    annee_sortie: randomInt(1990, 2024),
    age_min: random([6, 8, 10, 12, 14]),
    nb_joueurs_min: randomInt(1, 2),
    nb_joueurs_max: randomInt(4, 8),
    duree_partie: random([15, 30, 45, 60, 90, 120, 180]),
    categories: [random(['Stratégie', 'Famille', 'Ambiance', 'Expert', 'Coopératif']),
                 random(['Gestion', 'Placement', 'Dés', 'Cartes', 'Figurines'])].join(', '),
    statut: random(['disponible', 'disponible', 'disponible', 'emprunte']),
    etat: random(['neuf', 'tres_bon', 'bon', 'acceptable']),
    prix_achat: randomInt(15, 80)
  };
}

function generateLivre() {
  const titre = `${random(LIVRES_PREFIXES)} ${random(LIVRES_SUFFIXES)}`;

  return {
    titre,
    isbn: generateISBN(),
    annee_publication: randomInt(1950, 2024),
    nb_pages: randomInt(150, 800),
    resume: `Un roman captivant qui raconte l'histoire de personnages extraordinaires dans un monde fascinant.`,
    statut: random(['disponible', 'disponible', 'disponible', 'emprunte']),
    etat: random(['neuf', 'tres_bon', 'bon', 'acceptable']),
    prix_achat: randomInt(5, 25)
  };
}

function generateFilm() {
  const titre = `${random(FILMS_PREFIXES)} ${random(FILMS_SUFFIXES)}`;

  return {
    titre,
    ean: generateEAN(),
    annee_sortie: randomInt(1970, 2024),
    duree: randomInt(80, 180),
    synopsis: `Un film palpitant qui explore les thèmes universels de l'amour, du courage et de la destinée.`,
    classification: random(['TP', 'TP', '-10', '-12', '-16']),
    statut: random(['disponible', 'disponible', 'disponible', 'emprunte']),
    etat: random(['neuf', 'tres_bon', 'bon', 'acceptable']),
    prix_achat: randomInt(5, 20)
  };
}

function generateDisque() {
  const artiste = random(ARTISTES);
  const usePrefix = Math.random() > 0.5;
  const titre = usePrefix
    ? `${random(DISQUES_PREFIXES)} ${artiste}`
    : `${artiste} - ${random(DISQUES_SUFFIXES)}`;

  return {
    titre,
    ean: generateEAN(),
    annee_sortie: randomInt(1970, 2024),
    nb_pistes: randomInt(8, 18),
    duree_totale: randomInt(35, 75),
    description: `Album de ${artiste}, genre ${random(GENRES_MUSIQUE)}`,
    statut: random(['disponible', 'disponible', 'disponible', 'emprunte']),
    etat: random(['neuf', 'tres_bon', 'bon', 'acceptable']),
    prix_achat: randomInt(8, 25)
  };
}

// ============================================
// INSERTION EN MASSE
// ============================================

async function insertBatch(Model, data, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  let inserted = 0;
  for (const batch of batches) {
    await Model.bulkCreate(batch, {
      validate: true,
      hooks: false // Désactive les hooks pour performance (code_barre sera null)
    });
    inserted += batch.length;
    process.stdout.write(`\r  Inséré: ${inserted}/${data.length}`);
  }
  console.log(' ✓');
  return inserted;
}

// ============================================
// MAIN
// ============================================

async function main() {
  let count = parseInt(process.argv[2]);

  if (!count) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    count = await new Promise(resolve => {
      rl.question('Nombre d\'éléments à générer pour chaque type: ', answer => {
        rl.close();
        resolve(parseInt(answer) || 100);
      });
    });
  }

  console.log(`\n🚀 Génération de ${count} éléments par type...\n`);

  try {
    await sequelize.authenticate();
    console.log('✓ Connexion à la base de données\n');

    const startTime = Date.now();

    // Générer les données
    console.log('📊 Génération des données...');

    console.log('  Adhérents...');
    const adherents = Array.from({ length: count }, (_, i) => generateAdherent(i));

    console.log('  Jeux...');
    const jeux = Array.from({ length: count }, () => generateJeu());

    console.log('  Livres...');
    const livres = Array.from({ length: count }, () => generateLivre());

    console.log('  Films...');
    const films = Array.from({ length: count }, () => generateFilm());

    console.log('  Disques...');
    const disques = Array.from({ length: count }, () => generateDisque());

    console.log('\n📥 Insertion en base de données...');

    console.log('  Adhérents:');
    await insertBatch(Adherent, adherents);

    console.log('  Jeux:');
    await insertBatch(Jeu, jeux);

    console.log('  Livres:');
    await insertBatch(Livre, livres);

    console.log('  Films:');
    await insertBatch(Film, films);

    console.log('  Disques:');
    await insertBatch(Disque, disques);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const total = count * 5;

    console.log(`\n✅ Terminé en ${duration}s`);
    console.log(`   Total: ${total} enregistrements créés`);
    console.log(`   - ${count} adhérents`);
    console.log(`   - ${count} jeux`);
    console.log(`   - ${count} livres`);
    console.log(`   - ${count} films`);
    console.log(`   - ${count} disques\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.errors) {
      error.errors.forEach(e => console.error('  -', e.message));
    }
  } finally {
    await sequelize.close();
  }
}

main();
