/**
 * Migration: Transfert des données texte vers les tables normalisées
 *
 * Extrait les valeurs des champs texte multi-valeurs de la table jeux
 * et les migre vers les nouvelles tables de référence et de liaison.
 *
 * Usage: npm run migrate-jeux-data
 */

// Charger les variables d'environnement
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
  sequelize,
  Jeu,
  Categorie,
  Theme,
  Mecanisme,
  Langue,
  Editeur,
  Auteur,
  Illustrateur,
  Gamme,
  EmplacementJeu,
  JeuCategorie,
  JeuTheme,
  JeuMecanisme,
  JeuLangue,
  JeuEditeur,
  JeuAuteur,
  JeuIllustrateur
} = require('../../backend/models');

// Mapping des codes de langue vers noms complets
const LANGUE_MAPPING = {
  'fr': 'français',
  'en': 'anglais',
  'de': 'allemand',
  'es': 'espagnol',
  'it': 'italien',
  'nl': 'néerlandais',
  'pt': 'portugais',
  'pl': 'polonais',
  'ru': 'russe',
  'ja': 'japonais',
  'zh': 'chinois',
  'ko': 'coréen'
};

/**
 * Parse une chaîne CSV en tableau de valeurs nettoyées
 */
function parseMultiValue(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(v => v && v.length > 0);
}

/**
 * Trouve ou crée une entrée dans une table de référence
 */
async function findOrCreateRef(Model, nom, extraData = {}) {
  if (!nom || nom.trim().length === 0) return null;

  const cleanNom = nom.trim();

  try {
    const [instance] = await Model.findOrCreate({
      where: { nom: cleanNom },
      defaults: { nom: cleanNom, ...extraData }
    });
    return instance;
  } catch (error) {
    // En cas d'erreur (ex: contrainte unique), essayer de retrouver
    const existing = await Model.findOne({ where: { nom: cleanNom } });
    return existing;
  }
}

/**
 * Trouve ou crée une langue (gère les codes et noms)
 */
async function findOrCreateLangue(value) {
  if (!value || value.trim().length === 0) return null;

  let nom = value.trim().toLowerCase();
  let code = null;

  // Vérifier si c'est un code
  if (LANGUE_MAPPING[nom]) {
    code = nom;
    nom = LANGUE_MAPPING[nom];
  } else {
    // Chercher si c'est un nom qui correspond à un code
    for (const [c, n] of Object.entries(LANGUE_MAPPING)) {
      if (n.toLowerCase() === nom) {
        code = c;
        nom = n;
        break;
      }
    }
  }

  // Capitaliser le nom
  nom = nom.charAt(0).toUpperCase() + nom.slice(1);

  try {
    const [instance] = await Langue.findOrCreate({
      where: { nom },
      defaults: { nom, code }
    });
    return instance;
  } catch (error) {
    const existing = await Langue.findOne({ where: { nom } });
    return existing;
  }
}

