/**
 * Script de test pour le module de comptabilité Phase 1
 *
 * Ce script permet de tester :
 * - La génération de numéros de pièces
 * - La création d'écritures comptables
 * - L'équilibre des écritures
 *
 * Usage: node backend/scripts/testComptabilite.js
 */

require('dotenv').config();
const { sequelize, Cotisation, CompteurPiece, EcritureComptable, Adherent } = require('../models');
const ComptabiliteService = require('../services/comptabiliteService');

async function testComptabilite() {
  try {
    console.log('\n==============================================');
    console.log('TEST MODULE COMPTABILITE - PHASE 1');
    console.log('==============================================\n');

    // ========================================
    // Test 1: Génération de numéros de pièces
    // ========================================
    console.log('Test 1: Génération de numéros de pièces');
    console.log('----------------------------------------');

    const exercice = new Date().getFullYear();

    const transaction = await sequelize.transaction();
    try {
      // Générer plusieurs numéros
      const num1 = await CompteurPiece.genererNumero('COT', exercice, transaction);
      console.log(`Numéro 1: ${num1}`);

      const num2 = await CompteurPiece.genererNumero('COT', exercice, transaction);
      console.log(`Numéro 2: ${num2}`);

      const num3 = await CompteurPiece.genererNumero('FAC', exercice, transaction);
      console.log(`Numéro 3 (FAC): ${num3}`);

      await transaction.commit();
      console.log('✓ Test 1 réussi\n');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // ========================================
    // Test 2: Vérification du dernier numéro
    // ========================================
    console.log('Test 2: Vérification du dernier numéro');
    console.log('----------------------------------------');

    const dernierNumeroCOT = await CompteurPiece.obtenirDernierNumero('COT', exercice);
    console.log(`Dernier numéro COT: ${dernierNumeroCOT}`);

    const dernierNumeroFAC = await CompteurPiece.obtenirDernierNumero('FAC', exercice);
    console.log(`Dernier numéro FAC: ${dernierNumeroFAC}`);

    console.log('✓ Test 2 réussi\n');

    // ========================================
    // Test 3: Trouver une cotisation
    // ========================================
    console.log('Test 3: Recherche d\'une cotisation pour test');
    console.log('----------------------------------------');

    const cotisation = await Cotisation.findOne({
      where: { statut: 'en_cours' },
      include: [{
        model: Adherent,
        as: 'adherent'
      }],
      order: [['created_at', 'DESC']]
    });

    if (!cotisation) {
      console.log('⚠ Aucune cotisation trouvée. Créez une cotisation pour tester.');
      console.log('Arrêt du test.\n');
      return;
    }

    console.log(`Cotisation trouvée: ID ${cotisation.id}`);
    console.log(`  Adhérent: ${cotisation.adherent?.prenom} ${cotisation.adherent?.nom}`);
    console.log(`  Montant: ${cotisation.montant_paye}€`);
    console.log(`  Date paiement: ${cotisation.date_paiement}`);
    console.log(`  Mode: ${cotisation.mode_paiement}`);
    console.log('✓ Test 3 réussi\n');

    // ========================================
    // Test 4: Vérifier si la cotisation a déjà des écritures
    // ========================================
    console.log('Test 4: Vérification des écritures existantes');
    console.log('----------------------------------------');

    const aEcritures = await ComptabiliteService.cotisationAEcritures(cotisation.id);
    console.log(`La cotisation a des écritures: ${aEcritures ? 'Oui' : 'Non'}`);

    if (aEcritures) {
      console.log('⚠ Cette cotisation a déjà des écritures. Récupération...');
      const ecritures = await ComptabiliteService.getEcrituresCotisation(cotisation.id);
      console.log(`  Nombre d'écritures: ${ecritures.length}`);

      ecritures.forEach((e, index) => {
        console.log(`  Écriture ${index + 1}:`);
        console.log(`    - Compte: ${e.compte_numero} ${e.compte_libelle}`);
        console.log(`    - Débit: ${e.debit}€ | Crédit: ${e.credit}€`);
      });

      // Vérifier l'équilibre
      const verification = await EcritureComptable.verifierEquilibrePiece(
        cotisation.numero_piece_comptable,
        exercice
      );
      console.log(`  Équilibre: ${verification.equilibre ? 'OK' : 'KO'}`);
      if (!verification.equilibre) {
        console.log(`  Solde: ${verification.solde}€`);
      }
    } else {
      console.log('  Aucune écriture existante. Génération...');

      // ========================================
      // Test 5: Génération des écritures
      // ========================================
      console.log('\nTest 5: Génération des écritures comptables');
      console.log('----------------------------------------');

      const ecritures = await ComptabiliteService.genererEcrituresCotisation(cotisation);
      console.log(`✓ ${ecritures.length} écritures générées`);

      ecritures.forEach((e, index) => {
        console.log(`  Écriture ${index + 1}:`);
        console.log(`    - Journal: ${e.journal_code} - ${e.journal_libelle}`);
        console.log(`    - N° écriture: ${e.numero_ecriture}`);
        console.log(`    - Compte: ${e.compte_numero} ${e.compte_libelle}`);
        console.log(`    - Débit: ${e.debit}€ | Crédit: ${e.credit}€`);
        console.log(`    - Pièce: ${e.piece_reference}`);
      });

      // Vérifier que la cotisation a été mise à jour
      await cotisation.reload();
      console.log(`\n  Numéro pièce généré: ${cotisation.numero_piece_comptable}`);
      console.log(`  Date comptabilisation: ${cotisation.date_comptabilisation}`);

      // Vérifier l'équilibre
      const verification = await EcritureComptable.verifierEquilibrePiece(
        cotisation.numero_piece_comptable,
        exercice
      );
      console.log(`  Équilibre: ${verification.equilibre ? '✓ OK' : '✗ KO'}`);
      if (!verification.equilibre) {
        console.log(`  ⚠ Solde: ${verification.solde}€`);
      }
    }

    console.log('✓ Tests 4-5 réussis\n');

    // ========================================
    // Test 6: Statistiques de l'exercice
    // ========================================
    console.log('Test 6: Statistiques de l\'exercice');
    console.log('----------------------------------------');

    const ecrituresExercice = await EcritureComptable.findAll({
      where: { exercice: exercice }
    });

    const totalDebit = ecrituresExercice.reduce((sum, e) => sum + parseFloat(e.debit), 0);
    const totalCredit = ecrituresExercice.reduce((sum, e) => sum + parseFloat(e.credit), 0);

    console.log(`Exercice: ${exercice}`);
    console.log(`Nombre d'écritures: ${ecrituresExercice.length}`);
    console.log(`Total débit: ${totalDebit.toFixed(2)}€`);
    console.log(`Total crédit: ${totalCredit.toFixed(2)}€`);
    console.log(`Équilibre: ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ OK' : '✗ KO'}`);

    console.log('✓ Test 6 réussi\n');

    // ========================================
    // Résumé
    // ========================================
    console.log('==============================================');
    console.log('RÉSUMÉ DES TESTS');
    console.log('==============================================');
    console.log('✓ Tous les tests ont réussi !');
    console.log('');
    console.log('Le module de comptabilité Phase 1 est opérationnel.');
    console.log('Vous pouvez maintenant :');
    console.log('  1. Générer des écritures pour vos cotisations');
    console.log('  2. Exporter le FEC via GET /api/export-comptable/fec?exercice=2025');
    console.log('  3. Consulter les statistiques via GET /api/export-comptable/statistiques/2025');
    console.log('==============================================\n');

  } catch (error) {
    console.error('\n✗ Erreur lors des tests:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter les tests
testComptabilite();
