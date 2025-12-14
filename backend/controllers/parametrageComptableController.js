const {
  JournalComptable,
  CompteComptable,
  ParametrageComptableOperation,
  CompteEncaissementModePaiement,
  TauxTVA,
  SectionAnalytique,
  ModePaiement
} = require('../models');
const ComptabiliteService = require('../services/comptabiliteService');

/**
 * Controleur pour le parametrage comptable avance
 */

// ============================================
// JOURNAUX COMPTABLES
// ============================================

/**
 * Liste tous les journaux comptables
 */
exports.getJournaux = async (req, res) => {
  try {
    const journaux = await JournalComptable.findAll({
      order: [['ordre_affichage', 'ASC']]
    });
    res.json(journaux);
  } catch (error) {
    console.error('Erreur getJournaux:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Recupere un journal par ID
 */
exports.getJournal = async (req, res) => {
  try {
    const journal = await JournalComptable.findByPk(req.params.id);
    if (!journal) {
      return res.status(404).json({ message: 'Journal non trouve' });
    }
    res.json(journal);
  } catch (error) {
    console.error('Erreur getJournal:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Cree un nouveau journal
 */
exports.createJournal = async (req, res) => {
  try {
    const { code, libelle, type, compte_contrepartie, description, actif, ordre_affichage } = req.body;

    // Verifier unicite du code
    const existing = await JournalComptable.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ message: 'Un journal avec ce code existe deja' });
    }

    const journal = await JournalComptable.create({
      code: code.toUpperCase(),
      libelle,
      type,
      compte_contrepartie,
      description,
      actif: actif !== false,
      ordre_affichage: ordre_affichage || 0
    });

    // Vider le cache des libelles
    ComptabiliteService.clearCache();

    res.status(201).json(journal);
  } catch (error) {
    console.error('Erreur createJournal:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Met a jour un journal
 */
exports.updateJournal = async (req, res) => {
  try {
    const journal = await JournalComptable.findByPk(req.params.id);
    if (!journal) {
      return res.status(404).json({ message: 'Journal non trouve' });
    }

    const { code, libelle, type, compte_contrepartie, description, actif, ordre_affichage } = req.body;

    // Verifier unicite du code si modifie
    if (code && code.toUpperCase() !== journal.code) {
      const existing = await JournalComptable.findOne({ where: { code: code.toUpperCase() } });
      if (existing) {
        return res.status(400).json({ message: 'Un journal avec ce code existe deja' });
      }
    }

    await journal.update({
      code: code ? code.toUpperCase() : journal.code,
      libelle: libelle || journal.libelle,
      type: type || journal.type,
      compte_contrepartie: compte_contrepartie !== undefined ? compte_contrepartie : journal.compte_contrepartie,
      description: description !== undefined ? description : journal.description,
      actif: actif !== undefined ? actif : journal.actif,
      ordre_affichage: ordre_affichage !== undefined ? ordre_affichage : journal.ordre_affichage
    });

    // Vider le cache des libelles
    ComptabiliteService.clearCache();

    res.json(journal);
  } catch (error) {
    console.error('Erreur updateJournal:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Supprime un journal
 */
exports.deleteJournal = async (req, res) => {
  try {
    const journal = await JournalComptable.findByPk(req.params.id);
    if (!journal) {
      return res.status(404).json({ message: 'Journal non trouve' });
    }

    await journal.destroy();
    ComptabiliteService.clearCache();

    res.json({ message: 'Journal supprime' });
  } catch (error) {
    console.error('Erreur deleteJournal:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================
// COMPTES COMPTABLES
// ============================================

/**
 * Liste tous les comptes comptables
 */
exports.getComptes = async (req, res) => {
  try {
    const { classe, type, actif } = req.query;
    const where = {};

    if (classe) where.classe = classe;
    if (type) where.type = type;
    if (actif !== undefined) where.actif = actif === 'true';

    const comptes = await CompteComptable.findAll({
      where,
      order: [['numero', 'ASC']]
    });
    res.json(comptes);
  } catch (error) {
    console.error('Erreur getComptes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Recupere l'arborescence des comptes
 */
exports.getComptesArbre = async (req, res) => {
  try {
    const arbre = await CompteComptable.getArbre();
    res.json(arbre);
  } catch (error) {
    console.error('Erreur getComptesArbre:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Recupere un compte par ID
 */
exports.getCompte = async (req, res) => {
  try {
    const compte = await CompteComptable.findByPk(req.params.id, {
      include: [
        { model: CompteComptable, as: 'parent' },
        { model: CompteComptable, as: 'enfants' }
      ]
    });
    if (!compte) {
      return res.status(404).json({ message: 'Compte non trouve' });
    }
    res.json(compte);
  } catch (error) {
    console.error('Erreur getCompte:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Cree un nouveau compte
 */
exports.createCompte = async (req, res) => {
  try {
    const { numero, libelle, classe, type, nature, parent_id, accepte_saisie, description, actif, ordre_affichage } = req.body;

    // Verifier unicite du numero
    const existing = await CompteComptable.findOne({ where: { numero } });
    if (existing) {
      return res.status(400).json({ message: 'Un compte avec ce numero existe deja' });
    }

    const compte = await CompteComptable.create({
      numero,
      libelle,
      classe,
      type: type || 'general',
      nature,
      parent_id,
      accepte_saisie: accepte_saisie !== false,
      description,
      actif: actif !== false,
      ordre_affichage: ordre_affichage || 0
    });

    ComptabiliteService.clearCache();

    res.status(201).json(compte);
  } catch (error) {
    console.error('Erreur createCompte:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Met a jour un compte
 */
exports.updateCompte = async (req, res) => {
  try {
    const compte = await CompteComptable.findByPk(req.params.id);
    if (!compte) {
      return res.status(404).json({ message: 'Compte non trouve' });
    }

    const { numero, libelle, classe, type, nature, parent_id, accepte_saisie, description, actif, ordre_affichage } = req.body;

    // Verifier unicite du numero si modifie
    if (numero && numero !== compte.numero) {
      const existing = await CompteComptable.findOne({ where: { numero } });
      if (existing) {
        return res.status(400).json({ message: 'Un compte avec ce numero existe deja' });
      }
    }

    await compte.update({
      numero: numero || compte.numero,
      libelle: libelle || compte.libelle,
      classe: classe || compte.classe,
      type: type || compte.type,
      nature: nature !== undefined ? nature : compte.nature,
      parent_id: parent_id !== undefined ? parent_id : compte.parent_id,
      accepte_saisie: accepte_saisie !== undefined ? accepte_saisie : compte.accepte_saisie,
      description: description !== undefined ? description : compte.description,
      actif: actif !== undefined ? actif : compte.actif,
      ordre_affichage: ordre_affichage !== undefined ? ordre_affichage : compte.ordre_affichage
    });

    ComptabiliteService.clearCache();

    res.json(compte);
  } catch (error) {
    console.error('Erreur updateCompte:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Supprime un compte
 */
exports.deleteCompte = async (req, res) => {
  try {
    const compte = await CompteComptable.findByPk(req.params.id);
    if (!compte) {
      return res.status(404).json({ message: 'Compte non trouve' });
    }

    // Verifier qu'il n'y a pas d'enfants
    const enfants = await CompteComptable.findAll({ where: { parent_id: compte.id } });
    if (enfants.length > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer un compte ayant des sous-comptes' });
    }

    await compte.destroy();
    ComptabiliteService.clearCache();

    res.json({ message: 'Compte supprime' });
  } catch (error) {
    console.error('Erreur deleteCompte:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================
// PARAMETRAGE DES OPERATIONS
// ============================================

/**
 * Liste tous les parametrages d'operations
 */
exports.getParametrages = async (req, res) => {
  try {
    const parametrages = await ParametrageComptableOperation.findAll({
      include: [
        { model: TauxTVA, as: 'tauxTVA' },
        { model: SectionAnalytique, as: 'sectionAnalytique' }
      ],
      order: [['ordre_affichage', 'ASC']]
    });
    res.json(parametrages);
  } catch (error) {
    console.error('Erreur getParametrages:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Recupere un parametrage par ID
 */
exports.getParametrage = async (req, res) => {
  try {
    const parametrage = await ParametrageComptableOperation.findByPk(req.params.id, {
      include: [
        { model: TauxTVA, as: 'tauxTVA' },
        { model: SectionAnalytique, as: 'sectionAnalytique' }
      ]
    });
    if (!parametrage) {
      return res.status(404).json({ message: 'Parametrage non trouve' });
    }
    res.json(parametrage);
  } catch (error) {
    console.error('Erreur getParametrage:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Recupere un parametrage par type d'operation
 */
exports.getParametrageByType = async (req, res) => {
  try {
    const parametrage = await ParametrageComptableOperation.findOne({
      where: { type_operation: req.params.type },
      include: [
        { model: TauxTVA, as: 'tauxTVA' },
        { model: SectionAnalytique, as: 'sectionAnalytique' }
      ]
    });
    if (!parametrage) {
      return res.status(404).json({ message: 'Parametrage non trouve pour ce type' });
    }
    res.json(parametrage);
  } catch (error) {
    console.error('Erreur getParametrageByType:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Met a jour un parametrage
 */
exports.updateParametrage = async (req, res) => {
  try {
    const parametrage = await ParametrageComptableOperation.findByPk(req.params.id);
    if (!parametrage) {
      return res.status(404).json({ message: 'Parametrage non trouve' });
    }

    const {
      libelle,
      description,
      journal_code,
      compte_produit,
      compte_produit_libelle,
      compte_encaissement_defaut,
      compte_tva,
      taux_tva_id,
      section_analytique_id,
      prefixe_piece,
      generer_ecritures_auto,
      actif,
      ordre_affichage
    } = req.body;

    await parametrage.update({
      libelle: libelle || parametrage.libelle,
      description: description !== undefined ? description : parametrage.description,
      journal_code: journal_code || parametrage.journal_code,
      compte_produit: compte_produit || parametrage.compte_produit,
      compte_produit_libelle: compte_produit_libelle !== undefined ? compte_produit_libelle : parametrage.compte_produit_libelle,
      compte_encaissement_defaut: compte_encaissement_defaut !== undefined ? compte_encaissement_defaut : parametrage.compte_encaissement_defaut,
      compte_tva: compte_tva !== undefined ? compte_tva : parametrage.compte_tva,
      taux_tva_id: taux_tva_id !== undefined ? taux_tva_id : parametrage.taux_tva_id,
      section_analytique_id: section_analytique_id !== undefined ? section_analytique_id : parametrage.section_analytique_id,
      prefixe_piece: prefixe_piece || parametrage.prefixe_piece,
      generer_ecritures_auto: generer_ecritures_auto !== undefined ? generer_ecritures_auto : parametrage.generer_ecritures_auto,
      actif: actif !== undefined ? actif : parametrage.actif,
      ordre_affichage: ordre_affichage !== undefined ? ordre_affichage : parametrage.ordre_affichage
    });

    const updated = await ParametrageComptableOperation.findByPk(parametrage.id, {
      include: [
        { model: TauxTVA, as: 'tauxTVA' },
        { model: SectionAnalytique, as: 'sectionAnalytique' }
      ]
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur updateParametrage:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================
// COMPTES D'ENCAISSEMENT PAR MODE DE PAIEMENT
// ============================================

/**
 * Liste tous les comptes d'encaissement par mode de paiement
 */
exports.getComptesEncaissement = async (req, res) => {
  try {
    const comptes = await CompteEncaissementModePaiement.findAll({
      include: [{
        model: ModePaiement,
        as: 'modePaiement'
      }],
      order: [['id', 'ASC']]
    });
    res.json(comptes);
  } catch (error) {
    console.error('Erreur getComptesEncaissement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Met a jour un compte d'encaissement
 */
exports.updateCompteEncaissement = async (req, res) => {
  try {
    const compte = await CompteEncaissementModePaiement.findByPk(req.params.id);
    if (!compte) {
      return res.status(404).json({ message: 'Configuration non trouvee' });
    }

    const { compte_numero, compte_libelle, journal_code, description, actif } = req.body;

    await compte.update({
      compte_numero: compte_numero || compte.compte_numero,
      compte_libelle: compte_libelle !== undefined ? compte_libelle : compte.compte_libelle,
      journal_code: journal_code !== undefined ? journal_code : compte.journal_code,
      description: description !== undefined ? description : compte.description,
      actif: actif !== undefined ? actif : compte.actif
    });

    const updated = await CompteEncaissementModePaiement.findByPk(compte.id, {
      include: [{
        model: ModePaiement,
        as: 'modePaiement'
      }]
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur updateCompteEncaissement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Cree une configuration de compte d'encaissement pour un mode de paiement
 */
exports.createCompteEncaissement = async (req, res) => {
  try {
    const { mode_paiement_id, compte_numero, compte_libelle, journal_code, description } = req.body;

    // Verifier que le mode de paiement existe
    const mode = await ModePaiement.findByPk(mode_paiement_id);
    if (!mode) {
      return res.status(404).json({ message: 'Mode de paiement non trouve' });
    }

    // Verifier qu'il n'y a pas deja une config
    const existing = await CompteEncaissementModePaiement.findOne({
      where: { mode_paiement_id }
    });
    if (existing) {
      return res.status(400).json({ message: 'Une configuration existe deja pour ce mode de paiement' });
    }

    const compte = await CompteEncaissementModePaiement.create({
      mode_paiement_id,
      compte_numero,
      compte_libelle,
      journal_code,
      description,
      actif: true
    });

    const created = await CompteEncaissementModePaiement.findByPk(compte.id, {
      include: [{
        model: ModePaiement,
        as: 'modePaiement'
      }]
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Erreur createCompteEncaissement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================
// DONNEES DE REFERENCE
// ============================================

/**
 * Liste les taux de TVA pour les selects
 */
exports.getTauxTVA = async (req, res) => {
  try {
    const taux = await TauxTVA.findAll({
      where: { actif: true },
      order: [['taux', 'ASC']]
    });
    res.json(taux);
  } catch (error) {
    console.error('Erreur getTauxTVA:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Liste les sections analytiques pour les selects
 */
exports.getSectionsAnalytiques = async (req, res) => {
  try {
    const sections = await SectionAnalytique.findAll({
      where: { actif: true },
      order: [['axe', 'ASC'], ['ordre_affichage', 'ASC']]
    });
    res.json(sections);
  } catch (error) {
    console.error('Erreur getSectionsAnalytiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Liste les modes de paiement pour les selects
 */
exports.getModesPaiement = async (req, res) => {
  try {
    const modes = await ModePaiement.findAll({
      where: { actif: true },
      order: [['ordre', 'ASC']]
    });
    res.json(modes);
  } catch (error) {
    console.error('Erreur getModesPaiement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
