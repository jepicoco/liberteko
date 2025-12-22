/**
 * Middleware de verification de modification d'arbre
 *
 * Verifie que l'arbre de decision n'est pas verrouille
 * avant de permettre une modification.
 */

const { ArbreDecision } = require('../models');

/**
 * Middleware qui verifie si l'arbre est modifiable
 * S'attend a un parametre :id dans la route
 */
async function checkArbreModifiable(req, res, next) {
  try {
    const arbreId = req.params.id;

    if (!arbreId) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'arbre manquant'
      });
    }

    const arbre = await ArbreDecision.findByPk(arbreId);

    if (!arbre) {
      return res.status(404).json({
        success: false,
        error: 'Arbre de decision non trouve'
      });
    }

    if (arbre.verrouille) {
      return res.status(403).json({
        success: false,
        error: 'Cet arbre est verrouille et ne peut plus etre modifie',
        details: {
          verrouille: true,
          date_verrouillage: arbre.date_verrouillage,
          version: arbre.version
        }
      });
    }

    // Ajouter l'arbre a la requete pour eviter une nouvelle requete
    req.arbre = arbre;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la verification de l\'arbre',
      message: error.message
    });
  }
}

module.exports = checkArbreModifiable;
