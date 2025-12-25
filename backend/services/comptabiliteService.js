const {
  CompteurPiece,
  EcritureComptable,
  Cotisation,
  Utilisateur,
  JournalComptable,
  CompteComptable,
  ParametrageComptableOperation,
  CompteEncaissementModePaiement
} = require('../models');
const { sequelize } = require('../models');

/**
 * Service de gestion comptable
 * Gere la generation des ecritures comptables et la numerotation des pieces
 * Utilise le parametrage configurable en base de donnees
 */
class ComptabiliteService {
  // Cache pour les libelles (evite les requetes repetees)
  static _cacheJournaux = new Map();
  static _cacheComptes = new Map();

  /**
   * Obtient le libelle d'un journal comptable a partir de son code
   * Utilise le parametrage en base avec fallback sur valeurs par defaut
   * @param {string} code - Code du journal
   * @returns {Promise<string>} Libelle du journal
   */
  static async getJournalLibelleAsync(code) {
    // Verifier le cache
    if (this._cacheJournaux.has(code)) {
      return this._cacheJournaux.get(code);
    }

    try {
      const journal = await JournalComptable.getByCode(code);
      if (journal) {
        this._cacheJournaux.set(code, journal.libelle);
        return journal.libelle;
      }
    } catch (e) {
      // Fallback si table non disponible
    }

    // Fallback sur valeurs par defaut
    return this.getJournalLibelle(code);
  }

  /**
   * Obtient le libelle d'un journal comptable (synchrone, fallback)
   * @param {string} code - Code du journal
   * @returns {string} Libelle du journal
   */
  static getJournalLibelle(code) {
    const journaux = {
      'VT': 'Journal des ventes',
      'AC': 'Journal des achats',
      'BQ': 'Journal de banque',
      'CA': 'Journal de caisse',
      'OD': 'Journal des operations diverses',
      'AN': 'Journal des a-nouveaux'
    };

    return journaux[code] || `Journal ${code}`;
  }

  /**
   * Obtient le libelle d'un compte comptable a partir de son numero
   * Utilise le parametrage en base avec fallback sur valeurs par defaut
   * @param {string} numero - Numero du compte
   * @returns {Promise<string>} Libelle du compte
   */
  static async getCompteLibelleAsync(numero) {
    // Verifier le cache
    if (this._cacheComptes.has(numero)) {
      return this._cacheComptes.get(numero);
    }

    try {
      const compte = await CompteComptable.getByNumero(numero);
      if (compte) {
        this._cacheComptes.set(numero, compte.libelle);
        return compte.libelle;
      }
    } catch (e) {
      // Fallback si table non disponible
    }

    // Fallback sur valeurs par defaut
    return this.getCompteLibelle(numero);
  }

  /**
   * Obtient le libelle d'un compte comptable (synchrone, fallback)
   * @param {string} numero - Numero du compte
   * @returns {string} Libelle du compte
   */
  static getCompteLibelle(numero) {
    // Plan comptable simplifie pour les operations courantes
    const comptes = {
      // Comptes de tresorerie
      '512': 'Banque',
      '5121': 'Compte courant',
      '5122': 'Livret A',
      '530': 'Caisse',
      '5300': 'Caisse principale',

      // Comptes de tiers
      '411': 'Clients',
      '4110': 'Clients divers',
      '467': 'Autres comptes debiteurs ou crediteurs',

      // Comptes de produits
      '706': 'Prestations de services',
      '7061': 'Cotisations',
      '7062': 'Locations',
      '7063': 'Animations et ateliers',
      '758': 'Produits divers de gestion courante',
      '754': 'Dons',
      '741': 'Subventions exploitation',

      // Comptes de charges
      '606': 'Achats non stockes de matieres et fournitures',
      '613': 'Locations',
      '625': 'Deplacements, missions et receptions',
      '627': 'Services bancaires et assimiles',

      // TVA
      '4457': 'TVA collectee',
      '4456': 'TVA deductible'
    };

    // Si le compte exact existe, le retourner
    if (comptes[numero]) {
      return comptes[numero];
    }

    // Sinon, essayer de trouver le compte parent
    for (let i = numero.length - 1; i > 0; i--) {
      const parent = numero.substring(0, i);
      if (comptes[parent]) {
        return comptes[parent];
      }
    }

    return `Compte ${numero}`;
  }