async function migrateData() {
  console.log('=== Migration des données des jeux ===\n');

  const stats = {
    jeux: 0,
    categories: 0,
    themes: 0,
    mecanismes: 0,
    langues: 0,
    editeurs: 0,
    auteurs: 0,
    illustrateurs: 0,
    gammes: 0,
    emplacements: 0,
    liaisons: 0
  };

  try {
    // Récupérer tous les jeux
    const jeux = await Jeu.findAll();
    console.log(`Nombre de jeux à traiter: ${jeux.length}\n`);

    for (const jeu of jeux) {
      stats.jeux++;
      process.stdout.write(`\rTraitement jeu ${stats.jeux}/${jeux.length}: ${jeu.titre.substring(0, 30).padEnd(30)}`);

      // ========================================
      // Catégories
      // ========================================
      const categoriesValues = parseMultiValue(jeu.categories);
      for (const catNom of categoriesValues) {
        const categorie = await findOrCreateRef(Categorie, catNom);
        if (categorie) {
          stats.categories++;
          try {
            await JeuCategorie.findOrCreate({
              where: { jeu_id: jeu.id, categorie_id: categorie.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Thèmes
      // ========================================
      const themesValues = parseMultiValue(jeu.themes);
      for (const themeNom of themesValues) {
        const theme = await findOrCreateRef(Theme, themeNom);
        if (theme) {
          stats.themes++;
          try {
            await JeuTheme.findOrCreate({
              where: { jeu_id: jeu.id, theme_id: theme.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Mécanismes
      // ========================================
      const mecanismesValues = parseMultiValue(jeu.mecanismes);
      for (const mecaNom of mecanismesValues) {
        const mecanisme = await findOrCreateRef(Mecanisme, mecaNom);
        if (mecanisme) {
          stats.mecanismes++;
          try {
            await JeuMecanisme.findOrCreate({
              where: { jeu_id: jeu.id, mecanisme_id: mecanisme.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Langues
      // ========================================
      const languesValues = parseMultiValue(jeu.langues);
      for (const langueNom of languesValues) {
        const langue = await findOrCreateLangue(langueNom);
        if (langue) {
          stats.langues++;
          try {
            await JeuLangue.findOrCreate({
              where: { jeu_id: jeu.id, langue_id: langue.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Éditeurs
      // ========================================
      const editeursValues = parseMultiValue(jeu.editeur);
      for (const editeurNom of editeursValues) {
        const editeur = await findOrCreateRef(Editeur, editeurNom);
        if (editeur) {
          stats.editeurs++;
          try {
            await JeuEditeur.findOrCreate({
              where: { jeu_id: jeu.id, editeur_id: editeur.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Auteurs
      // ========================================
      const auteursValues = parseMultiValue(jeu.auteur);
      for (const auteurNom of auteursValues) {
        const auteur = await findOrCreateRef(Auteur, auteurNom);
        if (auteur) {
          stats.auteurs++;
          try {
            await JeuAuteur.findOrCreate({
              where: { jeu_id: jeu.id, auteur_id: auteur.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Illustrateurs
      // ========================================
      const illustrateursValues = parseMultiValue(jeu.illustrateur);
      for (const illustrateurNom of illustrateursValues) {
        const illustrateur = await findOrCreateRef(Illustrateur, illustrateurNom);
        if (illustrateur) {
          stats.illustrateurs++;
          try {
            await JeuIllustrateur.findOrCreate({
              where: { jeu_id: jeu.id, illustrateur_id: illustrateur.id }
            });
            stats.liaisons++;
          } catch (e) { /* liaison existe déjà */ }
        }
      }

      // ========================================
      // Gamme (relation N:1)
      // ========================================
      if (jeu.gamme && !jeu.gamme_id) {
        const gamme = await findOrCreateRef(Gamme, jeu.gamme);
        if (gamme) {
          stats.gammes++;
          await jeu.update({ gamme_id: gamme.id });
        }
      }

      // ========================================
      // Emplacement (relation N:1)
      // ========================================
      if (jeu.emplacement && !jeu.emplacement_id) {
        const [emplacement] = await EmplacementJeu.findOrCreate({
          where: { libelle: jeu.emplacement.trim() },
          defaults: { libelle: jeu.emplacement.trim() }
        });
        if (emplacement) {
          stats.emplacements++;
          await jeu.update({ emplacement_id: emplacement.id });
        }
      }
    }

    console.log('\n\n=== Statistiques de migration ===');
    console.log(`Jeux traités:      ${stats.jeux}`);
    console.log(`Catégories:        ${await Categorie.count()} (${stats.categories} associations)`);
    console.log(`Thèmes:            ${await Theme.count()} (${stats.themes} associations)`);
    console.log(`Mécanismes:        ${await Mecanisme.count()} (${stats.mecanismes} associations)`);
    console.log(`Langues:           ${await Langue.count()} (${stats.langues} associations)`);
    console.log(`Éditeurs:          ${await Editeur.count()} (${stats.editeurs} associations)`);
    console.log(`Auteurs:           ${await Auteur.count()} (${stats.auteurs} associations)`);
    console.log(`Illustrateurs:     ${await Illustrateur.count()} (${stats.illustrateurs} associations)`);
    console.log(`Gammes:            ${await Gamme.count()}`);
    console.log(`Emplacements:      ${await EmplacementJeu.count()}`);
    console.log(`Total liaisons:    ${stats.liaisons}`);

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('\nErreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateData };
