/**
 * Controller pour les configurations d'APIs externes
 * Gestion des APIs de lookup EAN/ISBN et enrichissement
 */

const { ConfigurationAPI } = require('../models');
const { Op } = require('sequelize');

/**
 * Liste toutes les configurations API
 * GET /api/parametres/apis-externes
 */
const getAllConfigurations = async (req, res) => {
  try {
    const { type_api, actif } = req.query;
    const where = {};

    if (type_api) where.type_api = type_api;
    if (actif !== undefined) where.actif = actif === 'true';

    const configurations = await ConfigurationAPI.findAll({
      where,
      order: [['type_api', 'ASC'], ['priorite', 'ASC'], ['ordre_affichage', 'ASC']],
      attributes: {
        exclude: ['api_key_encrypted', 'api_secret_encrypted']
      }
    });

    // Ajouter indicateur si cle API est configuree
    const result = configurations.map(config => {
      const data = config.toJSON();
      data.has_api_key = !!config.api_key_encrypted;
      data.has_api_secret = !!config.api_secret_encrypted;
      return data;
    });

    res.json({
      success: true,
      configurations: result
    });
  } catch (error) {
    console.error('Get configurations API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtient les fournisseurs disponibles par type
 * GET /api/parametres/apis-externes/providers
 */
const getProviders = async (req, res) => {
  try {
    const providersByType = ConfigurationAPI.getProviders();

    // Transformer en liste plate unique pour le frontend
    const uniqueProviders = new Map();

    Object.values(providersByType).forEach(typeProviders => {
      typeProviders.forEach(p => {
        if (!uniqueProviders.has(p.value)) {
          uniqueProviders.set(p.value, {
            code: p.value,
            nom: p.label,
            description: `${p.gratuit ? 'Gratuit' : 'Payant'} - Limite: ${p.limite}`,
            collections: [...p.collections],
            gratuit: p.gratuit,
            limite: p.limite,
            url_defaut: p.url_defaut || null
          });
        } else {
          // Fusionner les collections si le provider existe déjà
          const existing = uniqueProviders.get(p.value);
          p.collections.forEach(c => {
            if (!existing.collections.includes(c)) {
              existing.collections.push(c);
            }
          });
        }
      });
    });

    res.json({
      success: true,
      providers: Array.from(uniqueProviders.values()),
      providersByType // Garder aussi la structure par type si besoin
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtient une configuration par ID
 * GET /api/parametres/apis-externes/:id
 */
const getConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id, {
      attributes: {
        exclude: ['api_key_encrypted', 'api_secret_encrypted']
      }
    });

    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    const data = configuration.toJSON();
    data.has_api_key = !!configuration.api_key_encrypted;
    data.has_api_secret = !!configuration.api_secret_encrypted;

    res.json({
      success: true,
      configuration: data
    });
  } catch (error) {
    console.error('Get configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Cree une nouvelle configuration API
 * POST /api/parametres/apis-externes
 */
const createConfiguration = async (req, res) => {
  try {
    const {
      libelle,
      type_api,
      provider,
      api_url,
      api_key,
      api_secret,
      collections_supportees,
      mapping_champs,
      cache_active,
      cache_duree_jours,
      limite_requetes,
      periode_limite,
      priorite,
      icone,
      couleur,
      role_minimum,
      description,
      notes,
      documentation_url
    } = req.body;

    // Validation
    if (!libelle || !type_api || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Validation',
        message: 'libelle, type_api et provider sont requis'
      });
    }

    // Verifier unicite du libelle
    const existing = await ConfigurationAPI.findOne({ where: { libelle } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Validation',
        message: 'Une configuration avec ce libelle existe deja'
      });
    }

    // Preparer les donnees
    const configData = {
      libelle,
      type_api,
      provider,
      api_url,
      collections_supportees: collections_supportees || ['jeu'],
      mapping_champs,
      cache_active: cache_active !== false,
      cache_duree_jours: cache_duree_jours || 90,
      limite_requetes,
      periode_limite: periode_limite || 'jour',
      priorite: priorite || 0,
      icone: icone || 'bi-search',
      couleur: couleur || 'info',
      role_minimum: role_minimum || 'gestionnaire',
      description,
      notes,
      documentation_url
    };

    // Chiffrer les cles API si fournies
    if (api_key) {
      configData.api_key_encrypted = ConfigurationAPI.encryptValue(api_key);
    }
    if (api_secret) {
      configData.api_secret_encrypted = ConfigurationAPI.encryptValue(api_secret);
    }

    const configuration = await ConfigurationAPI.create(configData);

    // Retourner sans les champs sensibles
    const result = configuration.toJSON();
    delete result.api_key_encrypted;
    delete result.api_secret_encrypted;
    result.has_api_key = !!api_key;
    result.has_api_secret = !!api_secret;

    res.status(201).json({
      success: true,
      message: 'Configuration creee avec succes',
      configuration: result
    });
  } catch (error) {
    console.error('Create configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Met a jour une configuration API
 * PUT /api/parametres/apis-externes/:id
 */
const updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      libelle,
      type_api,
      provider,
      api_url,
      api_key,
      api_secret,
      collections_supportees,
      mapping_champs,
      cache_active,
      cache_duree_jours,
      limite_requetes,
      periode_limite,
      priorite,
      icone,
      couleur,
      role_minimum,
      actif,
      description,
      notes,
      documentation_url
    } = req.body;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    // Verifier unicite du libelle si change
    if (libelle && libelle !== configuration.libelle) {
      const existing = await ConfigurationAPI.findOne({
        where: { libelle, id: { [Op.ne]: id } }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Validation',
          message: 'Une configuration avec ce libelle existe deja'
        });
      }
    }

    // Mise a jour des champs
    if (libelle !== undefined) configuration.libelle = libelle;
    if (type_api !== undefined) configuration.type_api = type_api;
    if (provider !== undefined) configuration.provider = provider;
    if (api_url !== undefined) configuration.api_url = api_url;
    if (collections_supportees !== undefined) configuration.collections_supportees = collections_supportees;
    if (mapping_champs !== undefined) configuration.mapping_champs = mapping_champs;
    if (cache_active !== undefined) configuration.cache_active = cache_active;
    if (cache_duree_jours !== undefined) configuration.cache_duree_jours = cache_duree_jours;
    if (limite_requetes !== undefined) configuration.limite_requetes = limite_requetes;
    if (periode_limite !== undefined) configuration.periode_limite = periode_limite;
    if (priorite !== undefined) configuration.priorite = priorite;
    if (icone !== undefined) configuration.icone = icone;
    if (couleur !== undefined) configuration.couleur = couleur;
    if (role_minimum !== undefined) configuration.role_minimum = role_minimum;
    if (actif !== undefined) configuration.actif = actif;
    if (description !== undefined) configuration.description = description;
    if (notes !== undefined) configuration.notes = notes;
    if (documentation_url !== undefined) configuration.documentation_url = documentation_url;

    // Mise a jour des cles API uniquement si fournies
    if (api_key) {
      configuration.api_key_encrypted = ConfigurationAPI.encryptValue(api_key);
    }
    if (api_secret) {
      configuration.api_secret_encrypted = ConfigurationAPI.encryptValue(api_secret);
    }

    await configuration.save();

    // Retourner sans les champs sensibles
    const result = configuration.toJSON();
    delete result.api_key_encrypted;
    delete result.api_secret_encrypted;
    result.has_api_key = !!configuration.api_key_encrypted;
    result.has_api_secret = !!configuration.api_secret_encrypted;

    res.json({
      success: true,
      message: 'Configuration mise a jour',
      configuration: result
    });
  } catch (error) {
    console.error('Update configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Supprime une configuration API
 * DELETE /api/parametres/apis-externes/:id
 */
const deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    // Empecher la suppression si c'est la derniere du type
    const count = await ConfigurationAPI.count({
      where: { type_api: configuration.type_api }
    });

    if (count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer',
        message: 'Impossible de supprimer la derniere configuration de ce type'
      });
    }

    // Si c'etait la configuration par defaut, en choisir une autre
    if (configuration.par_defaut) {
      const autre = await ConfigurationAPI.findOne({
        where: {
          type_api: configuration.type_api,
          id: { [Op.ne]: id },
          actif: true
        },
        order: [['priorite', 'ASC']]
      });
      if (autre) {
        await autre.setAsDefault();
      }
    }

    await configuration.destroy();

    res.json({
      success: true,
      message: 'Configuration supprimee'
    });
  } catch (error) {
    console.error('Delete configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Reordonne les configurations
 * PUT /api/parametres/apis-externes-reorder
 */
const reorderConfigurations = async (req, res) => {
  try {
    const { ordres } = req.body;

    if (!Array.isArray(ordres)) {
      return res.status(400).json({
        success: false,
        error: 'Validation',
        message: 'ordres doit etre un tableau [{id, ordre}, ...]'
      });
    }

    for (const item of ordres) {
      await ConfigurationAPI.update(
        { ordre_affichage: item.ordre },
        { where: { id: item.id } }
      );
    }

    res.json({
      success: true,
      message: 'Ordre mis a jour'
    });
  } catch (error) {
    console.error('Reorder configurations API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Active/desactive une configuration
 * PATCH /api/parametres/apis-externes/:id/toggle
 */
const toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    await configuration.toggleActif();

    res.json({
      success: true,
      message: `Configuration ${configuration.actif ? 'activee' : 'desactivee'}`,
      actif: configuration.actif
    });
  } catch (error) {
    console.error('Toggle configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Definit comme configuration par defaut
 * PATCH /api/parametres/apis-externes/:id/set-default
 */
const setAsDefault = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    await configuration.setAsDefault();

    res.json({
      success: true,
      message: 'Configuration definie par defaut'
    });
  } catch (error) {
    console.error('Set default configuration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Teste la connexion a une API
 * POST /api/parametres/apis-externes/:id/test
 */
const testConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    // Tester selon le provider
    let testResult = { success: false, message: 'Test non implemente pour ce provider' };

    switch (configuration.provider) {
      case 'upcitemdb':
        testResult = await testUPCitemdb(configuration);
        break;
      case 'bgg':
        testResult = await testBGG(configuration);
        break;
      case 'openlibrary':
        testResult = await testOpenLibrary(configuration);
        break;
      case 'bnf':
        testResult = await testBNF(configuration);
        break;
      case 'tmdb':
        testResult = await testTMDB(configuration);
        break;
      case 'musicbrainz':
        testResult = await testMusicBrainz(configuration);
        break;
      case 'googlebooks':
        testResult = await testGoogleBooks(configuration);
        break;
      case 'discogs':
        testResult = await testDiscogs(configuration);
        break;
      case 'wikiludo':
        testResult = await testWikiludo(configuration);
        break;
      default:
        testResult = { success: true, message: 'Provider non teste mais configuration valide' };
    }

    // Mettre a jour le statut
    await configuration.updateStatus(testResult.success ? 'OK' : 'ERREUR');

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details || null
    });
  } catch (error) {
    console.error('Test connection API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtient les statistiques d'une configuration
 * GET /api/parametres/apis-externes/:id/stats
 */
const getStats = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationAPI.findByPk(id);
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration non trouvee'
      });
    }

    const tauxSucces = configuration.total_requetes > 0
      ? Math.round((configuration.total_succes / configuration.total_requetes) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        total_requetes: configuration.total_requetes,
        total_succes: configuration.total_succes,
        taux_succes: tauxSucces,
        requetes_compteur: configuration.requetes_compteur,
        limite_requetes: configuration.limite_requetes,
        periode_limite: configuration.periode_limite,
        date_reset_compteur: configuration.date_reset_compteur,
        derniere_utilisation: configuration.derniere_utilisation,
        dernier_statut: configuration.dernier_statut,
        peut_faire_requete: configuration.peutFaireRequete()
      }
    });
  } catch (error) {
    console.error('Get stats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ==================== FONCTIONS DE TEST ====================

async function testUPCitemdb(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const testEAN = '3558380040057'; // Code EAN de test (jeu Dixit)
    const url = `${config.api_url}?upc=${testEAN}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
      return { success: false, message: 'Limite de requetes atteinte pour aujourd\'hui' };
    }

    const data = await response.json();
    return {
      success: data.code === 'OK',
      message: data.code === 'OK' ? 'Connexion reussie' : `Erreur: ${data.code}`,
      details: { items_found: data.items?.length || 0 }
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testBGG(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    // Utiliser l'URL configuree ou l'URL par defaut
    const baseUrl = config.api_url || 'https://boardgamegeek.com/xmlapi2';
    const url = `${baseUrl}/thing?id=13&type=boardgame`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Assotheque/1.0 (Library Management System)',
        'Accept': 'application/xml, text/xml, */*'
      },
      timeout: 10000
    });

    if (!response.ok) {
      // BGG peut retourner 401 si rate-limited ou bloque
      if (response.status === 401) {
        return {
          success: false,
          message: 'Acces refuse (401). BGG peut limiter les requetes. Reessayez plus tard.',
          details: 'L\'API BGG peut bloquer temporairement certaines IP. La recherche par titre peut quand meme fonctionner.'
        };
      }
      if (response.status === 429) {
        return {
          success: false,
          message: 'Trop de requetes (429). Attendez quelques minutes.',
          details: 'Rate limiting actif. Patientez avant de reessayer.'
        };
      }
      return { success: false, message: `Erreur HTTP: ${response.status}` };
    }

    const text = await response.text();
    const hasData = text.includes('<item');

    return {
      success: hasData,
      message: hasData ? 'Connexion reussie - BGG repond correctement' : 'Reponse invalide (pas de donnees)',
      details: hasData ? 'L\'API BoardGameGeek fonctionne.' : null
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion: ${error.message}`,
      details: 'Verifiez votre connexion internet ou reessayez plus tard.'
    };
  }
}

async function testOpenLibrary(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const url = 'https://openlibrary.org/isbn/9782070541270.json';
    const response = await fetch(url);

    return {
      success: response.ok,
      message: response.ok ? 'Connexion reussie' : `Erreur HTTP: ${response.status}`
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testTMDB(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const apiKey = config.getDecryptedApiKey();
    if (!apiKey) {
      return { success: false, message: 'Cle API non configuree' };
    }

    const url = `${config.api_url}/configuration?api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      success: !data.status_code,
      message: data.status_message || 'Connexion reussie'
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testMusicBrainz(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const url = `${config.api_url}/release/b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d?fmt=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Assotheque/1.0 (contact@example.com)' }
    });

    return {
      success: response.ok,
      message: response.ok ? 'Connexion reussie' : `Erreur HTTP: ${response.status}`
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testBNF(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    // Test avec un ISBN connu (Le Petit Prince)
    const testIsbn = '9782070408504';
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${testIsbn}%22&recordSchema=dublincore&maximumRecords=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Assotheque/1.0' }
    });

    if (!response.ok) {
      return { success: false, message: `Erreur HTTP: ${response.status}` };
    }

    const text = await response.text();

    // Verifier que la reponse contient des resultats SRU valides
    if (text.includes('searchRetrieveResponse') && text.includes('numberOfRecords')) {
      const hasResults = !text.includes('<numberOfRecords>0</numberOfRecords>');
      return {
        success: true,
        message: hasResults
          ? 'Connexion reussie - API SRU BNF fonctionnelle (test ISBN Le Petit Prince)'
          : 'Connexion reussie - API repond mais aucun resultat pour le test'
      };
    }

    return { success: false, message: 'Reponse invalide de l\'API SRU' };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testGoogleBooks(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const apiKey = config.getDecryptedApiKey();
    // Google Books fonctionne aussi sans cle (avec limites)
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=isbn:9782070408504&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=isbn:9782070408504`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { success: false, message: data.error.message || 'Erreur API' };
    }

    return {
      success: true,
      message: `Connexion reussie - ${data.totalItems || 0} resultat(s) trouve(s)`
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testDiscogs(config) {
  const fetch = (await import('node-fetch')).default;
  try {
    const apiKey = config.getDecryptedApiKey();
    if (!apiKey) {
      return { success: false, message: 'Token Discogs requis pour l\'API' };
    }

    // Test avec une recherche simple
    const url = `https://api.discogs.com/database/search?q=test&type=release&per_page=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Assotheque/1.0',
        'Authorization': `Discogs token=${apiKey}`
      }
    });

    if (!response.ok) {
      return { success: false, message: `Erreur HTTP: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: `Connexion reussie - ${data.pagination?.items || 0} resultat(s) disponible(s)`
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

async function testWikiludo(config) {
  try {
    const WikiludoProvider = require('../services/providers/WikiludoProvider');
    const provider = new WikiludoProvider();

    // Test de connexion
    const connResult = await provider.testConnection();
    if (!connResult.success) {
      return { success: false, message: connResult.message };
    }

    // Test avec une recherche pour verifier que ca fonctionne
    const searchResult = await provider.search('Catan');
    if (searchResult && searchResult.titre) {
      return {
        success: true,
        message: `Connexion reussie - Test: "${searchResult.titre}" trouve`,
        details: `Base Wikiludo accessible (${searchResult.editeur || 'editeur inconnu'})`
      };
    }

    return {
      success: true,
      message: 'Connexion reussie - Wikiludo accessible',
      details: 'Recherche de test sans resultat'
    };
  } catch (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }
}

module.exports = {
  getAllConfigurations,
  getProviders,
  getConfigurationById,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  reorderConfigurations,
  toggleActif,
  setAsDefault,
  testConnection,
  getStats
};