  /**
   * Recupere le parametrage comptable pour un type d'operation
   * @param {string} typeOperation - Type d'operation (cotisation, location, etc.)
   * @returns {Promise<Object|null>} Parametrage ou null
   */
  static async getParametrage(typeOperation) {
    try {
      return await ParametrageComptableOperation.getByType(typeOperation);
    } catch (e) {
      return null;
    }
  }

  /**
   * Recupere le compte d'encaissement pour un mode de paiement
   * @param {string} modePaiement - Code du mode de paiement
   * @returns {Promise<{numero: string, libelle: string, journal: string|null}>}
   */
  static async getCompteEncaissement(modePaiement) {
    try {
      return await CompteEncaissementModePaiement.getCompte(modePaiement);
    } catch (e) {
      // Fallback
      const comptesDefaut = {
        'especes': { numero: '5300', libelle: 'Caisse' },
        'cheque': { numero: '5121', libelle: 'Banque' },
        'carte_bancaire': { numero: '5121', libelle: 'Banque' },
        'virement': { numero: '5121', libelle: 'Banque' },
        'prelevement': { numero: '5121', libelle: 'Banque' }
      };
      return comptesDefaut[modePaiement] || { numero: '5121', libelle: 'Banque', journal: null };
    }
  }

  /**
   * Vide les caches de libelles
   */
  static clearCache() {
    this._cacheJournaux.clear();
    this._cacheComptes.clear();
  }

