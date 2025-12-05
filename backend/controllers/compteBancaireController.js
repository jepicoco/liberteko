/**
 * Controller Comptes Bancaires
 * Gestion des RIB multiples
 */

const { CompteBancaire, Site } = require('../models');

/**
 * Récupérer tous les comptes bancaires
 */
exports.getAll = async (req, res) => {
  try {
    const { actif } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const comptes = await CompteBancaire.findAll({
      where,
      include: [
        {
          model: Site,
          as: 'sites',
          attributes: ['id', 'nom', 'code']
        }
      ],
      order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
    });

    res.json(comptes);
  } catch (error) {
    console.error('Erreur getAll comptes bancaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des comptes' });
  }
};

/**
 * Récupérer un compte par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const compte = await CompteBancaire.findByPk(id, {
      include: [
        {
          model: Site,
          as: 'sites',
          attributes: ['id', 'nom', 'code']
        }
      ]
    });

    if (!compte) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    res.json(compte);
  } catch (error) {
    console.error('Erreur getById compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du compte' });
  }
};

/**
 * Récupérer le compte par défaut
 */
exports.getDefault = async (req, res) => {
  try {
    let compte = await CompteBancaire.findOne({
      where: { par_defaut: true, actif: true }
    });

    if (!compte) {
      // Si pas de compte par défaut, prendre le premier actif
      compte = await CompteBancaire.findOne({
        where: { actif: true },
        order: [['id', 'ASC']]
      });
    }

    if (!compte) {
      return res.status(404).json({ error: 'Aucun compte bancaire trouvé' });
    }

    res.json(compte);
  } catch (error) {
    console.error('Erreur getDefault compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du compte' });
  }
};

/**
 * Créer un nouveau compte bancaire
 */
exports.create = async (req, res) => {
  try {
    const { libelle, titulaire, banque, iban, bic, par_defaut } = req.body;

    if (!libelle) {
      return res.status(400).json({ error: 'Le libellé est obligatoire' });
    }

    // Nettoyer l'IBAN (supprimer espaces)
    const ibanClean = iban ? iban.replace(/\s/g, '').toUpperCase() : null;

    const compte = await CompteBancaire.create({
      libelle,
      titulaire,
      banque,
      iban: ibanClean,
      bic: bic ? bic.toUpperCase() : null,
      par_defaut: par_defaut || false,
      actif: true
    });

    res.status(201).json(compte);
  } catch (error) {
    console.error('Erreur create compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

/**
 * Mettre à jour un compte bancaire
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const compte = await CompteBancaire.findByPk(id);
    if (!compte) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    // Nettoyer l'IBAN si fourni
    if (updates.iban) {
      updates.iban = updates.iban.replace(/\s/g, '').toUpperCase();
    }
    if (updates.bic) {
      updates.bic = updates.bic.toUpperCase();
    }

    await compte.update(updates);
    res.json(compte);
  } catch (error) {
    console.error('Erreur update compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du compte' });
  }
};

/**
 * Définir un compte comme par défaut
 */
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;

    const compte = await CompteBancaire.findByPk(id);
    if (!compte) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    // Le hook afterSave du modèle gère la mise à jour des autres comptes
    await compte.update({ par_defaut: true });

    res.json({ message: 'Compte défini par défaut', compte });
  } catch (error) {
    console.error('Erreur setDefault compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la définition par défaut' });
  }
};

/**
 * Supprimer un compte bancaire (soft delete)
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const compte = await CompteBancaire.findByPk(id);
    if (!compte) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    // Vérifier qu'il n'est pas associé à des sites actifs
    const sitesAssocies = await Site.count({
      where: { compte_bancaire_id: id, actif: true }
    });

    if (sitesAssocies > 0) {
      return res.status(400).json({
        error: 'Ce compte est associé à des sites actifs. Réassociez-les d\'abord.'
      });
    }

    // Soft delete
    await compte.update({ actif: false, par_defaut: false });
    res.json({ message: 'Compte désactivé avec succès' });
  } catch (error) {
    console.error('Erreur delete compte bancaire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
};

/**
 * Formater un IBAN pour affichage
 */
exports.formatIban = (req, res) => {
  try {
    const { iban } = req.body;

    if (!iban) {
      return res.status(400).json({ error: 'IBAN requis' });
    }

    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    const ibanFormate = ibanClean.replace(/(.{4})/g, '$1 ').trim();

    res.json({
      iban: ibanClean,
      iban_formate: ibanFormate
    });
  } catch (error) {
    console.error('Erreur formatIban:', error);
    res.status(500).json({ error: 'Erreur lors du formatage' });
  }
};
