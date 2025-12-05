/**
 * Controller pour la gestion des modules actifs
 */

const { ModuleActif } = require('../models');

/**
 * Recuperer la liste des codes de modules actifs (pour le frontend)
 */
exports.getActifs = async (req, res) => {
  try {
    const modulesActifs = await ModuleActif.getActifs();
    res.json(modulesActifs);
  } catch (error) {
    console.error('Erreur recuperation modules actifs:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des modules actifs',
      message: error.message
    });
  }
};

/**
 * Recuperer tous les modules avec leurs details (admin)
 */
exports.getAll = async (req, res) => {
  try {
    const modules = await ModuleActif.getAllWithDetails();
    res.json(modules);
  } catch (error) {
    console.error('Erreur recuperation modules:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des modules',
      message: error.message
    });
  }
};

/**
 * Activer/desactiver un module
 */
exports.toggle = async (req, res) => {
  try {
    const { code } = req.params;

    const module = await ModuleActif.toggleModule(code);

    res.json({
      success: true,
      message: `Module ${module.libelle} ${module.actif ? 'active' : 'desactive'}`,
      module
    });
  } catch (error) {
    console.error('Erreur toggle module:', error);

    if (error.message.includes('introuvable')) {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la modification du module',
      message: error.message
    });
  }
};

/**
 * Mettre a jour l'etat de plusieurs modules en une fois
 */
exports.updateAll = async (req, res) => {
  try {
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        error: 'Le parametre modules doit etre un tableau'
      });
    }

    const results = [];

    for (const { code, actif } of modules) {
      const module = await ModuleActif.findOne({ where: { code } });
      if (module) {
        module.actif = actif;
        await module.save();
        results.push({ code, actif: module.actif, success: true });
      } else {
        results.push({ code, success: false, error: 'Module introuvable' });
      }
    }

    res.json({
      success: true,
      message: 'Modules mis a jour',
      results
    });
  } catch (error) {
    console.error('Erreur mise a jour modules:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise a jour des modules',
      message: error.message
    });
  }
};

/**
 * Verifier si un module specifique est actif
 */
exports.checkModule = async (req, res) => {
  try {
    const { code } = req.params;
    const isActif = await ModuleActif.isActif(code);

    res.json({
      code,
      actif: isActif
    });
  } catch (error) {
    console.error('Erreur verification module:', error);
    res.status(500).json({
      error: 'Erreur lors de la verification du module',
      message: error.message
    });
  }
};
