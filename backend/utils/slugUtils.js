/**
 * Utilitaires pour la génération et l'extraction de slugs URL
 *
 * Format: {id}-{titre-slugifie}
 * Exemple: 123-les-aventuriers-du-rail
 */

/**
 * Convertit un texte en slug URL-friendly
 * @param {string} text - Le texte à convertir
 * @returns {string} Le slug
 */
function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .normalize('NFD')                     // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '')      // Supprime les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')          // Remplace les caractères non-alphanumériques par des tirets
    .replace(/^-+|-+$/g, '')              // Supprime les tirets en début/fin
    .substring(0, 100);                    // Limite la longueur
}

/**
 * Génère un slug complet avec ID et titre
 * @param {number|string} id - L'identifiant
 * @param {string} titre - Le titre
 * @returns {string} Le slug complet (ex: "123-mon-titre")
 */
function generateSlug(id, titre) {
  const titleSlug = slugify(titre);
  return titleSlug ? `${id}-${titleSlug}` : `${id}`;
}

/**
 * Extrait l'ID numérique d'un slug
 * @param {string} slug - Le slug (ex: "123-mon-titre")
 * @returns {number|null} L'ID ou null si invalide
 */
function extractIdFromSlug(slug) {
  if (!slug) return null;

  const match = slug.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = {
  slugify,
  generateSlug,
  extractIdFromSlug
};
