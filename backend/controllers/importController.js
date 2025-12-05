/**
 * Import Controller
 * Gestion de l'import de jeux depuis des fichiers CSV (MyLudo, etc.)
 * Support de la base normalisee (referentiels)
 */

const {
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
} = require('../models');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Mapping des codes de langue vers noms complets
const LANGUE_MAPPING = {
  'fr': 'Francais',
  'en': 'Anglais',
  'de': 'Allemand',
  'es': 'Espagnol',
  'it': 'Italien',
  'nl': 'Neerlandais',
  'pt': 'Portugais',
  'pl': 'Polonais',
  'ru': 'Russe',
  'ja': 'Japonais',
  'zh': 'Chinois',
  'ko': 'Coreen'
};

/**
 * Parse le contenu CSV et retourne les donnees
 * @param {string} filePath - Chemin du fichier CSV
 * @param {string} separator - Separateur (default: ;)
 * @returns {Promise<{columns: string[], rows: object[]}>}
 */
function parseCSV(filePath, separator = ';') {
  return new Promise((resolve, reject) => {
    const rows = [];
    let columns = [];

    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        separator: separator,
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').replace(/^'/, '').trim() // Remove BOM and leading quote
      }))
      .on('headers', (headers) => {
        columns = headers;
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({ columns, rows });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Mapping des colonnes CSV MyLudo vers les champs du modele Jeu
 */
const CSV_TO_JEU_MAPPING = {
  // Identifiants
  'ID': 'id_externe',
  'EAN': 'ean',

  // Informations de base
  'Titre': 'titre',
  'Sous-titre': 'sous_titre',
  'Type': 'type_jeu',
  'Édition': 'annee_sortie',
  'Edition': 'annee_sortie',

  // Personnes
  'Éditeur(s)': 'editeur',
  'Editeur(s)': 'editeur',
  'Auteur(s)': 'auteur',
  'Illustrateur(s)': 'illustrateur',

  // Caracteristiques de jeu
  'Joueur(s)': 'joueurs',
  'Durée': 'duree_partie',
  'Duree': 'duree_partie',
  'Age(s)': 'age_min',

  // Multi-valeurs
  'Langues': 'langues',
  'Catégorie(s)': 'categories',
  'Categorie(s)': 'categories',
  'Thème(s)': 'themes',
  'Theme(s)': 'themes',
  'Mécanisme(s)': 'mecanismes',
  'Mecanisme(s)': 'mecanismes',
  'Univers': 'univers',
  'Gamme(s)': 'gamme',

  // Physique
  'Dimensions': 'dimensions',
  'Poids': 'poids',

  // Prix
  'Prix indicatif': 'prix_indicatif',
  'Prix d\'achat': 'prix_achat',
  'Gratuit': 'gratuit',

  // Gestion
  'Date d\'acquisition': 'date_acquisition',
  'Propriétaire': 'proprietaire',
  'Proprietaire': 'proprietaire',
  'Cadeaux': 'cadeau',
  'Emplacement': 'emplacement',
  'État': 'etat',
  'Etat': 'etat',

  // Flags
  'Privé': 'prive',
  'Prive': 'prive',
  'Protégé': 'protege',
  'Protege': 'protege',
  'Organisé': 'organise',
  'Organise': 'organise',
  'Personnalisé': 'personnalise',
  'Personnalise': 'personnalise',
  'Figurines peintes': 'figurines_peintes',

  // Notes et references
  'Commentaire': 'notes',
  'Référence': 'reference',
  'Reference': 'reference',
  'Référent': 'referent',
  'Referent': 'referent',

  // Statistiques
  'Dernière partie': 'derniere_partie',
  'Derniere partie': 'derniere_partie'
};

/**
 * Suggere un mapping automatique des colonnes CSV vers le modele Jeu
 */
function suggestMapping(columns) {
  const mapping = {};

  columns.forEach(col => {
    const normalized = col.trim();
    if (CSV_TO_JEU_MAPPING[normalized]) {
      mapping[normalized] = CSV_TO_JEU_MAPPING[normalized];
    }
  });

  return mapping;
}

/**
 * Parse la valeur "Joueur(s)" pour extraire min/max
 * Formats: "2 — 7", "Solo", "2-4", "2+"
 */
function parseJoueurs(value) {
  if (!value) return { min: null, max: null };

  const str = value.toString().trim().toLowerCase();

  if (str === 'solo' || str === '1') {
    return { min: 1, max: 1 };
  }

  // Format "2 — 7" ou "2 - 7" ou "2-7"
  const rangeMatch = str.match(/(\d+)\s*[—\-–]\s*(\d+)/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  // Format "2+"
  const plusMatch = str.match(/(\d+)\+/);
  if (plusMatch) {
    return { min: parseInt(plusMatch[1]), max: null };
  }

  // Juste un nombre
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    return { min: num, max: num };
  }

  return { min: null, max: null };
}

/**
 * Parse la valeur "Age(s)" pour extraire l'age minimum
 * Formats: "10+", "8 ans", "12"
 */
function parseAge(value) {
  if (!value) return null;

  const str = value.toString().trim();
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse la valeur "Durée" pour extraire les minutes
 * Formats: "30", "30 min", "1h", "1h30"
 */
function parseDuree(value) {
  if (!value) return null;

  const str = value.toString().trim().toLowerCase();

  // Format "1h30" ou "1h 30"
  const hoursMinMatch = str.match(/(\d+)\s*h\s*(\d+)?/);
  if (hoursMinMatch) {
    const hours = parseInt(hoursMinMatch[1]) || 0;
    const mins = parseInt(hoursMinMatch[2]) || 0;
    return hours * 60 + mins;
  }

  // Juste des minutes
  const minMatch = str.match(/(\d+)/);
  return minMatch ? parseInt(minMatch[1]) : null;
}

/**
 * Parse une date au format YYYY-MM-DD ou DD/MM/YYYY
 */
function parseDate(value) {
  if (!value) return null;

  const str = value.toString().trim();

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format DD/MM/YYYY
  const frMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  return null;
}

/**
 * Parse un booleen depuis CSV (oui/non, true/false, 0/1)
 */
function parseBoolean(value) {
  if (!value) return false;
  const str = value.toString().trim().toLowerCase();
  return str === 'oui' || str === 'true' || str === '1' || str === 'yes';
}

/**
 * Parse le prix (gere les virgules comme separateur decimal)
 */
function parsePrix(value) {
  if (!value) return null;
  const str = value.toString().trim().replace(',', '.').replace(/[^\d.]/g, '');
  const prix = parseFloat(str);
  return isNaN(prix) ? null : prix;
}

/**
 * Parse le type de jeu
 */
function parseTypeJeu(value) {
  if (!value) return 'basegame';
  const str = value.toString().trim().toLowerCase();

  const mapping = {
    'basegame': 'basegame',
    'base': 'basegame',
    'jeu de base': 'basegame',
    'extension': 'extension',
    'ext': 'extension',
    'standalone': 'standalone',
    'stand-alone': 'standalone',
    'accessoire': 'accessoire',
    'accessory': 'accessoire'
  };

  return mapping[str] || 'basegame';
}

/**
 * Parse l'etat du jeu
 */
function parseEtat(value) {
  if (!value) return null;
  const str = value.toString().trim().toLowerCase();

  const mapping = {
    'neuf': 'neuf',
    'new': 'neuf',
    'tres bon': 'tres_bon',
    'très bon': 'tres_bon',
    'tres_bon': 'tres_bon',
    'excellent': 'tres_bon',
    'bon': 'bon',
    'good': 'bon',
    'acceptable': 'acceptable',
    'correct': 'acceptable',
    'mauvais': 'mauvais',
    'bad': 'mauvais',
    'poor': 'mauvais'
  };

  return mapping[str] || null;
}

/**
 * Parse une chaine multi-valeurs (separees par virgules)
 */
function parseMultiValue(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(v => v && v.length > 0);
}

/**
 * Trouve ou cree un element dans une table de reference
 */
async function findOrCreateRef(Model, nom, extraData = {}) {
  if (!nom || nom.trim().length === 0) return null;

  const cleanNom = nom.trim();

  try {
    const [instance] = await Model.findOrCreate({
      where: { nom: cleanNom },
      defaults: { nom: cleanNom, actif: true, ...extraData }
    });
    return instance;
  } catch (error) {
    // En cas d'erreur (ex: contrainte unique), essayer de retrouver
    const existing = await Model.findOne({ where: { nom: cleanNom } });
    return existing;
  }
}

/**
 * Trouve ou cree une langue (gere les codes et noms)
 */
async function findOrCreateLangue(value) {
  if (!value || value.trim().length === 0) return null;

  let nom = value.trim().toLowerCase();
  let code = null;

  // Verifier si c'est un code
  if (LANGUE_MAPPING[nom]) {
    code = nom;
    nom = LANGUE_MAPPING[nom];
  } else {
    // Chercher si c'est un nom qui correspond a un code
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
      defaults: { nom, code, actif: true }
    });
    return instance;
  } catch (error) {
    const existing = await Langue.findOne({ where: { nom } });
    return existing;
  }
}

/**
 * Trouve ou cree un emplacement
 */
async function findOrCreateEmplacement(libelle) {
  if (!libelle || libelle.trim().length === 0) return null;

  const cleanLibelle = libelle.trim();

  try {
    const [instance] = await EmplacementJeu.findOrCreate({
      where: { libelle: cleanLibelle },
      defaults: { libelle: cleanLibelle, actif: true }
    });
    return instance;
  } catch (error) {
    const existing = await EmplacementJeu.findOne({ where: { libelle: cleanLibelle } });
    return existing;
  }
}

/**
 * Trouve ou cree une gamme
 */
async function findOrCreateGamme(nom) {
  if (!nom || nom.trim().length === 0) return null;

  const cleanNom = nom.trim();

  try {
    const [instance] = await Gamme.findOrCreate({
      where: { nom: cleanNom },
      defaults: { nom: cleanNom, actif: true }
    });
    return instance;
  } catch (error) {
    const existing = await Gamme.findOne({ where: { nom: cleanNom } });
    return existing;
  }
}

/**
 * Cree les relations many-to-many pour un jeu
 */
async function createJeuRelations(jeu, rawData, mapping) {
  // Categories
  const categoriesField = Object.keys(mapping).find(k => mapping[k] === 'categories');
  if (categoriesField && rawData[categoriesField]) {
    const values = parseMultiValue(rawData[categoriesField]);
    for (const catNom of values) {
      const categorie = await findOrCreateRef(Categorie, catNom);
      if (categorie) {
        await JeuCategorie.findOrCreate({
          where: { jeu_id: jeu.id, categorie_id: categorie.id }
        }).catch(() => {});
      }
    }
  }

  // Themes
  const themesField = Object.keys(mapping).find(k => mapping[k] === 'themes');
  if (themesField && rawData[themesField]) {
    const values = parseMultiValue(rawData[themesField]);
    for (const themeNom of values) {
      const theme = await findOrCreateRef(Theme, themeNom);
      if (theme) {
        await JeuTheme.findOrCreate({
          where: { jeu_id: jeu.id, theme_id: theme.id }
        }).catch(() => {});
      }
    }
  }

  // Mecanismes
  const mecanismesField = Object.keys(mapping).find(k => mapping[k] === 'mecanismes');
  if (mecanismesField && rawData[mecanismesField]) {
    const values = parseMultiValue(rawData[mecanismesField]);
    for (const mecaNom of values) {
      const mecanisme = await findOrCreateRef(Mecanisme, mecaNom);
      if (mecanisme) {
        await JeuMecanisme.findOrCreate({
          where: { jeu_id: jeu.id, mecanisme_id: mecanisme.id }
        }).catch(() => {});
      }
    }
  }

  // Langues
  const languesField = Object.keys(mapping).find(k => mapping[k] === 'langues');
  if (languesField && rawData[languesField]) {
    const values = parseMultiValue(rawData[languesField]);
    for (const langueNom of values) {
      const langue = await findOrCreateLangue(langueNom);
      if (langue) {
        await JeuLangue.findOrCreate({
          where: { jeu_id: jeu.id, langue_id: langue.id }
        }).catch(() => {});
      }
    }
  }

  // Editeurs
  const editeurField = Object.keys(mapping).find(k => mapping[k] === 'editeur');
  if (editeurField && rawData[editeurField]) {
    const values = parseMultiValue(rawData[editeurField]);
    for (const editeurNom of values) {
      const editeur = await findOrCreateRef(Editeur, editeurNom);
      if (editeur) {
        await JeuEditeur.findOrCreate({
          where: { jeu_id: jeu.id, editeur_id: editeur.id }
        }).catch(() => {});
      }
    }
  }

  // Auteurs
  const auteurField = Object.keys(mapping).find(k => mapping[k] === 'auteur');
  if (auteurField && rawData[auteurField]) {
    const values = parseMultiValue(rawData[auteurField]);
    for (const auteurNom of values) {
      const auteur = await findOrCreateRef(Auteur, auteurNom);
      if (auteur) {
        await JeuAuteur.findOrCreate({
          where: { jeu_id: jeu.id, auteur_id: auteur.id }
        }).catch(() => {});
      }
    }
  }

  // Illustrateurs
  const illustrateurField = Object.keys(mapping).find(k => mapping[k] === 'illustrateur');
  if (illustrateurField && rawData[illustrateurField]) {
    const values = parseMultiValue(rawData[illustrateurField]);
    for (const illusNom of values) {
      const illustrateur = await findOrCreateRef(Illustrateur, illusNom);
      if (illustrateur) {
        await JeuIllustrateur.findOrCreate({
          where: { jeu_id: jeu.id, illustrateur_id: illustrateur.id }
        }).catch(() => {});
      }
    }
  }

  // Gamme (N:1)
  const gammeField = Object.keys(mapping).find(k => mapping[k] === 'gamme');
  if (gammeField && rawData[gammeField] && !jeu.gamme_id) {
    const gamme = await findOrCreateGamme(rawData[gammeField]);
    if (gamme) {
      await jeu.update({ gamme_id: gamme.id });
    }
  }

  // Emplacement (N:1)
  const emplacementField = Object.keys(mapping).find(k => mapping[k] === 'emplacement');
  if (emplacementField && rawData[emplacementField] && !jeu.emplacement_id) {
    const emplacement = await findOrCreateEmplacement(rawData[emplacementField]);
    if (emplacement) {
      await jeu.update({ emplacement_id: emplacement.id });
    }
  }
}

/**
 * Transforme une ligne CSV en objet Jeu selon le mapping
 */
function transformRow(row, mapping) {
  const jeu = {
    statut: 'disponible'
  };

  Object.entries(mapping).forEach(([csvCol, jeuField]) => {
    const value = row[csvCol];
    if (!value || value.toString().trim() === '') return;

    switch (jeuField) {
      // Identifiants
      case 'id_externe':
        const idExt = parseInt(value);
        if (!isNaN(idExt)) jeu.id_externe = idExt;
        break;

      case 'ean':
        jeu.ean = value.toString().trim();
        break;

      // Texte simple
      case 'titre':
        jeu.titre = value.toString().trim();
        break;

      case 'sous_titre':
        jeu.sous_titre = value.toString().trim();
        break;

      case 'editeur':
        jeu.editeur = value.toString().trim();
        break;

      case 'auteur':
        jeu.auteur = value.toString().trim();
        break;

      case 'illustrateur':
        jeu.illustrateur = value.toString().trim();
        break;

      case 'univers':
        jeu.univers = value.toString().trim();
        break;

      case 'gamme':
        jeu.gamme = value.toString().trim();
        break;

      case 'emplacement':
        jeu.emplacement = value.toString().trim();
        break;

      case 'proprietaire':
        jeu.proprietaire = value.toString().trim();
        break;

      case 'reference':
        jeu.reference = value.toString().trim();
        break;

      case 'referent':
        jeu.referent = value.toString().trim();
        break;

      case 'notes':
        jeu.notes = value.toString().trim();
        break;

      case 'dimensions':
        jeu.dimensions = value.toString().trim();
        break;

      case 'poids':
        jeu.poids = value.toString().trim();
        break;

      // Multi-valeurs (stockes tels quels)
      case 'langues':
        jeu.langues = value.toString().trim();
        break;

      case 'categories':
        jeu.categories = value.toString().trim();
        break;

      case 'themes':
        jeu.themes = value.toString().trim();
        break;

      case 'mecanismes':
        jeu.mecanismes = value.toString().trim();
        break;

      // Parsing special
      case 'type_jeu':
        jeu.type_jeu = parseTypeJeu(value);
        break;

      case 'joueurs':
        const { min, max } = parseJoueurs(value);
        if (min !== null) jeu.nb_joueurs_min = min;
        if (max !== null) jeu.nb_joueurs_max = max;
        break;

      case 'duree_partie':
        const duree = parseDuree(value);
        if (duree !== null) jeu.duree_partie = duree;
        break;

      case 'age_min':
        const age = parseAge(value);
        if (age !== null) jeu.age_min = age;
        break;

      case 'annee_sortie':
        const year = parseInt(value);
        if (year >= 1900 && year <= new Date().getFullYear() + 1) {
          jeu.annee_sortie = year;
        }
        break;

      case 'date_acquisition':
        const dateAcq = parseDate(value);
        if (dateAcq) jeu.date_acquisition = dateAcq;
        break;

      case 'derniere_partie':
        const datePart = parseDate(value);
        if (datePart) jeu.derniere_partie = datePart;
        break;

      // Prix
      case 'prix_indicatif':
        const prixInd = parsePrix(value);
        if (prixInd !== null) jeu.prix_indicatif = prixInd;
        break;

      case 'prix_achat':
        const prixAch = parsePrix(value);
        if (prixAch !== null) jeu.prix_achat = prixAch;
        break;

      // Booleens
      case 'gratuit':
        jeu.gratuit = parseBoolean(value);
        break;

      case 'cadeau':
        jeu.cadeau = parseBoolean(value);
        break;

      case 'prive':
        jeu.prive = parseBoolean(value);
        break;

      case 'protege':
        jeu.protege = parseBoolean(value);
        break;

      case 'organise':
        jeu.organise = parseBoolean(value);
        break;

      case 'personnalise':
        jeu.personnalise = parseBoolean(value);
        break;

      case 'figurines_peintes':
        jeu.figurines_peintes = parseBoolean(value);
        break;

      // Enums
      case 'etat':
        const etat = parseEtat(value);
        if (etat) jeu.etat = etat;
        break;
    }
  });

  return jeu;
}

/**
 * Preview d'un import CSV
 * POST /api/import/jeux/preview
 */
const previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Aucun fichier fourni'
      });
    }

    const separator = req.body.separator || ';';
    const { columns, rows } = await parseCSV(req.file.path, separator);

    // Suggerer le mapping
    const mapping = suggestMapping(columns);

    // Transformer les 10 premieres lignes pour preview
    const previewRows = rows.slice(0, 10).map(row => transformRow(row, mapping));

    // Nettoyer le fichier temporaire
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      columns,
      mapping,
      totalRows: rows.length,
      preview: previewRows,
      rawPreview: rows.slice(0, 5) // Donnees brutes pour debug
    });

  } catch (error) {
    console.error('Erreur preview import:', error);

    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Import effectif des jeux
 * POST /api/import/jeux
 */
const importJeux = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Aucun fichier fourni'
      });
    }

    const separator = req.body.separator || ';';
    const customMapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;
    const skipDuplicates = req.body.skipDuplicates === 'true';
    const updateExisting = req.body.updateExisting === 'true';

    const { columns, rows } = await parseCSV(req.file.path, separator);

    // Utiliser le mapping custom ou le suggere
    const mapping = customMapping || suggestMapping(columns);

    const results = {
      total: rows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Importer chaque ligne
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // +2 car ligne 1 = headers

      try {
        const jeuData = transformRow(row, mapping);

        // Verifier que le titre existe
        if (!jeuData.titre) {
          results.errors.push({
            line: lineNum,
            error: 'Titre manquant',
            data: row
          });
          continue;
        }

        // Chercher un jeu existant (par EAN ou titre)
        let existing = null;
        if (jeuData.ean) {
          existing = await Jeu.findOne({ where: { ean: jeuData.ean } });
        }
        if (!existing) {
          existing = await Jeu.findOne({ where: { titre: jeuData.titre } });
        }

        let jeuInstance = null;

        if (existing) {
          if (updateExisting) {
            // Mettre a jour le jeu existant
            await existing.update(jeuData);
            jeuInstance = existing;
            results.updated++;
          } else if (skipDuplicates) {
            results.skipped++;
          } else {
            // Creer quand meme (doublon)
            jeuInstance = await Jeu.create(jeuData);
            results.imported++;
          }
        } else {
          // Creer le jeu
          jeuInstance = await Jeu.create(jeuData);
          results.imported++;
        }

        // Creer les relations many-to-many avec les referentiels
        if (jeuInstance) {
          await createJeuRelations(jeuInstance, row, mapping);
        }

      } catch (error) {
        results.errors.push({
          line: lineNum,
          error: error.message,
          data: row
        });
      }
    }

    // Nettoyer le fichier temporaire
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Erreur import:', error);

    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Retourne les champs disponibles pour le mapping
 * GET /api/import/jeux/fields
 */
