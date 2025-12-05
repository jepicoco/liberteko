/**
 * Service Jours Fériés
 * Calcul des jours fériés pour différents pays (FR, CH, DE, BE)
 */

const { FermetureExceptionnelle } = require('../models');

/**
 * Calcule la date de Pâques (algorithme de Meeus/Jones/Butcher)
 * @param {number} annee - L'année
 * @returns {Date} Date du dimanche de Pâques
 */
function calculerPaques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(annee, mois - 1, jour);
}

/**
 * Ajoute des jours à une date
 * @param {Date} date - Date de base
 * @param {number} jours - Nombre de jours à ajouter
 * @returns {Date} Nouvelle date
 */
function ajouterJours(date, jours) {
  const result = new Date(date);
  result.setDate(result.getDate() + jours);
  return result;
}

/**
 * Formate une date en YYYY-MM-DD
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée
 */
function formatDate(date) {
  return date.toISOString().substring(0, 10);
}

/**
 * Retourne les jours fériés fixes pour un pays
 * @param {string} pays - Code pays (FR, CH, DE, BE)
 * @param {number} annee - L'année
 * @returns {Array} Liste des jours fériés fixes
 */
function getJoursFeriesFixes(pays, annee) {
  const feries = [];

  // Jours fériés communs à tous
  feries.push({ date: `${annee}-01-01`, nom: 'Jour de l\'An' });
  feries.push({ date: `${annee}-12-25`, nom: 'Noël' });

  switch (pays) {
    case 'FR':
      feries.push({ date: `${annee}-05-01`, nom: 'Fête du Travail' });
      feries.push({ date: `${annee}-05-08`, nom: 'Victoire 1945' });
      feries.push({ date: `${annee}-07-14`, nom: 'Fête Nationale' });
      feries.push({ date: `${annee}-08-15`, nom: 'Assomption' });
      feries.push({ date: `${annee}-11-01`, nom: 'Toussaint' });
      feries.push({ date: `${annee}-11-11`, nom: 'Armistice 1918' });
      break;

    case 'CH':
      feries.push({ date: `${annee}-08-01`, nom: 'Fête Nationale Suisse' });
      // Note: Les autres jours fériés varient selon les cantons
      feries.push({ date: `${annee}-12-26`, nom: 'Saint-Étienne' });
      break;

    case 'DE':
      feries.push({ date: `${annee}-05-01`, nom: 'Tag der Arbeit' });
      feries.push({ date: `${annee}-10-03`, nom: 'Tag der Deutschen Einheit' });
      feries.push({ date: `${annee}-12-26`, nom: 'Zweiter Weihnachtsfeiertag' });
      break;

    case 'BE':
      feries.push({ date: `${annee}-05-01`, nom: 'Fête du Travail' });
      feries.push({ date: `${annee}-07-21`, nom: 'Fête Nationale Belge' });
      feries.push({ date: `${annee}-08-15`, nom: 'Assomption' });
      feries.push({ date: `${annee}-11-01`, nom: 'Toussaint' });
      feries.push({ date: `${annee}-11-11`, nom: 'Armistice' });
      break;
  }

  return feries;
}

/**
 * Retourne les jours fériés mobiles (basés sur Pâques)
 * @param {string} pays - Code pays (FR, CH, DE, BE)
 * @param {number} annee - L'année
 * @returns {Array} Liste des jours fériés mobiles
 */
function getJoursFeriesMobiles(pays, annee) {
  const paques = calculerPaques(annee);
  const feries = [];

  // Commun à tous
  feries.push({
    date: formatDate(ajouterJours(paques, 1)),
    nom: 'Lundi de Pâques'
  });

  switch (pays) {
    case 'FR':
      feries.push({
        date: formatDate(ajouterJours(paques, 39)),
        nom: 'Ascension'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 50)),
        nom: 'Lundi de Pentecôte'
      });
      break;

    case 'CH':
      feries.push({
        date: formatDate(ajouterJours(paques, -2)),
        nom: 'Vendredi Saint'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 39)),
        nom: 'Ascension'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 50)),
        nom: 'Lundi de Pentecôte'
      });
      break;

    case 'DE':
      feries.push({
        date: formatDate(ajouterJours(paques, -2)),
        nom: 'Karfreitag'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 39)),
        nom: 'Christi Himmelfahrt'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 50)),
        nom: 'Pfingstmontag'
      });
      break;

    case 'BE':
      feries.push({
        date: formatDate(ajouterJours(paques, 39)),
        nom: 'Ascension'
      });
      feries.push({
        date: formatDate(ajouterJours(paques, 50)),
        nom: 'Lundi de Pentecôte'
      });
      break;
  }

  return feries;
}

/**
 * Retourne tous les jours fériés pour un pays et une année
 * @param {string} pays - Code pays (FR, CH, DE, BE)
 * @param {number} annee - L'année
 * @returns {Array} Liste complète des jours fériés triée par date
 */
function getJoursFeries(pays, annee) {
  const fixes = getJoursFeriesFixes(pays, annee);
  const mobiles = getJoursFeriesMobiles(pays, annee);

  return [...fixes, ...mobiles].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Vérifie si une date est un jour férié
 * @param {Date|string} date - Date à vérifier
 * @param {string} pays - Code pays (FR, CH, DE, BE)
 * @returns {Object|null} Jour férié ou null
 */
function estJourFerie(date, pays) {
  const dateStr = typeof date === 'string' ? date : formatDate(date);
  const annee = parseInt(dateStr.substring(0, 4));

  const feries = getJoursFeries(pays, annee);
  return feries.find(f => f.date === dateStr) || null;
}

/**
 * Importe les jours fériés comme fermetures exceptionnelles
 * @param {number|null} siteId - ID du site (null pour tous)
 * @param {string} pays - Code pays
 * @param {number} annee - L'année
 * @returns {Promise<Object>} Résultat de l'import
 */
async function importerJoursFeries(siteId, pays, annee) {
  try {
    const feries = getJoursFeries(pays, annee);

    if (feries.length === 0) {
      return { success: false, message: 'Aucun jour férié trouvé' };
    }

    let importes = 0;
    let ignores = 0;

    for (const ferie of feries) {
      // Vérifier si ce jour férié existe déjà
      const existant = await FermetureExceptionnelle.findOne({
        where: {
          site_id: siteId,
          date_debut: ferie.date,
          date_fin: ferie.date,
          type: 'ferie'
        }
      });

      if (existant) {
        ignores++;
        continue;
      }

      await FermetureExceptionnelle.create({
        site_id: siteId,
        date_debut: ferie.date,
        date_fin: ferie.date,
        motif: ferie.nom,
        type: 'ferie',
        recurrent_annuel: false
      });

      importes++;
    }

    return {
      success: true,
      importes,
      ignores,
      total: feries.length,
      message: `${importes} jour(s) férié(s) importé(s), ${ignores} déjà existant(s)`
    };

  } catch (error) {
    console.error('Erreur import jours fériés:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Liste les pays supportés
 * @returns {Array} Liste des pays
 */
function getPaysSupportes() {
  return [
    { code: 'FR', nom: 'France' },
    { code: 'CH', nom: 'Suisse' },
    { code: 'DE', nom: 'Allemagne' },
    { code: 'BE', nom: 'Belgique' }
  ];
}

module.exports = {
  calculerPaques,
  getJoursFeries,
  getJoursFeriesFixes,
  getJoursFeriesMobiles,
  estJourFerie,
  importerJoursFeries,
  getPaysSupportes
};
