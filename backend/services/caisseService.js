/**
 * Service de gestion de caisse
 * Gère les sessions, mouvements et calculs de solde
 */

const { Caisse, SessionCaisse, MouvementCaisse, RemiseBanque, Utilisateur, Cotisation, Emprunt, Site, CompteBancaire, sequelize } = require('../models');
const { Op } = require('sequelize');
const comptabiliteService = require('./comptabiliteService');
const auditLogger = require('../utils/auditLogger');

class CaisseService {
  /**
   * Récupère toutes les caisses actives
   */
  static async getCaisses(options = {}) {
    const { includeInactive = false } = options;
    const where = includeInactive ? {} : { actif: true };

    return await Caisse.findAll({
      where,
      include: [
        { model: Site, as: 'site' },
        { model: Utilisateur, as: 'responsable', attributes: ['id', 'nom', 'prenom'] }
      ],
      order: [['nom', 'ASC']]
    });
  }

  /**
   * Récupère une caisse par son ID
   */
  static async getCaisseById(id) {
    return await Caisse.findByPk(id, {
      include: [
        { model: Site, as: 'site' },
        { model: Utilisateur, as: 'responsable', attributes: ['id', 'nom', 'prenom'] }
      ]
    });
  }

  /**
   * Récupère une caisse par son code
   */
  static async getCaisseByCode(code) {
    return await Caisse.findOne({
      where: { code },
      include: [
        { model: Site, as: 'site' }
      ]
    });
  }

  /**
   * Crée une nouvelle caisse
   */
  static async createCaisse(data) {
    const caisse = await Caisse.create({
      nom: data.nom,
      code: data.code,
      site_id: data.site_id || null,
      solde_initial: data.solde_initial || 0,
      solde_actuel: data.solde_initial || 0,
      compte_comptable: data.compte_comptable || '5300',
      devise: data.devise || 'EUR',
      description: data.description || null,
      utilisateur_responsable_id: data.utilisateur_responsable_id || null,
      actif: data.actif !== false
    });

    return await this.getCaisseById(caisse.id);
  }

  /**
   * Met à jour une caisse
   */
  static async updateCaisse(id, data) {
    const caisse = await Caisse.findByPk(id);
    if (!caisse) {
      throw new Error('Caisse non trouvée');
    }

    await caisse.update({
      nom: data.nom !== undefined ? data.nom : caisse.nom,
      code: data.code !== undefined ? data.code : caisse.code,
      site_id: data.site_id !== undefined ? data.site_id : caisse.site_id,
      solde_initial: data.solde_initial !== undefined ? data.solde_initial : caisse.solde_initial,
      compte_comptable: data.compte_comptable !== undefined ? data.compte_comptable : caisse.compte_comptable,
      devise: data.devise !== undefined ? data.devise : caisse.devise,
      description: data.description !== undefined ? data.description : caisse.description,
      utilisateur_responsable_id: data.utilisateur_responsable_id !== undefined ? data.utilisateur_responsable_id : caisse.utilisateur_responsable_id,
      actif: data.actif !== undefined ? data.actif : caisse.actif
    });

    return await this.getCaisseById(id);
  }

  /**
   * Vérifie si une caisse a une session ouverte
   */
  static async hasSessionOuverte(caisseId) {
    const session = await SessionCaisse.findOne({
      where: {
        caisse_id: caisseId,
        statut: 'ouverte'
      }
    });
    return !!session;
  }

