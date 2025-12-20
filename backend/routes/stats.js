/**
 * Routes pour les statistiques multi-modules avec gestion des droits
 *
 * Controle d'acces:
 * - benevole+ : acces aux stats des modules autorises
 * - comptable+ : acces aux stats financieres
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken } = require('../middleware/auth');
const { isBenevole, isComptable } = require('../middleware/checkRole');
const { structureContext } = require('../middleware/structureContext');

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics (multi-modules, filtre par droits et structure)
 * @access  Private (benevole+)
 * @query   ?modules=ludotheque,bibliotheque (optionnel, filtre par modules autorises)
 * @header  X-Structure-Id (optionnel, filtre par structure)
 */
router.get('/dashboard', verifyToken, isBenevole(), structureContext(), statsController.getDashboardStats);

/**
 * @route   GET /api/stats/popular-items
 * @desc    Get most borrowed items (multi-modules)
 * @access  Private (benevole+)
 * @query   ?module=ludotheque&limit=10
 */
router.get('/popular-items', verifyToken, isBenevole(), statsController.getPopularItems);

/**
 * @route   GET /api/stats/popular-games
 * @desc    Get most borrowed games (retrocompatibilite ludotheque)
 * @access  Private (benevole+)
 * @query   ?limit=10
 */
router.get('/popular-games', verifyToken, isBenevole(), statsController.getPopularGames);

/**
 * @route   GET /api/stats/active-members
 * @desc    Get most active members
 * @access  Private (benevole+)
 * @query   ?limit=10&module=ludotheque
 */
router.get('/active-members', verifyToken, isBenevole(), statsController.getActiveMembers);

/**
 * @route   GET /api/stats/loan-duration
 * @desc    Get average loan duration statistics
 * @access  Private (benevole+)
 * @query   ?module=ludotheque
 */
router.get('/loan-duration', verifyToken, isBenevole(), statsController.getLoanDurationStats);

/**
 * @route   GET /api/stats/monthly
 * @desc    Get monthly loan statistics
 * @access  Private (benevole+)
 * @query   ?months=12&module=ludotheque
 */
router.get('/monthly', verifyToken, isBenevole(), statsController.getMonthlyStats);

/**
 * @route   GET /api/stats/categories
 * @desc    Get category/genre statistics
 * @access  Private (benevole+)
 * @query   ?module=ludotheque (default)
 */
router.get('/categories', verifyToken, isBenevole(), statsController.getCategoryStats);

/**
 * @route   GET /api/stats/cotisations
 * @desc    Get financial statistics (cotisations, CA)
 * @access  Private (comptable+ only)
 * @query   ?year=2025
 */
router.get('/cotisations', verifyToken, isComptable(), statsController.getCotisationsStats);

/**
 * @route   GET /api/stats/never-borrowed
 * @desc    Get items that have never been borrowed (for weeding/desherbage)
 * @access  Private (benevole+)
 * @query   ?module=ludotheque&limit=10&thematique=5&emplacement=12
 * @header  X-Structure-Id (optionnel, filtre par structure)
 */
router.get('/never-borrowed', verifyToken, isBenevole(), structureContext(), statsController.getNeverBorrowed);

/**
 * @route   GET /api/stats/nouveautes
 * @desc    Get recent acquisitions with their borrow stats
 * @access  Private (benevole+)
 * @query   ?module=ludotheque&limit=10&months=3
 */
router.get('/nouveautes', verifyToken, isBenevole(), statsController.getNouveautesStats);

/**
 * @route   GET /api/stats/editeurs
 * @desc    Get publisher/editor statistics
 * @access  Private (benevole+)
 * @query   ?module=ludotheque&limit=10
 */
router.get('/editeurs', verifyToken, isBenevole(), statsController.getEditeursStats);

module.exports = router;