const getAvailableFields = async (req, res) => {
  const fields = [
    // Obligatoire
    { id: 'titre', label: 'Titre', required: true, group: 'Informations de base' },

    // Identifiants
    { id: 'id_externe', label: 'ID externe (source)', group: 'Identifiants' },
    { id: 'ean', label: 'Code EAN', group: 'Identifiants' },

    // Informations de base
    { id: 'sous_titre', label: 'Sous-titre', group: 'Informations de base' },
    { id: 'type_jeu', label: 'Type (basegame/extension)', group: 'Informations de base' },
    { id: 'annee_sortie', label: 'Annee de sortie', group: 'Informations de base' },

    // Personnes
    { id: 'editeur', label: 'Editeur(s)', group: 'Personnes' },
    { id: 'auteur', label: 'Auteur(s)', group: 'Personnes' },
    { id: 'illustrateur', label: 'Illustrateur(s)', group: 'Personnes' },

    // Caracteristiques
    { id: 'joueurs', label: 'Nombre de joueurs', group: 'Caracteristiques' },
    { id: 'duree_partie', label: 'Duree (minutes)', group: 'Caracteristiques' },
    { id: 'age_min', label: 'Age minimum', group: 'Caracteristiques' },
    { id: 'langues', label: 'Langues', group: 'Caracteristiques' },

    // Classification
    { id: 'categories', label: 'Categories', group: 'Classification' },
    { id: 'themes', label: 'Themes', group: 'Classification' },
    { id: 'mecanismes', label: 'Mecanismes', group: 'Classification' },
    { id: 'univers', label: 'Univers', group: 'Classification' },
    { id: 'gamme', label: 'Gamme/Collection', group: 'Classification' },

    // Physique
    { id: 'dimensions', label: 'Dimensions', group: 'Physique' },
    { id: 'poids', label: 'Poids', group: 'Physique' },

    // Prix
    { id: 'prix_indicatif', label: 'Prix indicatif', group: 'Prix' },
    { id: 'prix_achat', label: 'Prix d\'achat', group: 'Prix' },
    { id: 'gratuit', label: 'Gratuit (oui/non)', group: 'Prix' },

    // Gestion
    { id: 'date_acquisition', label: 'Date d\'acquisition', group: 'Gestion' },
    { id: 'emplacement', label: 'Emplacement', group: 'Gestion' },
    { id: 'etat', label: 'Etat (neuf/bon/etc)', group: 'Gestion' },
    { id: 'proprietaire', label: 'Proprietaire', group: 'Gestion' },
    { id: 'cadeau', label: 'Cadeau/Don (oui/non)', group: 'Gestion' },

    // Flags
    { id: 'prive', label: 'Prive (oui/non)', group: 'Flags' },
    { id: 'protege', label: 'Protege (oui/non)', group: 'Flags' },
    { id: 'organise', label: 'Organise (oui/non)', group: 'Flags' },
    { id: 'personnalise', label: 'Personnalise (oui/non)', group: 'Flags' },
    { id: 'figurines_peintes', label: 'Figurines peintes (oui/non)', group: 'Flags' },

    // Notes
    { id: 'notes', label: 'Notes/Commentaire', group: 'Notes' },
    { id: 'reference', label: 'Reference', group: 'Notes' },
    { id: 'referent', label: 'Referent', group: 'Notes' },

    // Stats
    { id: 'derniere_partie', label: 'Derniere partie', group: 'Statistiques' },

    // Special
    { id: 'ignore', label: '-- Ignorer cette colonne --', group: 'Autre' }
  ];

  res.json({ fields });
};

module.exports = {
  previewImport,
  importJeux,
  getAvailableFields
};
