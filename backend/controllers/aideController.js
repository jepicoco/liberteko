/**
 * Aide Controller
 * Gère les endpoints de l'aide admin (modules, recherche, détails)
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const AIDE_DIR = path.join(__dirname, '../data/aide');

/**
 * Cache des données d'aide (chargé au démarrage)
 */
let aideCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Charge tous les fichiers JSON d'aide en mémoire
 */
function loadAideData() {
    const now = Date.now();
    if (aideCache && (now - lastCacheTime) < CACHE_DURATION) {
        return aideCache;
    }

    try {
        const indexPath = path.join(AIDE_DIR, 'index.json');
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

        const modules = [];
        for (const moduleInfo of indexData.modules) {
            const filePath = path.join(AIDE_DIR, moduleInfo.fichier);
            if (fs.existsSync(filePath)) {
                try {
                    const moduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    modules.push({
                        code: moduleInfo.code,
                        titre: moduleInfo.titre,
                        icone: moduleInfo.icone,
                        ...moduleData
                    });
                } catch (err) {
                    logger.warn(`Erreur lecture fichier aide ${moduleInfo.fichier}:`, err.message);
                }
            }
        }

        aideCache = {
            index: indexData,
            modules
        };
        lastCacheTime = now;

        return aideCache;
    } catch (err) {
        logger.error('Erreur chargement données aide:', err);
        return { index: { modules: [] }, modules: [] };
    }
}

/**
 * Force le rechargement du cache
 */
function invalidateCache() {
    aideCache = null;
    lastCacheTime = 0;
}

/**
 * GET /api/aide/modules
 * Liste tous les modules d'aide disponibles
 */
exports.getModules = async (req, res) => {
    try {
        const data = loadAideData();
        const modules = data.modules.map(m => ({
            code: m.code,
            titre: m.titre,
            icone: m.icone,
            description: m.description,
            featureCount: m.features ? m.features.length : 0
        }));

        res.json(modules);
    } catch (err) {
        logger.error('Erreur getModules aide:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * GET /api/aide/modules/:code
 * Récupère le détail d'un module d'aide
 */
exports.getModule = async (req, res) => {
    try {
        const { code } = req.params;
        const data = loadAideData();
        const module = data.modules.find(m => m.code === code || m.module === code);

        if (!module) {
            return res.status(404).json({ error: 'Module non trouvé' });
        }

        res.json(module);
    } catch (err) {
        logger.error('Erreur getModule aide:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * GET /api/aide/search?q=...
 * Recherche dans tous les modules (titre, description, mots-clés, FAQ)
 */
exports.search = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'La recherche doit contenir au moins 2 caractères'
            });
        }

        const searchTerms = q.toLowerCase().trim().split(/\s+/);
        const data = loadAideData();
        const results = [];

        for (const module of data.modules) {
            if (!module.features) continue;

            for (const feature of module.features) {
                let score = 0;
                const matches = {
                    titre: false,
                    description: false,
                    mots_cles: false,
                    procedure: false,
                    faq: false
                };

                // Recherche dans le titre (score élevé)
                for (const term of searchTerms) {
                    if (feature.titre && feature.titre.toLowerCase().includes(term)) {
                        score += 10;
                        matches.titre = true;
                    }
                }

                // Recherche dans les mots-clés (score élevé)
                if (feature.mots_cles) {
                    for (const motCle of feature.mots_cles) {
                        for (const term of searchTerms) {
                            if (motCle.toLowerCase().includes(term)) {
                                score += 8;
                                matches.mots_cles = true;
                            }
                        }
                    }
                }

                // Recherche dans la description
                for (const term of searchTerms) {
                    if (feature.description && feature.description.toLowerCase().includes(term)) {
                        score += 5;
                        matches.description = true;
                    }
                }

                // Recherche dans la procédure
                if (feature.procedure) {
                    for (const step of feature.procedure) {
                        for (const term of searchTerms) {
                            if (step.toLowerCase().includes(term)) {
                                score += 3;
                                matches.procedure = true;
                                break;
                            }
                        }
                    }
                }

                // Recherche dans les FAQ
                if (feature.faq) {
                    for (const faqItem of feature.faq) {
                        for (const term of searchTerms) {
                            const questionMatch = faqItem.question && faqItem.question.toLowerCase().includes(term);
                            const reponseMatch = faqItem.reponse && faqItem.reponse.toLowerCase().includes(term);
                            if (questionMatch || reponseMatch) {
                                score += 4;
                                matches.faq = true;
                            }
                        }
                    }
                }

                // Ajouter aux résultats si score > 0
                if (score > 0) {
                    results.push({
                        moduleCode: module.code,
                        moduleTitre: module.titre,
                        moduleIcone: module.icone,
                        featureId: feature.id,
                        featureTitre: feature.titre,
                        featureDescription: feature.description,
                        roleMin: feature.role_min,
                        score,
                        matches
                    });
                }
            }
        }

        // Trier par score décroissant
        results.sort((a, b) => b.score - a.score);

        // Limiter à 50 résultats
        const limitedResults = results.slice(0, 50);

        res.json({
            query: q,
            count: limitedResults.length,
            totalMatches: results.length,
            results: limitedResults
        });
    } catch (err) {
        logger.error('Erreur search aide:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * GET /api/aide/feature/:moduleCode/:featureId
 * Récupère le détail d'une feature spécifique
 */
exports.getFeature = async (req, res) => {
    try {
        const { moduleCode, featureId } = req.params;
        const data = loadAideData();
        const module = data.modules.find(m => m.code === moduleCode || m.module === moduleCode);

        if (!module) {
            return res.status(404).json({ error: 'Module non trouvé' });
        }

        if (!module.features) {
            return res.status(404).json({ error: 'Aucune feature dans ce module' });
        }

        const feature = module.features.find(f => f.id === featureId);

        if (!feature) {
            return res.status(404).json({ error: 'Feature non trouvée' });
        }

        res.json({
            moduleCode: module.code,
            moduleTitre: module.titre,
            moduleIcone: module.icone,
            feature
        });
    } catch (err) {
        logger.error('Erreur getFeature aide:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * POST /api/aide/cache/invalidate
 * Force le rechargement du cache (admin uniquement)
 */
exports.invalidateCache = async (req, res) => {
    try {
        invalidateCache();
        res.json({ success: true, message: 'Cache invalidé' });
    } catch (err) {
        logger.error('Erreur invalidateCache aide:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
