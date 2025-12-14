/**
 * Service de gestion des factures
 * Création, émission, règlements, avoirs
 */

const { Facture, LigneFacture, ReglementFacture, Utilisateur, Cotisation, ModePaiement, MouvementCaisse, CompteBancaire, sequelize } = require('../models');
const { Op } = require('sequelize');
const CaisseService = require('./caisseService');

class FactureService {
  /**
   * Génère un nouveau numéro de facture
   */
  static async genererNumero(type = 'facture') {
    const prefixe = type === 'avoir' ? 'AVO' : type === 'proforma' ? 'PRO' : 'FAC';
    const annee = new Date().getFullYear();

    // Utiliser le compteur dédié
    const [rows] = await sequelize.query(
      `UPDATE compteurs_factures
       SET dernier_numero = dernier_numero + 1, updated_at = NOW()
       WHERE type_document = ? AND annee = ?`,
      { replacements: [type, annee] }
    );

    const [compteur] = await sequelize.query(
      `SELECT dernier_numero FROM compteurs_factures WHERE type_document = ? AND annee = ?`,
      { replacements: [type, annee], type: sequelize.QueryTypes.SELECT }
    );

    const sequence = compteur?.dernier_numero || 1;
    return `${prefixe}-${annee}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Récupère les factures avec filtres
   */
  static async getFactures(options = {}) {
    const {
      utilisateurId,
      statut,
      type,
      dateDebut,
      dateFin,
      recherche,
      limit = 50,
      offset = 0
    } = options;

    const where = {};

    if (utilisateurId) where.utilisateur_id = utilisateurId;
    if (statut) where.statut = statut;
    if (type) where.type_document = type;
    if (dateDebut || dateFin) {
      where.date_emission = {};
      if (dateDebut) where.date_emission[Op.gte] = dateDebut;
      if (dateFin) where.date_emission[Op.lte] = dateFin;
    }
    if (recherche) {
      where[Op.or] = [
        { numero: { [Op.like]: `%${recherche}%` } },
        { client_nom: { [Op.like]: `%${recherche}%` } },
        { objet: { [Op.like]: `%${recherche}%` } }
      ];
    }

    return await Facture.findAndCountAll({
      where,
      include: [
        { model: Utilisateur, as: 'client', attributes: ['id', 'nom', 'prenom', 'email'] }
      ],
      order: [['date_emission', 'DESC'], ['numero', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Récupère une facture par ID avec toutes les données
   */
  static async getFactureById(id) {
    return await Facture.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'client', attributes: ['id', 'nom', 'prenom', 'email', 'adresse', 'code_postal', 'ville', 'telephone'] },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'prenom'] },
        { model: LigneFacture, as: 'lignes', order: [['ordre', 'ASC']] },
        {
          model: ReglementFacture,
          as: 'reglements',
          where: { statut: 'valide' },
          required: false,
          include: [{ model: ModePaiement, as: 'modePaiement' }]
        },
        { model: Cotisation, as: 'cotisation' },
        { model: Facture, as: 'avoirs' }
      ]
    });
  }

  /**
   * Crée une nouvelle facture vide (brouillon)
   */
  static async creerFacture(data, utilisateurCreateurId) {
    const numero = await this.genererNumero(data.type_document || 'facture');

    // Si un utilisateur client est fourni, récupérer ses infos
    let clientData = {};
    if (data.utilisateur_id) {
      const client = await Utilisateur.findByPk(data.utilisateur_id);
      if (client) {
        clientData = {
          client_nom: client.nom,
          client_prenom: client.prenom,
          client_adresse: client.adresse,
          client_code_postal: client.code_postal,
          client_ville: client.ville,
          client_email: client.email
        };
      }
    }

    const facture = await Facture.create({
      numero,
      type_document: data.type_document || 'facture',
      utilisateur_id: data.utilisateur_id || null,
      client_nom: data.client_nom || clientData.client_nom || 'Client',
      client_prenom: data.client_prenom || clientData.client_prenom || null,
      client_adresse: data.client_adresse || clientData.client_adresse || null,
      client_code_postal: data.client_code_postal || clientData.client_code_postal || null,
      client_ville: data.client_ville || clientData.client_ville || null,
      client_email: data.client_email || clientData.client_email || null,
      date_emission: data.date_emission || new Date(),
      date_echeance: data.date_echeance || null,
      objet: data.objet || null,
      notes: data.notes || null,
      conditions_paiement: data.conditions_paiement || 'Paiement à réception',
      mentions_legales: data.mentions_legales || null,
      exercice: data.exercice || new Date().getFullYear(),
      cotisation_id: data.cotisation_id || null,
      cree_par_id: utilisateurCreateurId,
      statut: 'brouillon'
    });

    return await this.getFactureById(facture.id);
  }

  /**
   * Crée une facture à partir d'une cotisation
   */
  static async creerDepuisCotisation(cotisationId, utilisateurCreateurId) {
    const cotisation = await Cotisation.findByPk(cotisationId, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { association: 'tarif' }
      ]
    });

    if (!cotisation) {
      throw new Error('Cotisation non trouvée');
    }

    // Vérifier si une facture existe déjà
    const factureExistante = await Facture.findOne({
      where: { cotisation_id: cotisationId, type_document: 'facture' }
    });

    if (factureExistante) {
      throw new Error('Une facture existe déjà pour cette cotisation');
    }

    const utilisateur = cotisation.utilisateur;

    // Créer la facture
    const facture = await this.creerFacture({
      type_document: 'facture',
      utilisateur_id: utilisateur.id,
      client_nom: utilisateur.nom,
      client_prenom: utilisateur.prenom,
      client_adresse: utilisateur.adresse,
      client_code_postal: utilisateur.code_postal,
      client_ville: utilisateur.ville,
      client_email: utilisateur.email,
      date_emission: cotisation.date_paiement || new Date(),
      objet: `Cotisation ${cotisation.tarif?.nom || ''}`,
      cotisation_id: cotisationId
    }, utilisateurCreateurId);

    // Ajouter la ligne de cotisation
    await this.ajouterLigne(facture.id, {
      description: `Cotisation ${cotisation.tarif?.nom || 'Adhésion'} - ${cotisation.saison || ''}`,
      quantite: 1,
      prix_unitaire_ht: cotisation.montant_paye,
      taux_tva: 0, // Cotisations généralement exonérées
      compte_comptable: '706100',
      cotisation_id: cotisationId
    });

    // Marquer comme payée si la cotisation est déjà payée
    if (cotisation.statut === 'payee') {
      const factureComplete = await this.getFactureById(facture.id);
      await factureComplete.emettre();

      // Ajouter le règlement
      await this.enregistrerReglement(facture.id, {
        montant: cotisation.montant_paye,
        mode_paiement_code: cotisation.mode_paiement || 'especes',
        date_reglement: cotisation.date_paiement || new Date(),
        reference: cotisation.reference_paiement
      }, utilisateurCreateurId);
    }

    return await this.getFactureById(facture.id);
  }

  /**
   * Met à jour une facture (si brouillon)
   */
  static async mettreAJour(id, data) {
    const facture = await Facture.findByPk(id);

    if (!facture) {
      throw new Error('Facture non trouvée');
    }

    if (facture.statut !== 'brouillon') {
      throw new Error('Seule une facture en brouillon peut être modifiée');
    }

    await facture.update({
      client_nom: data.client_nom !== undefined ? data.client_nom : facture.client_nom,
      client_prenom: data.client_prenom !== undefined ? data.client_prenom : facture.client_prenom,
      client_adresse: data.client_adresse !== undefined ? data.client_adresse : facture.client_adresse,
      client_code_postal: data.client_code_postal !== undefined ? data.client_code_postal : facture.client_code_postal,
      client_ville: data.client_ville !== undefined ? data.client_ville : facture.client_ville,
      client_email: data.client_email !== undefined ? data.client_email : facture.client_email,
      date_echeance: data.date_echeance !== undefined ? data.date_echeance : facture.date_echeance,
      objet: data.objet !== undefined ? data.objet : facture.objet,
      notes: data.notes !== undefined ? data.notes : facture.notes,
      conditions_paiement: data.conditions_paiement !== undefined ? data.conditions_paiement : facture.conditions_paiement,
      mentions_legales: data.mentions_legales !== undefined ? data.mentions_legales : facture.mentions_legales
    });

    return await this.getFactureById(id);
  }

  /**
   * Ajoute une ligne à la facture
   */
  static async ajouterLigne(factureId, data) {
    const facture = await Facture.findByPk(factureId);

    if (!facture) {
      throw new Error('Facture non trouvée');
    }

    if (facture.statut !== 'brouillon') {
      throw new Error('Impossible d\'ajouter des lignes à une facture émise');
    }

    // Trouver le prochain ordre
    const maxOrdre = await LigneFacture.max('ordre', { where: { facture_id: factureId } }) || 0;

    const ligne = await LigneFacture.create({
      facture_id: factureId,
      ordre: maxOrdre + 1,
      reference: data.reference || null,
      description: data.description,
      quantite: data.quantite || 1,
      unite: data.unite || 'unité',
      prix_unitaire_ht: data.prix_unitaire_ht,
      remise_pourcent: data.remise_pourcent || 0,
      taux_tva: data.taux_tva || 0,
      compte_comptable: data.compte_comptable || null,
      section_analytique_id: data.section_analytique_id || null,
      cotisation_id: data.cotisation_id || null
    });

    // Recalculer les totaux
    await facture.calculerTotaux();

    return ligne;
  }

  /**
   * Modifie une ligne
   */
  static async modifierLigne(ligneId, data) {
    const ligne = await LigneFacture.findByPk(ligneId, {
      include: [{ model: Facture, as: 'facture' }]
    });

    if (!ligne) {
      throw new Error('Ligne non trouvée');
    }

    if (ligne.facture.statut !== 'brouillon') {
      throw new Error('Impossible de modifier les lignes d\'une facture émise');
    }

    await ligne.update({
      reference: data.reference !== undefined ? data.reference : ligne.reference,
      description: data.description !== undefined ? data.description : ligne.description,
      quantite: data.quantite !== undefined ? data.quantite : ligne.quantite,
      unite: data.unite !== undefined ? data.unite : ligne.unite,
      prix_unitaire_ht: data.prix_unitaire_ht !== undefined ? data.prix_unitaire_ht : ligne.prix_unitaire_ht,
      remise_pourcent: data.remise_pourcent !== undefined ? data.remise_pourcent : ligne.remise_pourcent,
      taux_tva: data.taux_tva !== undefined ? data.taux_tva : ligne.taux_tva,
      compte_comptable: data.compte_comptable !== undefined ? data.compte_comptable : ligne.compte_comptable
    });

    // Recalculer les totaux
    await ligne.facture.calculerTotaux();

    return ligne;
  }

  /**
   * Supprime une ligne
   */
  static async supprimerLigne(ligneId) {
    const ligne = await LigneFacture.findByPk(ligneId, {
      include: [{ model: Facture, as: 'facture' }]
    });

    if (!ligne) {
      throw new Error('Ligne non trouvée');
    }

    if (ligne.facture.statut !== 'brouillon') {
      throw new Error('Impossible de supprimer les lignes d\'une facture émise');
    }

    const factureId = ligne.facture_id;
    await ligne.destroy();

    // Recalculer les totaux
    const facture = await Facture.findByPk(factureId);
    await facture.calculerTotaux();

    return true;
  }

  /**
   * Émet une facture (passe de brouillon à émise)
   */
  static async emettre(factureId) {
    const facture = await Facture.findByPk(factureId, {
      include: [{ model: LigneFacture, as: 'lignes' }]
    });

    if (!facture) {
      throw new Error('Facture non trouvée');
    }

    if (facture.lignes.length === 0) {
      throw new Error('Impossible d\'émettre une facture sans lignes');
    }

    await facture.emettre();
    return await this.getFactureById(factureId);
  }

  /**
   * Enregistre un règlement
   */
  static async enregistrerReglement(factureId, data, utilisateurId) {
    const facture = await Facture.findByPk(factureId);

    if (!facture) {
      throw new Error('Facture non trouvée');
    }

    if (facture.statut === 'brouillon') {
      throw new Error('Impossible de régler une facture en brouillon');
    }

    if (facture.statut === 'annulee') {
      throw new Error('Impossible de régler une facture annulée');
    }

    const resteAPayer = parseFloat(facture.montant_ttc) - parseFloat(facture.montant_regle);
    if (parseFloat(data.montant) > resteAPayer) {
      throw new Error(`Le montant dépasse le reste à payer (${resteAPayer.toFixed(2)} €)`);
    }

    // Créer un mouvement de caisse si demandé
    let mouvementCaisseId = null;
    if (data.enregistrer_en_caisse) {
      const mouvement = await CaisseService.enregistrerCotisation(
        { montant_paye: data.montant, utilisateur_id: facture.utilisateur_id, id: factureId },
        utilisateurId,
        data.mode_paiement_code
      );
      if (mouvement) {
        mouvementCaisseId = mouvement.id;
      }
    }

    const reglement = await ReglementFacture.create({
      facture_id: factureId,
      date_reglement: data.date_reglement || new Date(),
      montant: data.montant,
      mode_paiement_code: data.mode_paiement_code || 'especes',
      reference: data.reference || null,
      commentaire: data.commentaire || null,
      mouvement_caisse_id: mouvementCaisseId,
      compte_bancaire_id: data.compte_bancaire_id || null,
      enregistre_par_id: utilisateurId
    });

    return await ReglementFacture.findByPk(reglement.id, {
      include: [{ model: ModePaiement, as: 'modePaiement' }]
    });
  }

  /**
   * Annule un règlement
   */
  static async annulerReglement(reglementId, motif) {
    const reglement = await ReglementFacture.findByPk(reglementId);

    if (!reglement) {
      throw new Error('Règlement non trouvé');
    }

    await reglement.annuler(motif);
    return reglement;
  }

  /**
   * Annule une facture
   */
  static async annuler(factureId) {
    const facture = await Facture.findByPk(factureId);

    if (!facture) {
      throw new Error('Facture non trouvée');
    }

    await facture.annuler();
    return await this.getFactureById(factureId);
  }

  /**
   * Crée un avoir pour une facture
   */
  static async creerAvoir(factureId, data, utilisateurId) {
    const factureOrigine = await this.getFactureById(factureId);

    if (!factureOrigine) {
      throw new Error('Facture non trouvée');
    }

    if (factureOrigine.type_document !== 'facture') {
      throw new Error('On ne peut créer un avoir que sur une facture');
    }

    const numero = await this.genererNumero('avoir');

    // Créer l'avoir
    const avoir = await Facture.create({
      numero,
      type_document: 'avoir',
      utilisateur_id: factureOrigine.utilisateur_id,
      client_nom: factureOrigine.client_nom,
      client_prenom: factureOrigine.client_prenom,
      client_adresse: factureOrigine.client_adresse,
      client_code_postal: factureOrigine.client_code_postal,
      client_ville: factureOrigine.client_ville,
      client_email: factureOrigine.client_email,
      date_emission: new Date(),
      objet: `Avoir sur facture ${factureOrigine.numero}`,
      notes: data.motif || 'Avoir',
      facture_avoir_reference_id: factureId,
      exercice: new Date().getFullYear(),
      cree_par_id: utilisateurId,
      statut: 'brouillon'
    });

    // Ajouter les lignes (avec montants négatifs si avoir partiel, ou copie des lignes originales)
    if (data.lignes && data.lignes.length > 0) {
      // Avoir partiel : lignes spécifiées
      for (const ligneData of data.lignes) {
        await this.ajouterLigne(avoir.id, {
          ...ligneData,
          prix_unitaire_ht: -Math.abs(ligneData.prix_unitaire_ht)
        });
      }
    } else {
      // Avoir total : copier toutes les lignes en négatif
      for (const ligne of factureOrigine.lignes) {
        await this.ajouterLigne(avoir.id, {
          reference: ligne.reference,
          description: ligne.description,
          quantite: ligne.quantite,
          unite: ligne.unite,
          prix_unitaire_ht: -Math.abs(ligne.prix_unitaire_ht),
          taux_tva: ligne.taux_tva,
          compte_comptable: ligne.compte_comptable
        });
      }
    }

    return await this.getFactureById(avoir.id);
  }

  /**
   * Statistiques de facturation
   */
  static async getStatistiques(options = {}) {
    const { dateDebut, dateFin, exercice } = options;

    const whereFacture = { type_document: 'facture' };
    if (dateDebut || dateFin) {
      whereFacture.date_emission = {};
      if (dateDebut) whereFacture.date_emission[Op.gte] = dateDebut;
      if (dateFin) whereFacture.date_emission[Op.lte] = dateFin;
    }
    if (exercice) {
      whereFacture.exercice = exercice;
    }

    // Totaux par statut
    const parStatut = await Facture.findAll({
      where: whereFacture,
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nombre'],
        [sequelize.fn('SUM', sequelize.col('montant_ttc')), 'total_ttc'],
        [sequelize.fn('SUM', sequelize.col('montant_regle')), 'total_regle']
      ],
      group: ['statut']
    });

    // Chiffre d'affaires (factures émises/réglées)
    const ca = await Facture.findOne({
      where: {
        ...whereFacture,
        statut: { [Op.in]: ['emise', 'partiellement_reglee', 'reglee'] }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('montant_ht')), 'total_ht'],
        [sequelize.fn('SUM', sequelize.col('montant_tva')), 'total_tva'],
        [sequelize.fn('SUM', sequelize.col('montant_ttc')), 'total_ttc']
      ]
    });

    // Avoirs
    const avoirs = await Facture.findOne({
      where: { ...whereFacture, type_document: 'avoir' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'nombre'],
        [sequelize.fn('SUM', sequelize.col('montant_ttc')), 'total']
      ]
    });

    return {
      parStatut,
      chiffreAffaires: {
        ht: parseFloat(ca?.dataValues?.total_ht) || 0,
        tva: parseFloat(ca?.dataValues?.total_tva) || 0,
        ttc: parseFloat(ca?.dataValues?.total_ttc) || 0
      },
      avoirs: {
        nombre: parseInt(avoirs?.dataValues?.nombre) || 0,
        total: parseFloat(avoirs?.dataValues?.total) || 0
      }
    };
  }
}

module.exports = FactureService;
