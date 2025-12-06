/**
 * Middleware d'authentification pour les usagers (adherents)
 * Separe de l'authentification admin
 */

const jwt = require('jsonwebtoken');
const { Adherent } = require('../models');

/**
 * Verifie que l'usager est authentifie via JWT
 */
const authUsager = async (req, res, next) => {
  try {
    // Recuperer le token du header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Non authentifie',
        message: 'Token manquant ou invalide'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Recuperer l'adherent
    const adherent = await Adherent.findByPk(decoded.id);

    if (!adherent) {
      return res.status(401).json({
        error: 'Non authentifie',
        message: 'Adherent non trouve'
      });
    }

    // Verifier que l'adherent est actif
    if (adherent.statut !== 'actif') {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Votre compte est ' + adherent.statut
      });
    }

    // Ajouter l'adherent a la requete
    req.usager = adherent;
    req.usagerId = adherent.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session expiree',
        message: 'Veuillez vous reconnecter'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Veuillez vous reconnecter'
      });
    }

    console.error('Erreur auth usager:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la verification de l\'authentification'
    });
  }
};

/**
 * Optionnel: verifie si l'usager est authentifie sans bloquer
 */
const optionalAuthUsager = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adherent = await Adherent.findByPk(decoded.id);

    if (adherent && adherent.statut === 'actif') {
      req.usager = adherent;
      req.usagerId = adherent.id;
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    next();
  }
};

module.exports = {
  authUsager,
  optionalAuthUsager
};
