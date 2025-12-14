/**
 * Seed des donnees comptables de base
 * - Journaux comptables
 * - Comptes comptables courants
 * - Parametrage des operations
 * - Comptes d'encaissement par mode de paiement
 */

const {
  JournalComptable,
  CompteComptable,
  ParametrageComptableOperation,
  CompteEncaissementModePaiement,
  ModePaiement,
  sequelize
} = require('../../backend/models');

async function seedComptabilite() {
  console.log('=== Seed Comptabilite ===\n');

  try {
    // ============================================
    // JOURNAUX COMPTABLES
    // ============================================
    console.log('1. Creation des journaux comptables...');

    const journaux = [
      { code: 'VE', libelle: 'Journal des ventes', type: 'ventes', ordre_affichage: 1 },
      { code: 'CA', libelle: 'Journal de caisse', type: 'caisse', compte_contrepartie: '5300', ordre_affichage: 2 },
      { code: 'BQ', libelle: 'Journal de banque', type: 'banque', compte_contrepartie: '5121', ordre_affichage: 3 },
      { code: 'OD', libelle: 'Operations diverses', type: 'operations_diverses', ordre_affichage: 4 },
      { code: 'AN', libelle: 'A-nouveaux', type: 'a_nouveaux', ordre_affichage: 5 }
    ];

    for (const j of journaux) {
      const [journal, created] = await JournalComptable.findOrCreate({
        where: { code: j.code },
        defaults: j
      });
      console.log(`  ${created ? '+' : '='} ${j.code} - ${j.libelle}`);
    }

    // ============================================
    // COMPTES COMPTABLES
    // ============================================
    console.log('\n2. Creation des comptes comptables...');

    const comptes = [
      // Classe 4 - Tiers
      { numero: '4110', libelle: 'Adherents - Cotisations', classe: '4', type: 'auxiliaire', nature: 'actif' },
      { numero: '4111', libelle: 'Adherents - Prestations', classe: '4', type: 'auxiliaire', nature: 'actif' },
      { numero: '4190', libelle: 'Cautions recues', classe: '4', type: 'general', nature: 'passif' },

      // Classe 5 - Financiers
      { numero: '5121', libelle: 'Banque - Compte courant', classe: '5', type: 'general', nature: 'actif' },
      { numero: '5300', libelle: 'Caisse', classe: '5', type: 'general', nature: 'actif' },
      { numero: '5112', libelle: 'Cheques a encaisser', classe: '5', type: 'general', nature: 'actif' },

      // Classe 7 - Produits
      { numero: '7061', libelle: 'Cotisations des adherents', classe: '7', type: 'general', nature: 'produit' },
      { numero: '7062', libelle: 'Prestations de services', classe: '7', type: 'general', nature: 'produit' },
      { numero: '7063', libelle: 'Amendes et penalites', classe: '7', type: 'general', nature: 'produit' },
      { numero: '7064', libelle: 'Dons', classe: '7', type: 'general', nature: 'produit' },
      { numero: '7083', libelle: 'Locations', classe: '7', type: 'general', nature: 'produit' },
      { numero: '7088', libelle: 'Autres produits', classe: '7', type: 'general', nature: 'produit' }
    ];

    for (const c of comptes) {
      const [compte, created] = await CompteComptable.findOrCreate({
        where: { numero: c.numero },
        defaults: { ...c, accepte_saisie: true, actif: true }
      });
      console.log(`  ${created ? '+' : '='} ${c.numero} - ${c.libelle}`);
    }

    // ============================================
    // PARAMETRAGE DES OPERATIONS
    // ============================================
    console.log('\n3. Creation du parametrage des operations...');

    // Types ENUM valides: 'cotisation','location','retard','amende','vente','don','subvention','animation','caution','remboursement_caution'
    const parametrages = [
      {
        type_operation: 'cotisation',
        libelle: 'Cotisation annuelle',
        journal_code: 'VE',
        compte_produit: '7061',
        compte_produit_libelle: 'Cotisations des adherents',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'COT',
        generer_ecritures_auto: true,
        ordre_affichage: 1
      },
      {
        type_operation: 'location',
        libelle: 'Location de materiel',
        journal_code: 'VE',
        compte_produit: '7083',
        compte_produit_libelle: 'Locations',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'LOC',
        generer_ecritures_auto: true,
        ordre_affichage: 2
      },
      {
        type_operation: 'retard',
        libelle: 'Penalite de retard',
        journal_code: 'VE',
        compte_produit: '7063',
        compte_produit_libelle: 'Amendes et penalites',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'RET',
        generer_ecritures_auto: true,
        ordre_affichage: 3
      },
      {
        type_operation: 'amende',
        libelle: 'Amende',
        journal_code: 'VE',
        compte_produit: '7063',
        compte_produit_libelle: 'Amendes et penalites',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'AMD',
        generer_ecritures_auto: true,
        ordre_affichage: 4
      },
      {
        type_operation: 'vente',
        libelle: 'Vente',
        journal_code: 'VE',
        compte_produit: '7062',
        compte_produit_libelle: 'Prestations de services',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'VTE',
        generer_ecritures_auto: true,
        ordre_affichage: 5
      },
      {
        type_operation: 'don',
        libelle: 'Don',
        journal_code: 'VE',
        compte_produit: '7064',
        compte_produit_libelle: 'Dons',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'DON',
        generer_ecritures_auto: true,
        ordre_affichage: 6
      },
      {
        type_operation: 'subvention',
        libelle: 'Subvention',
        journal_code: 'VE',
        compte_produit: '7088',
        compte_produit_libelle: 'Autres produits',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'SUB',
        generer_ecritures_auto: true,
        ordre_affichage: 7
      },
      {
        type_operation: 'animation',
        libelle: 'Animation',
        journal_code: 'VE',
        compte_produit: '7062',
        compte_produit_libelle: 'Prestations de services',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'ANI',
        generer_ecritures_auto: true,
        ordre_affichage: 8
      },
      {
        type_operation: 'caution',
        libelle: 'Caution',
        journal_code: 'VE',
        compte_produit: '4190',
        compte_produit_libelle: 'Cautions recues',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'CAU',
        generer_ecritures_auto: true,
        ordre_affichage: 9
      },
      {
        type_operation: 'remboursement_caution',
        libelle: 'Remboursement caution',
        journal_code: 'BQ',
        compte_produit: '4190',
        compte_produit_libelle: 'Cautions recues',
        compte_encaissement_defaut: '5121',
        prefixe_piece: 'RMB',
        generer_ecritures_auto: true,
        ordre_affichage: 10
      }
    ];

    for (const p of parametrages) {
      const [param, created] = await ParametrageComptableOperation.findOrCreate({
        where: { type_operation: p.type_operation },
        defaults: { ...p, actif: true }
      });
      console.log(`  ${created ? '+' : '='} ${p.type_operation} - ${p.libelle}`);
    }

    // ============================================
    // COMPTES D'ENCAISSEMENT PAR MODE DE PAIEMENT
    // ============================================
    console.log('\n4. Creation des comptes d\'encaissement...');

    // Recuperer les modes de paiement existants
    const modesPaiement = await ModePaiement.findAll({ where: { actif: true } });

    const comptesEncaissement = {
      'especes': { compte_numero: '5300', compte_libelle: 'Caisse', journal_code: 'CA' },
      'cheque': { compte_numero: '5112', compte_libelle: 'Cheques a encaisser', journal_code: 'BQ' },
      'carte_bancaire': { compte_numero: '5121', compte_libelle: 'Banque - CB', journal_code: 'BQ' },
      'virement': { compte_numero: '5121', compte_libelle: 'Banque - Virement', journal_code: 'BQ' },
      'prelevement': { compte_numero: '5121', compte_libelle: 'Banque - Prelevement', journal_code: 'BQ' }
    };

    for (const mode of modesPaiement) {
      const modeCode = mode.code || mode.libelle.toLowerCase().replace(/\s+/g, '_');
      const config = comptesEncaissement[modeCode];

      if (config) {
        const [enc, created] = await CompteEncaissementModePaiement.findOrCreate({
          where: { mode_paiement_id: mode.id },
          defaults: {
            mode_paiement_id: mode.id,
            ...config,
            actif: true
          }
        });
        console.log(`  ${created ? '+' : '='} ${mode.libelle} -> ${config.compte_numero}`);
      } else {
        // Configuration par defaut
        const [enc, created] = await CompteEncaissementModePaiement.findOrCreate({
          where: { mode_paiement_id: mode.id },
          defaults: {
            mode_paiement_id: mode.id,
            compte_numero: '5121',
            compte_libelle: 'Banque - ' + mode.libelle,
            journal_code: 'BQ',
            actif: true
          }
        });
        console.log(`  ${created ? '+' : '='} ${mode.libelle} -> 5121 (defaut)`);
      }
    }

    console.log('\n=== Seed Comptabilite termine ===');

  } catch (error) {
    console.error('Erreur seed comptabilite:', error);
    throw error;
  }
}

// Execution directe
if (require.main === module) {
  seedComptabilite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedComptabilite;