  /**
   * Genere les ecritures comptables pour une cotisation
   * Cree 2 ecritures: debit (encaissement) et credit (produit)
   * Utilise le parametrage configurable en base de donnees
   *
   * @param {Object} cotisation - Instance de la cotisation
   * @param {Object} options - Options de generation (surcharge du parametrage)
   * @param {string} options.journalCode - Code du journal (sinon: parametrage ou 'VT')
   * @param {string} options.compteEncaissement - Compte d'encaissement (sinon: selon mode paiement)
   * @param {string} options.compteProduit - Compte de produit (sinon: parametrage ou '7061')
   * @returns {Promise<Array>} Tableau des ecritures creees
   */
  static async genererEcrituresCotisation(cotisation, options = {}) {
    // Recuperer le parametrage comptable pour les cotisations
    const parametrage = await this.getParametrage('cotisation');

    // Determiner les parametres finaux (options > parametrage > defaut)
    const journalCode = options.journalCode || (parametrage?.journal_code) || 'VT';
    const compteProduit = options.compteProduit || (parametrage?.compte_produit) || '7061';
    const prefixePiece = parametrage?.prefixe_piece || 'COT';

    // Determiner le compte d'encaissement selon le mode de paiement
    let compteEncaissementFinal = options.compteEncaissement;
    let compteEncaissementLibelle = null;

    if (!compteEncaissementFinal) {
      const compteConfig = await this.getCompteEncaissement(cotisation.mode_paiement);
      compteEncaissementFinal = compteConfig.numero;
      compteEncaissementLibelle = compteConfig.libelle;
    }

    // Determiner l'exercice comptable (annee de la date de paiement)
    const datePaiement = new Date(cotisation.date_paiement);
    const exercice = datePaiement.getFullYear();

    // Charger l'utilisateur pour le compte auxiliaire
    const utilisateur = await Utilisateur.findByPk(cotisation.utilisateur_id);
    const compteAuxiliaire = utilisateur ? `CLI${String(utilisateur.id).padStart(6, '0')}` : null;
    const utilisateurNom = utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : 'Utilisateur inconnu';

    const ecritures = [];

    // Utiliser une transaction pour garantir l'atomicite
    const result = await sequelize.transaction(async (transaction) => {
      // Generer le numero de piece si absent
      let numeroPiece = cotisation.numero_piece_comptable;
      if (!numeroPiece) {
        numeroPiece = await CompteurPiece.genererNumero(prefixePiece, exercice, transaction);

        // Mettre a jour la cotisation avec le numero de piece
        cotisation.numero_piece_comptable = numeroPiece;
        cotisation.date_comptabilisation = datePaiement;
        await cotisation.save({ transaction });
      }

      // Generer un numero d'ecriture unique
      const numeroEcriture = `${journalCode}${exercice}-${numeroPiece}`;

      // Libelle de l'operation
      const libelle = `Cotisation ${utilisateurNom} - ${cotisation.periode_debut} a ${cotisation.periode_fin}`;

      // Recuperer les libelles (utilise le cache ou la base)
      const journalLibelle = await this.getJournalLibelleAsync(journalCode);
      const compteEncLibelle = compteEncaissementLibelle || await this.getCompteLibelleAsync(compteEncaissementFinal);
      const compteProdLibelle = parametrage?.compte_produit_libelle || await this.getCompteLibelleAsync(compteProduit);

      // 1. Ecriture de debit (Encaissement)
      const ecritureDebit = await EcritureComptable.create({
        journal_code: journalCode,
        journal_libelle: journalLibelle,
        exercice: exercice,
        numero_ecriture: numeroEcriture,
        date_ecriture: datePaiement,
        compte_numero: compteEncaissementFinal,
        compte_libelle: compteEncLibelle,
        compte_auxiliaire: compteAuxiliaire,
        piece_reference: numeroPiece,
        piece_date: datePaiement,
        libelle: libelle,
        debit: parseFloat(cotisation.montant_paye),
        credit: 0,
        date_validation: datePaiement,
        cotisation_id: cotisation.id,
        section_analytique_id: parametrage?.section_analytique_id || null
      }, { transaction });

      ecritures.push(ecritureDebit);

      // 2. Ecriture de credit (Produit - Cotisation)
      const ecritureCredit = await EcritureComptable.create({
        journal_code: journalCode,
        journal_libelle: journalLibelle,
        exercice: exercice,
        numero_ecriture: numeroEcriture,
        date_ecriture: datePaiement,
        compte_numero: compteProduit,
        compte_libelle: compteProdLibelle,
        compte_auxiliaire: compteAuxiliaire,
        piece_reference: numeroPiece,
        piece_date: datePaiement,
        libelle: libelle,
        debit: 0,
        credit: parseFloat(cotisation.montant_paye),
        date_validation: datePaiement,
        cotisation_id: cotisation.id,
        section_analytique_id: parametrage?.section_analytique_id || null
      }, { transaction });

      ecritures.push(ecritureCredit);

      return ecritures;
    });

    return result;
  }

  /**
   * Vérifie si une cotisation a déjà des écritures comptables
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<boolean>}
   */
  static async cotisationAEcritures(cotisationId) {
    const count = await EcritureComptable.count({
      where: { cotisation_id: cotisationId }
    });
    return count > 0;
  }

  /**
   * Supprime les écritures comptables d'une cotisation
   * Utile en cas d'annulation de cotisation
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<number>} Nombre d'écritures supprimées
   */
  static async supprimerEcrituresCotisation(cotisationId) {
    return await sequelize.transaction(async (transaction) => {
      const ecritures = await EcritureComptable.findAll({
        where: { cotisation_id: cotisationId },
        transaction
      });

      // Vérifier qu'aucune écriture n'est lettrée
      const ecrituresLettrees = ecritures.filter(e => e.lettrage);
      if (ecrituresLettrees.length > 0) {
        throw new Error('Impossible de supprimer des écritures lettrées. Délettrez d\'abord.');
      }

      const count = await EcritureComptable.destroy({
        where: { cotisation_id: cotisationId },
        transaction
      });

      // Réinitialiser la cotisation
      const cotisation = await Cotisation.findByPk(cotisationId, { transaction });
      if (cotisation) {
        cotisation.numero_piece_comptable = null;
        cotisation.date_comptabilisation = null;
        await cotisation.save({ transaction });
      }

      return count;
    });
  }

