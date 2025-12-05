/**
 * Service Vacances Scolaires
 * Récupération des vacances scolaires françaises via API data.education.gouv.fr
 *
 * Note: Ce service ne fonctionne que pour la France.
 * Pour les autres pays (Suisse, Allemagne, Belgique), les vacances
 * doivent être saisies manuellement.
 */

const axios = require('axios');
const { FermetureExceptionnelle } = require('../models');

// URL de l'API OpenData Education Nationale
const API_BASE_URL = 'https://data.education.gouv.fr/api/records/1.0/search/';

/**
 * Récupère les vacances scolaires pour une zone et une année donnée
 * @param {string} zone - Zone académique (A, B ou C)
 * @param {string} anneeScolaire - Année scolaire format "2024-2025"
 * @returns {Promise<Array>} Liste des périodes de vacances
 */
async function getVacancesScolaires(zone, anneeScolaire) {
  try {
    const response = await axios.get(API_BASE_URL, {
      params: {
        dataset: 'fr-en-calendrier-scolaire',
        rows: 100,
        'facet': ['zones', 'annee_scolaire'],
        'refine.zones': `Zone ${zone}`,
        'refine.annee_scolaire': anneeScolaire
      }
    });

    if (!response.data || !response.data.records) {
      return [];
    }

    // Transformer les données
    return response.data.records.map(record => {
      const fields = record.fields;
      return {
        nom: fields.description || 'Vacances',
        date_debut: fields.start_date,
        date_fin: fields.end_date,
        zone: zone,
        annee_scolaire: anneeScolaire
      };
    }).filter(v => v.date_debut && v.date_fin);

  } catch (error) {
    console.error('Erreur API vacances scolaires:', error.message);
    throw new Error('Impossible de récupérer les vacances scolaires');
  }
}

/**
 * Calcule l'année scolaire courante
 * @returns {string} Année scolaire format "2024-2025"
 */
function getAnneeScolaireCourante() {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = now.getMonth(); // 0-11

  // Si on est entre septembre et décembre, c'est l'année en cours - année suivante
  // Sinon c'est l'année précédente - année en cours
  if (mois >= 8) { // Septembre = 8
    return `${annee}-${annee + 1}`;
  } else {
    return `${annee - 1}-${annee}`;
  }
}

/**
 * Récupère les vacances pour l'année scolaire courante et la suivante
 * @param {string} zone - Zone académique (A, B ou C)
 * @returns {Promise<Array>} Liste des vacances
 */
async function getVacancesProchaines(zone) {
  const anneeCourante = getAnneeScolaireCourante();
  const annees = anneeCourante.split('-').map(Number);
  const anneeSuivante = `${annees[1]}-${annees[1] + 1}`;

  const [vacancesCourantes, vacancesSuivantes] = await Promise.all([
    getVacancesScolaires(zone, anneeCourante),
    getVacancesScolaires(zone, anneeSuivante)
  ]);

  return [...vacancesCourantes, ...vacancesSuivantes];
}

/**
 * Importe les vacances scolaires comme fermetures exceptionnelles
 * @param {number|null} siteId - ID du site (null pour tous les sites)
 * @param {string} zone - Zone académique (A, B ou C)
 * @param {string} anneeScolaire - Année scolaire format "2024-2025"
 * @returns {Promise<Object>} Résultat de l'import
 */
async function importerVacances(siteId, zone, anneeScolaire) {
  try {
    const vacances = await getVacancesScolaires(zone, anneeScolaire);

    if (vacances.length === 0) {
      return { success: false, message: 'Aucune vacance trouvée pour cette période' };
    }

    let importes = 0;
    let ignores = 0;

    for (const v of vacances) {
      // Vérifier si cette période existe déjà
      const existante = await FermetureExceptionnelle.findOne({
        where: {
          site_id: siteId,
          date_debut: v.date_debut,
          date_fin: v.date_fin,
          type: 'vacances'
        }
      });

      if (existante) {
        ignores++;
        continue;
      }

      await FermetureExceptionnelle.create({
        site_id: siteId,
        date_debut: v.date_debut,
        date_fin: v.date_fin,
        motif: `${v.nom} (Zone ${zone})`,
        type: 'vacances',
        recurrent_annuel: false
      });

      importes++;
    }

    return {
      success: true,
      importes,
      ignores,
      total: vacances.length,
      message: `${importes} période(s) importée(s), ${ignores} déjà existante(s)`
    };

  } catch (error) {
    console.error('Erreur import vacances:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Liste les zones académiques disponibles
 * @returns {Array} Liste des zones avec descriptions
 */
function getZonesAcademiques() {
  return [
    {
      code: 'A',
      nom: 'Zone A',
      academies: [
        'Besançon', 'Bordeaux', 'Clermont-Ferrand', 'Dijon',
        'Grenoble', 'Limoges', 'Lyon', 'Poitiers'
      ]
    },
    {
      code: 'B',
      nom: 'Zone B',
      academies: [
        'Aix-Marseille', 'Amiens', 'Lille', 'Nancy-Metz',
        'Nantes', 'Nice', 'Orléans-Tours', 'Reims', 'Rennes', 'Strasbourg'
      ]
    },
    {
      code: 'C',
      nom: 'Zone C',
      academies: [
        'Créteil', 'Montpellier', 'Paris', 'Toulouse', 'Versailles'
      ]
    }
  ];
}

module.exports = {
  getVacancesScolaires,
  getVacancesProchaines,
  getAnneeScolaireCourante,
  importerVacances,
  getZonesAcademiques
};
