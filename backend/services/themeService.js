/**
 * Service de gestion des thèmes depuis le filesystem
 *
 * Les thèmes sont détectés automatiquement depuis le dossier frontend/themes/
 * Chaque thème doit contenir un fichier manifest.json avec ses métadonnées.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Chemin vers le dossier des thèmes
const THEMES_PATH = path.join(__dirname, '../../frontend/themes');

// Cache des thèmes (invalidé au reload)
let themesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Structure d'un manifest.json de thème
 * @typedef {Object} ThemeManifest
 * @property {string} name - Nom du thème affiché
 * @property {string} version - Version du thème (semver)
 * @property {string} description - Description du thème
 * @property {string} author - Auteur du thème
 * @property {string} mode - Mode du thème ('light' ou 'dark')
 * @property {Object} colors - Couleurs du thème
 * @property {string} colors.primary - Couleur primaire
 * @property {string} colors.secondary - Couleur secondaire
 * @property {string} colors.accent - Couleur d'accent
 * @property {string} colors.background - Couleur de fond principale
 * @property {string} colors.backgroundSecondary - Couleur de fond secondaire
 * @property {string} colors.text - Couleur du texte principal
 * @property {string} colors.textSecondary - Couleur du texte secondaire
 * @property {Object} style - Options de style
 * @property {string} style.borderRadius - Rayon des bordures (ex: '8px')
 * @property {string} style.shadowStyle - Style d'ombre ('subtle', 'medium', 'strong')
 * @property {string} preview - Nom du fichier de prévisualisation (optionnel)
 * @property {Array<string>} pages - Liste des pages personnalisées
 */

/**
 * Lit le manifest.json d'un thème
 * @param {string} themeCode - Code du thème (nom du dossier)
 * @returns {ThemeManifest|null}
 */
function readManifest(themeCode) {
  const manifestPath = path.join(THEMES_PATH, themeCode, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);
    return manifest;
  } catch (error) {
    logger.warn(`Erreur lecture manifest pour thème ${themeCode}:`, error.message);
    return null;
  }
}

/**
 * Scanne le dossier des thèmes et retourne la liste des thèmes disponibles
 * @param {boolean} forceRefresh - Force le rafraîchissement du cache
 * @returns {Array<Object>}
 */
function scanThemes(forceRefresh = false) {
  const now = Date.now();

  // Utiliser le cache si valide
  if (!forceRefresh && themesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return themesCache;
  }

  const themes = [];

  if (!fs.existsSync(THEMES_PATH)) {
    logger.warn('Dossier themes non trouvé:', THEMES_PATH);
    return themes;
  }

  const entries = fs.readdirSync(THEMES_PATH, { withFileTypes: true });

  for (const entry of entries) {
    // Ignorer les fichiers et dossiers cachés
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    const themeCode = entry.name;
    const themePath = path.join(THEMES_PATH, themeCode);
    const manifest = readManifest(themeCode);

    // Lister les fichiers présents
    const files = {
      hasCSS: fs.existsSync(path.join(themePath, 'css', 'theme.css')),
      hasJS: fs.existsSync(path.join(themePath, 'js')),
      pages: []
    };

    // Lister les pages HTML personnalisées
    const htmlFiles = fs.readdirSync(themePath).filter(f => f.endsWith('.html'));
    files.pages = htmlFiles;

    // Lister les sous-dossiers de pages (usager/, etc.)
    const subdirs = fs.readdirSync(themePath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !['css', 'js', 'images', 'assets'].includes(d.name));

    for (const subdir of subdirs) {
      const subdirPath = path.join(themePath, subdir.name);
      const subdirHtmlFiles = fs.readdirSync(subdirPath).filter(f => f.endsWith('.html'));
      files.pages.push(...subdirHtmlFiles.map(f => `${subdir.name}/${f}`));
    }

    const theme = {
      code: themeCode,
      path: themePath,
      hasManifest: !!manifest,
      name: manifest?.name || themeCode,
      version: manifest?.version || '1.0.0',
      description: manifest?.description || '',
      author: manifest?.author || 'Unknown',
      mode: manifest?.mode || 'light',
      colors: manifest?.colors || {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#20c997',
        background: '#ffffff',
        backgroundSecondary: '#f8f9fa',
        text: '#333333',
        textSecondary: '#6c757d'
      },
      style: manifest?.style || {
        borderRadius: '8px',
        shadowStyle: 'subtle'
      },
      preview: manifest?.preview || null,
      files
    };

    themes.push(theme);
  }

  // Trier: default en premier, puis par nom
  themes.sort((a, b) => {
    if (a.code === 'default') return -1;
    if (b.code === 'default') return 1;
    return a.name.localeCompare(b.name);
  });

  // Mettre en cache
  themesCache = themes;
  cacheTimestamp = now;

  return themes;
}

/**
 * Récupère un thème par son code
 * @param {string} themeCode
 * @returns {Object|null}
 */
function getTheme(themeCode) {
  const themes = scanThemes();
  return themes.find(t => t.code === themeCode) || null;
}

/**
 * Vérifie si un thème existe
 * @param {string} themeCode
 * @returns {boolean}
 */
function themeExists(themeCode) {
  const themePath = path.join(THEMES_PATH, themeCode);
  return fs.existsSync(themePath) && fs.statSync(themePath).isDirectory();
}

/**
 * Génère le CSS des variables depuis un manifest de thème
 * @param {Object} theme - Objet thème avec colors et style
 * @returns {string}
 */
