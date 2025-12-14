/**
 * Provider Wikiludo (ALF) - Scraping de la base de données française de jeux
 * https://www.wikiludo-alf.fr/
 */
const https = require('https');
const logger = require('../../utils/logger');

class WikiludoProvider {
  constructor(config = {}) {
    this.name = 'wikiludo';
    this.baseUrl = 'www.wikiludo-alf.fr';
    this.timeout = config.timeout || 15000;
    this.cookies = null;
  }

  /**
   * Effectue une requête HTTPS avec gestion des redirections et cookies
   */
  makeRequest(path, method = 'GET', data = null, cookies = null, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: path,
        method: method,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        }
      };

      if (cookies) options.headers['Cookie'] = cookies;
      if (data) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          // Gérer les nouveaux cookies
          const newCookies = res.headers['set-cookie']
            ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
            : null;
          const allCookies = newCookies
            ? (cookies ? cookies + '; ' + newCookies : newCookies)
            : cookies;

          // Suivre les redirections
          if (maxRedirects > 0 && (res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            this.makeRequest(res.headers.location, 'GET', null, allCookies, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
          } else {
            resolve({ status: res.statusCode, headers: res.headers, body, cookies: allCookies });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) req.write(data);
      req.end();
    });
  }

  /**
   * Parse le HTML d'une notice pour extraire les données du jeu
   */
  parseNotice(html) {
    const result = {};

    // Fonction helper pour extraire une valeur d'un champ
    const extractField = (label) => {
      const regex = new RegExp(`<b>${label}</b>\\s*</td>\\s*<td[^>]*>([^<]+)`, 'i');
      const match = html.match(regex);
      return match ? this.cleanText(match[1]) : null;
    };

    // Fonction helper pour extraire une valeur multi-ligne
    const extractFieldMultiline = (label) => {
      const regex = new RegExp(`<b>${label}</b>\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
      const match = html.match(regex);
      return match ? this.cleanText(match[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')) : null;
    };

    // Titre (dans le H2)
    const titleMatch = html.match(/<h2>([^<]+?)(?:\s*:\s*[^<]+)?\s*\[jeu\]/i);
    if (titleMatch) {
      result.titre = this.cleanText(titleMatch[1]);
    }

    // Sous-titre
    const subtitleMatch = html.match(/<h2>[^:]+:\s*([^[]+)\[jeu\]/i);
    if (subtitleMatch) {
      result.sous_titre = this.cleanText(subtitleMatch[1]);
    }

    // EAN13
    result.ean = extractField('EAN13');

    // Éditeur
    result.editeur = extractField('Editeur/fabriquant');

    // Année de publication
    const anneeStr = extractField('Année de publication');
    if (anneeStr) {
      const annee = parseInt(anneeStr);
      if (!isNaN(annee)) result.annee_sortie = annee;
    }

    // Année de première édition
    const anneeOrigStr = extractField('Année de première édition');
    if (anneeOrigStr) {
      const anneeOrig = parseInt(anneeOrigStr);
      if (!isNaN(anneeOrig)) result.annee_premiere_edition = anneeOrig;
    }

    // Auteur
    const auteurText = extractFieldMultiline('Auteur');
    if (auteurText) {
      // Format: "Nom, Prénom (Rôle)"
      const auteurMatch = auteurText.match(/([^(]+)/);
      if (auteurMatch) {
        result.auteur = this.cleanText(auteurMatch[1].replace(/,\s*/, ' '));
      }
    }

    // Distributeur
    result.distributeur = extractFieldMultiline('Distributeur');

    // Langue
    result.langue = extractField('Langue');

    // Pays de fabrication
    result.pays_fabrication = extractField('Pays de fabrication');

    // Format/Dimensions
    result.dimensions = extractField('Format');

    // Conditionnement
    result.conditionnement = extractField('Conditionnement');

    // Age minimum
    const ageText = extractFieldMultiline('Age minimum');
    if (ageText) {
      const ageMatch = ageText.match(/(\d+)\s*ans/i);
      if (ageMatch) result.age_minimum = parseInt(ageMatch[1]);
    }

    // Nombre de joueurs
    const joueursText = extractFieldMultiline('Nombre de joueurs');
    if (joueursText) {
      const joueursMatch = joueursText.match(/(\d+)\s*(?:à|-)\s*(\d+)/);
      if (joueursMatch) {
        result.joueurs_min = parseInt(joueursMatch[1]);
        result.joueurs_max = parseInt(joueursMatch[2]);
      } else {
        const singleMatch = joueursText.match(/(\d+)\s*joueur/i);
        if (singleMatch) {
          result.joueurs_min = parseInt(singleMatch[1]);
          result.joueurs_max = result.joueurs_min;
        }
      }
    }

    // Durée de la partie
    const dureeText = extractFieldMultiline('Durée de la partie');
    if (dureeText) {
      const dureeMatch = dureeText.match(/(\d+)\s*minutes/i);
      if (dureeMatch) result.duree_partie = parseInt(dureeMatch[1]);
    }

    // Mécanisme de jeu
    result.mecanismes = extractField('Mécanisme de jeu');

    // Résumé/Description
    result.description = extractFieldMultiline('Résumé');

    // Description matérielle
    result.contenu = extractFieldMultiline('Description matérielle');

    // Image
    const imageMatch = html.match(/src="(https?:\/\/[^"]+\/uploads\/images\/[^"]+)"/i);
    if (imageMatch) {
      result.image_url = imageMatch[1];
    }

    return result;
  }

  /**
   * Nettoie le texte (supprime les espaces multiples, les entités HTML, etc.)
   */
  cleanText(text) {
    if (!text) return null;
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Recherche un jeu par EAN ou par nom
   */
  async search(query) {
    try {
      logger.info(`[Wikiludo] Recherche: ${query}`);

      // Effectuer la recherche
      const searchData = `zebris_usergroupbundle_recherche_rapide_type[rechercheGlobal]=${encodeURIComponent(query)}`;
      const searchResult = await this.makeRequest('/recherche-rapide/', 'POST', searchData, null, 5);

      if (searchResult.status !== 200) {
        logger.warn(`[Wikiludo] Erreur recherche: status ${searchResult.status}`);
        return null;
      }

      // Vérifier s'il y a des résultats
      if (searchResult.body.indexOf('one-by-one') === -1) {
        logger.info(`[Wikiludo] Aucun résultat pour: ${query}`);
        return null;
      }

      // Compter les résultats
      const countMatch = searchResult.body.match(/<b>(\d+)\s*résultat/i);
      const nbResults = countMatch ? parseInt(countMatch[1]) : 0;
      logger.info(`[Wikiludo] ${nbResults} résultat(s) trouvé(s)`);

      // Accéder à la première notice
      const noticeResult = await this.makeRequest('/recherche-notice/one-by-one/1', 'GET', null, searchResult.cookies, 5);

      if (noticeResult.status !== 200) {
        logger.warn(`[Wikiludo] Erreur notice: status ${noticeResult.status}`);
        return null;
      }

      // Parser les données
      const data = this.parseNotice(noticeResult.body);

      if (!data.titre) {
        logger.warn(`[Wikiludo] Pas de titre trouvé dans la notice`);
        return null;
      }

      logger.info(`[Wikiludo] Jeu trouvé: ${data.titre}`);
      return data;

    } catch (error) {
      logger.error(`[Wikiludo] Erreur: ${error.message}`);
      return null;
    }
  }

  /**
   * Recherche par EAN
   */
  async searchByEAN(ean) {
    return this.search(ean);
  }

  /**
   * Recherche par titre (retourne plusieurs résultats)
   */
  async searchByTitle(title, maxResults = 10) {
    try {
      logger.info(`[Wikiludo] Recherche par titre: ${title}`);

      // Effectuer la recherche
      const searchData = `zebris_usergroupbundle_recherche_rapide_type[rechercheGlobal]=${encodeURIComponent(title)}`;
      const searchResult = await this.makeRequest('/recherche-rapide/', 'POST', searchData, null, 5);

      if (searchResult.status !== 200 || searchResult.body.indexOf('one-by-one') === -1) {
        return [];
      }

      // Extraire la liste des résultats depuis la page de recherche
      const results = [];
      const regex = /<a class='noticenum' href="\/recherche-notice\/one-by-one\/\d+">([^<]+)<\/a>\s*(?:<i>([^<]*)<\/i>)?/g;
      let match;

      while ((match = regex.exec(searchResult.body)) !== null && results.length < maxResults) {
        results.push({
          titre: this.cleanText(match[1]),
          description: match[2] ? this.cleanText(match[2]) : null,
          _index: results.length + 1
        });
      }

      // Si on n'a qu'un seul résultat, aller chercher les détails complets
      if (results.length === 1) {
        const fullData = await this.search(title);
        if (fullData) {
          return [fullData];
        }
      }

      return results;

    } catch (error) {
      logger.error(`[Wikiludo] Erreur searchByTitle: ${error.message}`);
      return [];
    }
  }

  /**
   * Test de connexion au service
   */
  async testConnection() {
    try {
      const result = await this.makeRequest('/recherche-rapide/', 'GET', null, null, 3);
      return {
        success: result.status === 200,
        message: result.status === 200 ? 'Connexion OK' : `Erreur HTTP ${result.status}`,
        details: `Wikiludo accessible`
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        details: 'Impossible de se connecter à Wikiludo'
      };
    }
  }
}

module.exports = WikiludoProvider;