  /**
   * Récupère les écritures comptables d'une cotisation
   * @param {number} cotisationId - ID de la cotisation
   * @returns {Promise<Array>}
   */
  static async getEcrituresCotisation(cotisationId) {
    return await EcritureComptable.findAll({
      where: { cotisation_id: cotisationId },
      order: [['id', 'ASC']]
    });
  }

  /**
   * Génère les écritures pour plusieurs cotisations
   * @param {Array<number>} cotisationIds - IDs des cotisations
   * @returns {Promise<Object>} Résultats de la génération
   */
  static async genererEcrituresMultiples(cotisationIds) {
    const resultats = {
      succes: [],
      erreurs: []
    };

    for (const id of cotisationIds) {
      try {
        const cotisation = await Cotisation.findByPk(id);
        if (!cotisation) {
          resultats.erreurs.push({
            cotisationId: id,
            erreur: 'Cotisation non trouvée'
          });
          continue;
        }

        // Vérifier si la cotisation a déjà des écritures
        const aEcritures = await this.cotisationAEcritures(id);
        if (aEcritures) {
          resultats.erreurs.push({
            cotisationId: id,
            erreur: 'Cette cotisation a déjà des écritures comptables'
          });
          continue;
        }

        const ecritures = await this.genererEcrituresCotisation(cotisation);
        resultats.succes.push({
          cotisationId: id,
          numeroPiece: cotisation.numero_piece_comptable,
          nbEcritures: ecritures.length
        });
      } catch (error) {
        resultats.erreurs.push({
          cotisationId: id,
          erreur: error.message
        });
      }
    }

    return resultats;
  }

  /**
   * Genere les ecritures comptables pour un lot de sortie
   * @param {Object} lot - Lot de sortie avec typeSortie charge
   * @param {Object} options - Options (transaction)
   * @returns {Promise<Object>} Informations sur les ecritures generees
   */
  static async genererEcrituresSortieLot(lot, options = {}) {
    const { transaction } = options;
    const { TypeSortie, LotSortie, ArticleSortie } = require('../models');

    // Charger le type de sortie si pas deja charge
    const typeSortie = lot.typeSortie || await TypeSortie.findByPk(lot.type_sortie_id);

    if (!typeSortie) {
      throw new Error('Type de sortie non trouve');
    }

    if (!typeSortie.compte_sortie) {
      // Pas de compte configure, on ne genere pas d'ecritures
      return null;
    }

    const dateSortie = new Date(lot.date_sortie);
    const exercice = dateSortie.getFullYear();
    const journalCode = typeSortie.journal_code || 'OD';
    const prefixePiece = typeSortie.prefixe_piece || 'SOR';

    // Generer le numero de piece
    const numeroPiece = await CompteurPiece.genererNumero(prefixePiece, exercice, transaction);
    const numeroEcriture = `${journalCode}${exercice}-${numeroPiece}`;

    const libelle = `Sortie ${typeSortie.libelle} - Lot ${lot.numero}`;

    // Recuperer les libelles
    const journalLibelle = await this.getJournalLibelleAsync(journalCode);
    const compteSortieLibelle = await this.getCompteLibelleAsync(typeSortie.compte_sortie);
    const compteStockLibelle = await this.getCompteLibelleAsync('2184'); // Mobilier - par defaut

    const ecritures = [];

    // Compte de charge ou produit selon le type de sortie
    // - Rebus (6571): Charge exceptionnelle sur operations de gestion
    // - Don (6713): Dons et liberalites
    // - Vente (7542): Produits des activites annexes

    // 1. Ecriture de debit (Charge ou Credit Stock)
    const ecritureDebit = await EcritureComptable.create({
      journal_code: journalCode,
      journal_libelle: journalLibelle,
      exercice: exercice,
      numero_ecriture: numeroEcriture,
      date_ecriture: dateSortie,
      compte_numero: typeSortie.compte_sortie,
      compte_libelle: compteSortieLibelle,
      compte_auxiliaire: null,
      piece_reference: numeroPiece,
      piece_date: dateSortie,
      libelle: libelle,
      debit: parseFloat(lot.valeur_totale),
      credit: 0,
      date_validation: new Date()
    }, { transaction });

    ecritures.push(ecritureDebit);

    // 2. Ecriture de credit (Diminution stock/immobilisations)
    const ecritureCredit = await EcritureComptable.create({
      journal_code: journalCode,
      journal_libelle: journalLibelle,
      exercice: exercice,
      numero_ecriture: numeroEcriture,
      date_ecriture: dateSortie,
      compte_numero: '2184', // Mobilier (a adapter selon config)
      compte_libelle: compteStockLibelle,
      compte_auxiliaire: null,
      piece_reference: numeroPiece,
      piece_date: dateSortie,
      libelle: libelle,
      debit: 0,
      credit: parseFloat(lot.valeur_totale),
      date_validation: new Date()
    }, { transaction });

    ecritures.push(ecritureCredit);

    return {
      numero_piece: numeroPiece,
      nb_ecritures: ecritures.length,
      montant_total: parseFloat(lot.valeur_totale),
      ecritures
    };
  }