function generateThemeCSS(theme) {
  const colors = theme.colors || {};
  const style = theme.style || {};

  return `:root {
  /* Couleurs principales */
  --color-primary: ${colors.primary || '#667eea'};
  --color-secondary: ${colors.secondary || '#764ba2'};
  --color-accent: ${colors.accent || '#20c997'};

  /* Fonds */
  --color-background: ${colors.background || '#ffffff'};
  --color-background-secondary: ${colors.backgroundSecondary || '#f8f9fa'};

  /* Textes */
  --color-text: ${colors.text || '#333333'};
  --color-text-secondary: ${colors.textSecondary || '#6c757d'};

  /* États */
  --color-success: ${colors.success || '#10b981'};
  --color-warning: ${colors.warning || '#f59e0b'};
  --color-danger: ${colors.danger || '#ef4444'};
  --color-info: ${colors.info || '#3b82f6'};

  /* Style */
  --border-radius: ${style.borderRadius || '8px'};
  --shadow-style: ${style.shadowStyle || 'subtle'};
}`;
}

/**
 * Invalide le cache des thèmes
 */
function invalidateCache() {
  themesCache = null;
  cacheTimestamp = 0;
}

/**
 * Crée la structure de base pour un nouveau thème
 * @param {string} themeCode
 * @param {Object} manifest - Données du manifest
 * @returns {string} Chemin du thème créé
 */
function createTheme(themeCode, manifest) {
  const themePath = path.join(THEMES_PATH, themeCode);

  if (fs.existsSync(themePath)) {
    throw new Error(`Le thème "${themeCode}" existe déjà`);
  }

  // Créer la structure
  fs.mkdirSync(themePath, { recursive: true });
  fs.mkdirSync(path.join(themePath, 'css'), { recursive: true });
  fs.mkdirSync(path.join(themePath, 'js'), { recursive: true });
  fs.mkdirSync(path.join(themePath, 'images'), { recursive: true });

  // Créer le manifest
  const manifestData = {
    name: manifest.name || themeCode,
    version: manifest.version || '1.0.0',
    description: manifest.description || '',
    author: manifest.author || 'Custom',
    mode: manifest.mode || 'light',
    colors: manifest.colors || {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#20c997',
      background: '#ffffff',
      backgroundSecondary: '#f8f9fa',
      text: '#333333',
      textSecondary: '#6c757d'
    },
    style: manifest.style || {
      borderRadius: '8px',
      shadowStyle: 'subtle'
    }
  };

  fs.writeFileSync(
    path.join(themePath, 'manifest.json'),
    JSON.stringify(manifestData, null, 2),
    'utf8'
  );

  // Créer un CSS de base
  const css = generateThemeCSS(manifestData);
  fs.writeFileSync(path.join(themePath, 'css', 'theme.css'), css, 'utf8');

  // Invalider le cache
  invalidateCache();

  return themePath;
}

/**
 * Met à jour le manifest d'un thème
 * @param {string} themeCode
 * @param {Object} updates
 */
function updateManifest(themeCode, updates) {
  const manifestPath = path.join(THEMES_PATH, themeCode, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest non trouvé pour le thème "${themeCode}"`);
  }

  const manifest = readManifest(themeCode);
  const updated = { ...manifest, ...updates };

  // Fusionner les objets imbriqués
  if (updates.colors) {
    updated.colors = { ...manifest.colors, ...updates.colors };
  }
  if (updates.style) {
    updated.style = { ...manifest.style, ...updates.style };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(updated, null, 2), 'utf8');
  invalidateCache();

  return updated;
}

/**
 * Supprime un thème
 * @param {string} themeCode
 */
function deleteTheme(themeCode) {
  if (themeCode === 'default') {
    throw new Error('Le thème "default" ne peut pas être supprimé');
  }

  const themePath = path.join(THEMES_PATH, themeCode);

  if (!fs.existsSync(themePath)) {
    throw new Error(`Thème "${themeCode}" non trouvé`);
  }

  // Suppression récursive
  fs.rmSync(themePath, { recursive: true, force: true });
  invalidateCache();
}

/**
 * Duplique un thème existant
 * @param {string} sourceCode - Code du thème source
 * @param {string} newCode - Code du nouveau thème
 * @param {string} newName - Nom du nouveau thème
 * @returns {Object} Le nouveau thème
 */
function duplicateTheme(sourceCode, newCode, newName) {
  const sourcePath = path.join(THEMES_PATH, sourceCode);
  const destPath = path.join(THEMES_PATH, newCode);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Thème source "${sourceCode}" non trouvé`);
  }

  if (fs.existsSync(destPath)) {
    throw new Error(`Le thème "${newCode}" existe déjà`);
  }

  // Copier récursivement
  copyDirectory(sourcePath, destPath);

  // Mettre à jour le manifest
  const manifest = readManifest(newCode);
  if (manifest) {
    manifest.name = newName || `${manifest.name} (copie)`;
    fs.writeFileSync(
      path.join(destPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  invalidateCache();
  return getTheme(newCode);
}

/**
 * Copie un répertoire récursivement
 * @param {string} src
 * @param {string} dest
 */
function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  scanThemes,
  getTheme,
  themeExists,
  readManifest,
  generateThemeCSS,
  invalidateCache,
  createTheme,
  updateManifest,
  deleteTheme,
  duplicateTheme,
  THEMES_PATH
};