  /**
   * Récupère la session ouverte d'une caisse
   */
  static async getSessionOuverte(caisseId) {
    return await SessionCaisse.findOne({
      where: {
        caisse_id: caisseId,
        statut: 'ouverte'
      },
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Caisse, as: 'caisse' }
      ]
    });
  }

  /**
   * Ouvre une nouvelle session de caisse
   */
  static async ouvrirSession(caisseId, utilisateurId, options = {}) {
    const caisse = await Caisse.findByPk(caisseId);
    if (!caisse) {
      throw new Error('Caisse non trouvée');
    }

    // Vérifier qu'il n'y a pas déjà une session ouverte
    const sessionOuverte = await this.hasSessionOuverte(caisseId);
    if (sessionOuverte) {
      throw new Error('Une session est déjà ouverte pour cette caisse');
    }

    const session = await SessionCaisse.create({
      caisse_id: caisseId,
      utilisateur_id: utilisateurId,
      date_ouverture: new Date(),
      solde_ouverture: caisse.solde_actuel,
      commentaire_ouverture: options.commentaire || null,
      statut: 'ouverte'
    });

    // Audit log
    auditLogger.sessionOuverte({
      caisseId,
      sessionId: session.id,
      userId: utilisateurId,
      soldeOuverture: caisse.solde_actuel,
      ip: options.ip
    });

    return await SessionCaisse.findByPk(session.id, {
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Caisse, as: 'caisse' }
      ]
    });
  }

  /**
   * Clôture une session de caisse
   */
  static async cloturerSession(sessionId, utilisateurClotureId, data = {}) {
    const session = await SessionCaisse.findByPk(sessionId, {
      include: [{ model: Caisse, as: 'caisse' }]
    });

    if (!session) {
      throw new Error('Session non trouvée');
    }

    if (session.statut !== 'ouverte') {
      throw new Error('Cette session est déjà clôturée');
    }

    // Calculer le solde théorique
    const soldeTheorique = await session.calculerSoldeTheorique();

    // Calculer l'écart
    const soldeReel = data.solde_cloture_reel !== undefined
      ? parseFloat(data.solde_cloture_reel)
      : soldeTheorique;
    const ecart = soldeReel - soldeTheorique;

    // Mettre à jour les stats avant clôture
    await session.mettreAJourStats();

    // Clôturer la session
    await session.update({
      date_cloture: new Date(),
      utilisateur_cloture_id: utilisateurClotureId,
      solde_cloture_theorique: soldeTheorique,
      solde_cloture_reel: soldeReel,
      ecart: ecart,
      detail_comptage: data.detail_comptage || null,
      commentaire_cloture: data.commentaire || null,
      statut: 'cloturee'
    });

    // Mettre à jour le solde de la caisse
    await session.caisse.update({
      solde_actuel: soldeReel
    });

    // Audit log
    auditLogger.sessionCloturee({
      caisseId: session.caisse_id,
      sessionId,
      userId: utilisateurClotureId,
      soldeTheorique,
      soldeReel,
      ecart,
      ip: data.ip
    });

    return await SessionCaisse.findByPk(sessionId, {
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'utilisateurCloture', attributes: ['id', 'nom', 'prenom'] },
        { model: Caisse, as: 'caisse' }
      ]
    });
  }

  /**
   * Annule une session (cas exceptionnel)
   */
  static async annulerSession(sessionId, utilisateurId, motif) {
    const session = await SessionCaisse.findByPk(sessionId, {
      include: [{ model: Caisse, as: 'caisse' }]
    });

    if (!session) {
      throw new Error('Session non trouvée');
    }

    if (session.statut !== 'ouverte') {
      throw new Error('Seule une session ouverte peut être annulée');
    }

    // Vérifier qu'il n'y a pas de mouvements
    const nbMouvements = await MouvementCaisse.count({
      where: { session_caisse_id: sessionId, statut: 'valide' }
    });

    if (nbMouvements > 0) {
      throw new Error('Impossible d\'annuler une session avec des mouvements. Clôturez la session normalement.');
    }

    await session.update({
      statut: 'annulee',
      commentaire_cloture: `Annulée par utilisateur ${utilisateurId}: ${motif || 'Aucun motif'}`
    });

    return session;
  }

  /**
   * Enregistre un mouvement de caisse
   */
  static async enregistrerMouvement(sessionId, operateurId, data) {
    const session = await SessionCaisse.findByPk(sessionId);
    if (!session) {
      throw new Error('Session non trouvée');
    }

    if (session.statut !== 'ouverte') {
      throw new Error('Impossible d\'ajouter un mouvement sur une session fermée');
    }

    const mouvement = await MouvementCaisse.create({
      session_caisse_id: sessionId,
      type_mouvement: data.type_mouvement,
      categorie: data.categorie || 'autre',
      montant: data.montant,
      mode_paiement: data.mode_paiement || 'especes',
      cotisation_id: data.cotisation_id || null,
      emprunt_id: data.emprunt_id || null,
      utilisateur_id: data.utilisateur_id || null,
      operateur_id: operateurId,
      reference: data.reference || null,
      libelle: data.libelle,
      commentaire: data.commentaire || null,
      date_mouvement: data.date_mouvement || new Date(),
      statut: 'valide'
    });

    // Mettre à jour les stats de la session
    await session.mettreAJourStats();

    // Audit log
    auditLogger.mouvementEnregistre({
      sessionId,
      mouvementId: mouvement.id,
      type: data.type_mouvement,
      categorie: data.categorie,
      montant: data.montant,
      modePaiement: data.mode_paiement,
      operateurId,
      ip: data.ip
    });

    return await MouvementCaisse.findByPk(mouvement.id, {
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'operateur', attributes: ['id', 'nom', 'prenom'] }
      ]
    });
  }

  /**
   * Enregistre un encaissement (cotisation, location, etc.)
   */
  static async enregistrerEncaissement(sessionId, operateurId, data) {
    return await this.enregistrerMouvement(sessionId, operateurId, {
      ...data,
      type_mouvement: 'entree'
    });
  }

  /**
   * Enregistre un décaissement (remboursement, retrait, etc.)
   */
  static async enregistrerDecaissement(sessionId, operateurId, data) {
    return await this.enregistrerMouvement(sessionId, operateurId, {
      ...data,
      type_mouvement: 'sortie'
    });
  }

  /**
   * Annule un mouvement
   */
  static async annulerMouvement(mouvementId, operateurId, motif) {
    const mouvement = await MouvementCaisse.findByPk(mouvementId, {
      include: [{ model: SessionCaisse, as: 'session' }]
    });

    if (!mouvement) {
      throw new Error('Mouvement non trouvé');
    }

    if (mouvement.session.statut !== 'ouverte') {
      throw new Error('Impossible d\'annuler un mouvement sur une session fermée');
    }

    if (mouvement.statut === 'annule') {
      throw new Error('Ce mouvement est déjà annulé');
    }

    await mouvement.update({
      statut: 'annule',
      commentaire: `${mouvement.commentaire || ''}\n[Annulé par ${operateurId}]: ${motif || 'Aucun motif'}`
    });

    // Mettre à jour les stats de la session
    await mouvement.session.mettreAJourStats();

    // Audit log
    auditLogger.mouvementAnnule({
      mouvementId,
      operateurId,
      motif
    });

    return mouvement;
  }

  /**
   * Récupère les mouvements d'une session
   */
  static async getMouvementsSession(sessionId, options = {}) {
    const { includeAnnules = false, limit = 100, offset = 0 } = options;
    const where = { session_caisse_id: sessionId };

    if (!includeAnnules) {
      where.statut = 'valide';
    }

    return await MouvementCaisse.findAll({
      where,
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'operateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Cotisation, as: 'cotisation' },
        { model: Emprunt, as: 'emprunt' }
      ],
      order: [['date_mouvement', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Récupère l'historique des sessions d'une caisse
   */
  static async getHistoriqueSessions(caisseId, options = {}) {
    const { limit = 30, offset = 0 } = options;

    return await SessionCaisse.findAll({
      where: { caisse_id: caisseId },
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'utilisateurCloture', attributes: ['id', 'nom', 'prenom'] }
      ],
      order: [['date_ouverture', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Récupère les totaux d'une session par mode de paiement
   */
  static async getTotauxSession(sessionId) {
    return await MouvementCaisse.getTotalsBySession(sessionId);
  }

  /**
   * Récupère les statistiques globales des caisses
   */
  static async getStatistiques(options = {}) {
    const { dateDebut, dateFin, caisseId } = options;

    const whereSession = {};
    if (caisseId) {
      whereSession.caisse_id = caisseId;
    }
    if (dateDebut || dateFin) {
      whereSession.date_ouverture = {};
      if (dateDebut) whereSession.date_ouverture[Op.gte] = dateDebut;
      if (dateFin) whereSession.date_ouverture[Op.lte] = dateFin;
    }

    const sessions = await SessionCaisse.findAll({
      where: whereSession,
      attributes: ['id', 'total_entrees', 'total_sorties', 'nb_mouvements', 'ecart']
    });

    const stats = {
      nb_sessions: sessions.length,
      total_entrees: 0,
      total_sorties: 0,
      nb_mouvements: 0,
      total_ecarts: 0
    };

    sessions.forEach(s => {
      stats.total_entrees += parseFloat(s.total_entrees || 0);
      stats.total_sorties += parseFloat(s.total_sorties || 0);
      stats.nb_mouvements += s.nb_mouvements || 0;
      stats.total_ecarts += parseFloat(s.ecart || 0);
    });

    return stats;
  }

  /**
   * Enregistre automatiquement un mouvement lors d'une cotisation
   */
  static async enregistrerCotisation(cotisation, operateurId, modePaiement = 'especes') {
    // Chercher une session ouverte sur la caisse principale
    const caissePrincipale = await this.getCaisseByCode('CAISSE_PRINC');
    if (!caissePrincipale) {
      return null; // Pas de caisse configurée
    }

    const session = await this.getSessionOuverte(caissePrincipale.id);
    if (!session) {
      return null; // Pas de session ouverte
    }

    return await this.enregistrerEncaissement(session.id, operateurId, {
      categorie: 'cotisation',
      montant: cotisation.montant_paye,
      mode_paiement: modePaiement,
      cotisation_id: cotisation.id,
      utilisateur_id: cotisation.utilisateur_id,
      libelle: `Cotisation ${cotisation.id}`
    });
  }

  /**
   * Enregistre automatiquement un mouvement lors d'un paiement de retard
   */
  static async enregistrerRetard(emprunt, montant, operateurId, modePaiement = 'especes') {
    const caissePrincipale = await this.getCaisseByCode('CAISSE_PRINC');
    if (!caissePrincipale) return null;

    const session = await this.getSessionOuverte(caissePrincipale.id);
    if (!session) return null;

    return await this.enregistrerEncaissement(session.id, operateurId, {
      categorie: 'retard',
      montant: montant,
      mode_paiement: modePaiement,
      emprunt_id: emprunt.id,
      utilisateur_id: emprunt.utilisateur_id,
      libelle: `Pénalité retard emprunt ${emprunt.id}`
    });
  }

  // ========================================
  // REMISE EN BANQUE
  // ========================================

  /**
   * Récupère les mouvements disponibles pour une remise en banque
   * (espèces + chèques non encore remis en banque)
   */
  static async getMouvementsDisponiblesPourRemise(caisseId, options = {}) {
    const { dateDebut, dateFin } = options;

    const whereClause = {
      remise_banque_id: null,
      statut: 'valide',
      type_mouvement: 'entree',
      mode_paiement: { [Op.in]: RemiseBanque.MODES_ELIGIBLES }
    };

    // Filtrer par date si spécifié
    if (dateDebut || dateFin) {
      whereClause.date_mouvement = {};
      if (dateDebut) whereClause.date_mouvement[Op.gte] = dateDebut;
      if (dateFin) whereClause.date_mouvement[Op.lte] = dateFin;
    }

    // Récupérer les sessions de cette caisse
    const sessions = await SessionCaisse.findAll({
      where: { caisse_id: caisseId },
      attributes: ['id']
    });
    const sessionIds = sessions.map(s => s.id);

    if (sessionIds.length === 0) {
      return [];
    }

    whereClause.session_caisse_id = { [Op.in]: sessionIds };

    return await MouvementCaisse.findAll({
      where: whereClause,
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'operateur', attributes: ['id', 'nom', 'prenom'] },
        { model: SessionCaisse, as: 'session', attributes: ['id', 'date_ouverture'] }
      ],
      order: [['date_mouvement', 'ASC']]
    });
  }

  /**
   * Crée une remise en banque à partir de mouvements sélectionnés
   */
  static async creerRemise(caisseId, mouvementIds, operateurId, options = {}) {
    const { compteBancaireId, commentaire, structureId } = options;

    if (!mouvementIds || mouvementIds.length === 0) {
      throw new Error('Aucun mouvement sélectionné');
    }

    // Vérifier que tous les mouvements sont éligibles
    const mouvements = await MouvementCaisse.findAll({
      where: {
        id: { [Op.in]: mouvementIds },
        remise_banque_id: null,
        statut: 'valide'
      }
    });

    if (mouvements.length !== mouvementIds.length) {
      throw new Error('Certains mouvements ne sont pas éligibles (déjà remis ou annulés)');
    }

    // Calculer les totaux par mode
    const detailParMode = {};
    let montantTotal = 0;

    for (const mvt of mouvements) {
      const mode = mvt.mode_paiement;
      const montant = parseFloat(mvt.montant) || 0;

      if (!detailParMode[mode]) {
        detailParMode[mode] = 0;
      }
      detailParMode[mode] += montant;
      montantTotal += montant;
    }

    // Créer la remise dans une transaction
    const remise = await sequelize.transaction(async (t) => {
      const newRemise = await RemiseBanque.create({
        caisse_id: caisseId,
        compte_bancaire_id: compteBancaireId || null,
        date_remise: new Date(),
        montant_total: montantTotal,
        nb_mouvements: mouvements.length,
        detail_par_mode: detailParMode,
        statut: 'en_preparation',
        commentaire: commentaire || null,
        operateur_id: operateurId,
        structure_id: structureId || null
      }, { transaction: t });

      // Lier les mouvements à la remise
      await MouvementCaisse.update(
        { remise_banque_id: newRemise.id },
        {
          where: { id: { [Op.in]: mouvementIds } },
          transaction: t
        }
      );

      return newRemise;
    });

    // Audit log
    auditLogger.remiseCreee({
      remiseId: remise.id,
      numeroRemise: remise.numero_remise,
      montant: montantTotal,
      nbMouvements: mouvements.length,
      operateurId,
      ip: options.ip
    });

    return await this.getRemiseById(remise.id);
  }

  /**
   * Récupère une remise par son ID avec associations
   */
  static async getRemiseById(remiseId) {
    return await RemiseBanque.findByPk(remiseId, {
      include: [
        { model: Caisse, as: 'caisse', attributes: ['id', 'nom', 'code'] },
        { model: CompteBancaire, as: 'compteBancaire', attributes: ['id', 'libelle', 'banque'] },
        { model: Utilisateur, as: 'operateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'valideur', attributes: ['id', 'nom', 'prenom'] },
        {
          model: MouvementCaisse,
          as: 'mouvements',
          include: [
            { model: Utilisateur, as: 'utilisateur', attributes: ['id', 'nom', 'prenom'] }
          ]
        }
      ]
    });
  }

  /**
   * Marque une remise comme déposée en banque
   */
  static async deposerRemise(remiseId, data = {}) {
    const remise = await RemiseBanque.findByPk(remiseId);
    if (!remise) {
      throw new Error('Remise non trouvée');
    }

    if (remise.statut !== 'en_preparation') {
      throw new Error('Seule une remise en préparation peut être marquée comme déposée');
    }

    await remise.update({
      statut: 'deposee',
      date_depot_effectif: data.date_depot || new Date(),
      compte_bancaire_id: data.compte_bancaire_id || remise.compte_bancaire_id,
      commentaire: data.commentaire || remise.commentaire
    });

    // Audit log
    auditLogger.remiseDeposee({
      remiseId,
      numeroRemise: remise.numero_remise,
      operateurId: data.operateurId,
      ip: data.ip
    });

    return await this.getRemiseById(remiseId);
  }

  /**
   * Valide une remise après confirmation bancaire
   */
  static async validerRemise(remiseId, valideurId, bordereauRef = null) {
    const remise = await RemiseBanque.findByPk(remiseId);
    if (!remise) {
      throw new Error('Remise non trouvée');
    }

    if (remise.statut !== 'deposee') {
      throw new Error('Seule une remise déposée peut être validée');
    }

    await remise.update({
      statut: 'validee',
      validee_par_id: valideurId,
      date_validation: new Date(),
      bordereau_reference: bordereauRef || remise.bordereau_reference
    });

    // Audit log
    auditLogger.remiseValidee({
      remiseId,
      numeroRemise: remise.numero_remise,
      valideurId,
      bordereauRef
    });

    return await this.getRemiseById(remiseId);
  }

  /**
   * Annule une remise (libère les mouvements)
   */
  static async annulerRemise(remiseId, operateurId, motif) {
    const remise = await RemiseBanque.findByPk(remiseId);
    if (!remise) {
      throw new Error('Remise non trouvée');
    }

    if (remise.statut === 'validee') {
      throw new Error('Une remise validée ne peut pas être annulée');
    }

    await sequelize.transaction(async (t) => {
      // Libérer les mouvements
      await MouvementCaisse.update(
        { remise_banque_id: null },
        {
          where: { remise_banque_id: remiseId },
          transaction: t
        }
      );

      // Annuler la remise
      await remise.update({
        statut: 'annulee',
        commentaire: `${remise.commentaire || ''}\n[Annulée par ${operateurId}]: ${motif || 'Aucun motif'}`
      }, { transaction: t });
    });

    // Audit log
    auditLogger.remiseAnnulee({
      remiseId,
      numeroRemise: remise.numero_remise,
      operateurId,
      motif
    });

    return await this.getRemiseById(remiseId);
  }

  /**
   * Récupère l'historique des remises d'une caisse
   */
  static async getHistoriqueRemises(caisseId, options = {}) {
    const { limit = 30, offset = 0, statut } = options;

    const whereClause = { caisse_id: caisseId };
    if (statut) {
      whereClause.statut = statut;
    }

    return await RemiseBanque.findAll({
      where: whereClause,
      include: [
        { model: CompteBancaire, as: 'compteBancaire', attributes: ['id', 'libelle', 'banque'] },
        { model: Utilisateur, as: 'operateur', attributes: ['id', 'nom', 'prenom'] },
        { model: Utilisateur, as: 'valideur', attributes: ['id', 'nom', 'prenom'] }
      ],
      order: [['date_remise', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Récupère les remises en préparation d'une caisse
   */
  static async getRemisesEnPreparation(caisseId) {
    return await this.getHistoriqueRemises(caisseId, { statut: 'en_preparation' });
  }

  /**
   * Récupère les comptes bancaires actifs
   */
  static async getComptesBancaires() {
    return await CompteBancaire.findAll({
      where: { actif: true },
      order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
    });
  }
}

module.exports = CaisseService;
