/**
 * Helper pour determiner si un article est considere comme "nouveau"
 *
 * Un article est nouveau si:
 * - Le module nouveaute est actif
 * - statut_nouveaute = 'force_nouveau' OU
 * - statut_nouveaute = 'auto' ET date_acquisition < dureeJours
 *
 * Un article n'est PAS nouveau si:
 * - statut_nouveaute = 'jamais_nouveau' OU
 * - Le module nouveaute est inactif
 */

/**
 * Determine si un article est nouveau
 * @param {Object} article - L'article (jeu, livre, film, disque)
 * @param {number} dureeJours - Nombre de jours pendant lesquels un article est considere nouveau
 * @param {boolean} moduleActif - Si le module nouveaute est actif
 * @returns {boolean}
 */
function isNouveau(article, dureeJours, moduleActif = true) {
  // Module desactive = jamais nouveau
  if (!moduleActif) return false;

  // Pas d'article = pas nouveau
  if (!article) return false;

  // Forcer nouveau
  if (article.statut_nouveaute === 'force_nouveau') return true;

  // Jamais nouveau
  if (article.statut_nouveaute === 'jamais_nouveau') return false;

  // Mode auto: verifier la date d'acquisition
  const dateRef = article.date_acquisition || article.created_at;
  if (!dateRef) return false;

  const limite = new Date();
  limite.setDate(limite.getDate() - dureeJours);

  return new Date(dateRef) >= limite;
}

/**
 * Enrichit un article avec le champ est_nouveau
 * @param {Object} article - L'article brut
 * @param {Object} params - Parametres de nouveaute { duree, actif }
 * @returns {Object} - Article enrichi avec est_nouveau
 */
function enrichirAvecNouveaute(article, params) {
  if (!article) return article;

  const plain = article.get ? article.get({ plain: true }) : { ...article };
  plain.est_nouveau = isNouveau(plain, params.duree, params.actif);

  return plain;
}

/**
 * Enrichit une liste d'articles avec le champ est_nouveau
 * @param {Array} articles - Liste d'articles
 * @param {Object} params - Parametres de nouveaute { duree, actif }
 * @returns {Array} - Articles enrichis
 */
function enrichirListeAvecNouveaute(articles, params) {
  if (!articles || !Array.isArray(articles)) return articles;
  return articles.map(a => enrichirAvecNouveaute(a, params));
}

/**
 * Obtenir les parametres de nouveaute pour un module
 * @param {Object} parametresFront - Instance de ParametresFront
 * @param {string} module - 'ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'
 * @returns {Object} - { duree: number, actif: boolean }
 */
function getParamsNouveaute(parametresFront, module) {
  const suffixes = {
    'jeu': 'ludotheque',
    'jeux': 'ludotheque',
    'ludotheque': 'ludotheque',
    'livre': 'bibliotheque',
    'livres': 'bibliotheque',
    'bibliotheque': 'bibliotheque',
    'film': 'filmotheque',
    'films': 'filmotheque',
    'filmotheque': 'filmotheque',
    'disque': 'discotheque',
    'disques': 'discotheque',
    'discotheque': 'discotheque'
  };

  const suffix = suffixes[module.toLowerCase()] || module;

  return {
    duree: parametresFront[`nouveaute_duree_${suffix}`] || 30,
    actif: parametresFront[`nouveaute_active_${suffix}`] !== false
  };
}

/**
 * Construit une clause WHERE Sequelize pour filtrer les nouveautes
 * @param {string} module - 'ludotheque', 'bibliotheque', etc.
 * @param {Object} parametresFront - Instance de ParametresFront
 * @returns {Object|null} - Clause WHERE ou null si module inactif
 */
function buildNouveauteWhereClause(module, parametresFront) {
  const Op = require('sequelize').Op;
  const params = getParamsNouveaute(parametresFront, module);

  if (!params.actif) return null;

  const limite = new Date();
  limite.setDate(limite.getDate() - params.duree);

  return {
    [Op.or]: [
      { statut_nouveaute: 'force_nouveau' },
      {
        [Op.and]: [
          { statut_nouveaute: 'auto' },
          {
            [Op.or]: [
              { date_acquisition: { [Op.gte]: limite } },
              {
                [Op.and]: [
                  { date_acquisition: null },
                  { created_at: { [Op.gte]: limite } }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

module.exports = {
  isNouveau,
  enrichirAvecNouveaute,
  enrichirListeAvecNouveaute,
  getParamsNouveaute,
  buildNouveauteWhereClause
};