  /**
   * Genere les ecritures de contrepassation pour une reintegration
   * @param {Object} articleSortie - Article sortie reintegre
   * @param {Object} options - Options (transaction)
   * @returns {Promise<Object>} Informations sur les ecritures generees
   */
  static async genererEcrituresReintegration(articleSortie, options = {}) {
    const { transaction } = options;
    const { LotSortie, TypeSortie } = require('../models');

    // Charger le lot et le type
    const lot = await LotSortie.findByPk(articleSortie.lot_sortie_id, {
      include: [{ model: TypeSortie, as: 'typeSortie' }],
      transaction
    });

    if (!lot || !lot.typeSortie?.compte_sortie) {
      return null;
    }

    const dateReintegration = new Date();
    const exercice = dateReintegration.getFullYear();
    const journalCode = lot.typeSortie.journal_code || 'OD';
    const prefixePiece = 'REI'; // Reintegration

    // Generer le numero de piece
    const numeroPiece = await CompteurPiece.genererNumero(prefixePiece, exercice, transaction);
    const numeroEcriture = `${journalCode}${exercice}-${numeroPiece}`;

    const libelle = `Reintegration ${articleSortie.type_article} #${articleSortie.article_id} - Lot ${lot.numero}`;

    // Recuperer les libelles
    const journalLibelle = await this.getJournalLibelleAsync(journalCode);
    const compteSortieLibelle = await this.getCompteLibelleAsync(lot.typeSortie.compte_sortie);
    const compteStockLibelle = await this.getCompteLibelleAsync('2184');

    const ecritures = [];
    const valeur = parseFloat(articleSortie.valeur);

    // Contrepassation: inverse des ecritures de sortie

    // 1. Debit Stock (reintegration)
    const ecritureDebit = await EcritureComptable.create({
      journal_code: journalCode,
      journal_libelle: journalLibelle,
      exercice: exercice,
      numero_ecriture: numeroEcriture,
      date_ecriture: dateReintegration,
      compte_numero: '2184',
      compte_libelle: compteStockLibelle,
      compte_auxiliaire: null,
      piece_reference: numeroPiece,
      piece_date: dateReintegration,
      libelle: libelle,
      debit: valeur,
      credit: 0,
      date_validation: new Date()
    }, { transaction });

    ecritures.push(ecritureDebit);

    // 2. Credit Charge/Produit (annulation)
    const ecritureCredit = await EcritureComptable.create({
      journal_code: journalCode,
      journal_libelle: journalLibelle,
      exercice: exercice,
      numero_ecriture: numeroEcriture,
      date_ecriture: dateReintegration,
      compte_numero: lot.typeSortie.compte_sortie,
      compte_libelle: compteSortieLibelle,
      compte_auxiliaire: null,
      piece_reference: numeroPiece,
      piece_date: dateReintegration,
      libelle: libelle,
      debit: 0,
      credit: valeur,
      date_validation: new Date()
    }, { transaction });

    ecritures.push(ecritureCredit);

    return {
      numero_piece: numeroPiece,
      nb_ecritures: ecritures.length,
      montant: valeur,
      ecritures
    };
  }
}

module.exports = ComptabiliteService;
