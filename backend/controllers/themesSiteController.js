const path = require('path');
const fs = require('fs');
const { ParametresFront } = require('../models');
const themeService = require('../services/themeService');
const { invalidateThemeCache } = require('../middleware/themeResolver');

/**
 * Controller pour la gestion des themes du site public
 * Les themes sont stockes dans le filesystem (frontend/themes/)
 * et detectes automatiquement via leur manifest.json
 */
class ThemesSiteController {
  /**
   * Recupere tous les themes disponibles
   * GET /api/parametres/themes
   */
  static async getAll(req, res) {
    try {
      const themes = themeService.scanThemes(true); // Force refresh

      // Recuperer le theme actif
      const parametres = await ParametresFront.findOne();
      const activeThemeCode = parametres?.theme_code || 'default';

      res.json({
        themes: themes.map(t => ({
          code: t.code,
          name: t.name,
          description: t.description,
          author: t.author,
          version: t.version,
          mode: t.mode,
          colors: t.colors,
          style: t.style,
          preview: t.preview,
          hasManifest: t.hasManifest,
          files: t.files,
          isActive: t.code === activeThemeCode
        })),
        activeTheme: activeThemeCode
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation des themes:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation des themes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Recupere un theme par son code
   * GET /api/parametres/themes/:code
   */
  static async getByCode(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${code}`
        });
      }

      // Recuperer le theme actif
      const parametres = await ParametresFront.findOne();
      const activeThemeCode = parametres?.theme_code || 'default';

      res.json({
        ...theme,
        isActive: theme.code === activeThemeCode
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Genere le CSS d'un theme
   * GET /api/parametres/themes/:code/css
   */
  static async getCSS(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${code}`
        });
      }

      const css = themeService.generateThemeCSS(theme);

      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.send(css);
    } catch (error) {
      console.error('Erreur lors de la generation du CSS:', error);
      res.status(500).json({
        error: 'Erreur lors de la generation du CSS',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cree un nouveau theme
   * POST /api/parametres/themes
   */
  static async create(req, res) {
    try {
      const { code, name, description, author, mode, colors, style } = req.body;

      if (!code || !name) {
        return res.status(400).json({
          error: 'Les champs "code" et "name" sont requis'
        });
      }

      // Valider le code (alphanumerique + tirets)
      if (!/^[a-z0-9-]+$/.test(code)) {
        return res.status(400).json({
          error: 'Le code doit contenir uniquement des lettres minuscules, chiffres et tirets'
        });
      }

      const themePath = themeService.createTheme(code, {
        name,
        description,
        author,
        mode,
        colors,
        style
      });

      const theme = themeService.getTheme(code);

      res.status(201).json({
        message: 'Theme cree avec succes',
        theme,
        path: themePath
      });
    } catch (error) {
      console.error('Erreur lors de la creation du theme:', error);

      if (error.message.includes('existe deja')) {
        return res.status(400).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la creation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Met a jour le manifest d'un theme
   * PUT /api/parametres/themes/:code
   */
  static async update(req, res) {
    try {
      const { code } = req.params;

      if (!themeService.themeExists(code)) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Empecher la modification du code
      delete req.body.code;

      const updated = themeService.updateManifest(code, req.body);

      res.json({
        message: 'Theme mis a jour',
        manifest: updated
      });
    } catch (error) {
      console.error('Erreur lors de la mise a jour du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise a jour du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Supprime un theme
   * DELETE /api/parametres/themes/:code
   */
  static async delete(req, res) {
    try {
      const { code } = req.params;

      // Verifier que ce n'est pas le theme actif
      const parametres = await ParametresFront.findOne();
      if (parametres?.theme_code === code) {
        return res.status(400).json({
          error: 'Impossible de supprimer le theme actif. Changez de theme d\'abord.'
        });
      }

      themeService.deleteTheme(code);

      res.json({
        message: 'Theme supprime'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du theme:', error);

      if (error.message.includes('default')) {
        return res.status(403).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la suppression du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Duplique un theme
   * POST /api/parametres/themes/:code/duplicate
   */
  static async duplicate(req, res) {
    try {
      const { code } = req.params;
      const { newCode, newName } = req.body;

      if (!newCode) {
        return res.status(400).json({
          error: 'Le champ "newCode" est requis'
        });
      }

      // Valider le code
      if (!/^[a-z0-9-]+$/.test(newCode)) {
        return res.status(400).json({
          error: 'Le code doit contenir uniquement des lettres minuscules, chiffres et tirets'
        });
      }

      const newTheme = themeService.duplicateTheme(code, newCode, newName);

      res.status(201).json({
        message: 'Theme duplique',
        theme: newTheme
      });
    } catch (error) {
      console.error('Erreur lors de la duplication du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la duplication du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Active un theme pour le site
   * POST /api/parametres/themes/:code/activate
   */
  static async activate(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Mettre a jour ParametresFront
      let parametres = await ParametresFront.findOne();
      if (!parametres) {
        parametres = await ParametresFront.create({});
      }

      // Mettre a jour le code du theme et les couleurs
      parametres.theme_code = code;
      parametres.couleur_primaire = theme.colors?.primary || '#667eea';
      parametres.couleur_secondaire = theme.colors?.secondary || '#764ba2';

      await parametres.save();

      // Invalider le cache du theme resolver
      invalidateThemeCache();

      res.json({
        message: `Theme "${theme.name}" active`,
        theme: {
          code: theme.code,
          name: theme.name,
          mode: theme.mode
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'activation du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'activation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exporte un theme en JSON (manifest + structure)
   * GET /api/parametres/themes/:code/export
   */
  static async exportTheme(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      const manifest = themeService.readManifest(code);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="theme_${code}.json"`);
      res.send(JSON.stringify(manifest, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'export du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'export du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Rafraichit le cache des themes
   * POST /api/parametres/themes/refresh
   */
  static async refresh(req, res) {
    try {
      themeService.invalidateCache();
      const themes = themeService.scanThemes(true);

      res.json({
        message: 'Cache des themes rafraichi',
        count: themes.length
      });
    } catch (error) {
      console.error('Erreur lors du rafraichissement:', error);
      res.status(500).json({
        error: 'Erreur lors du rafraichissement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ============================================
  // ROUTES PUBLIQUES (pas d'auth)
  // ============================================

  /**
   * Recupere le theme actif pour le site public
   * GET /api/public/theme
   */
  static async getPublicTheme(req, res) {
    try {
      const parametres = await ParametresFront.findOne();
      const themeCode = parametres?.theme_code || 'default';
      const theme = themeService.getTheme(themeCode);

      let css = '';

      if (theme) {
        css = themeService.generateThemeCSS(theme);
      } else {
        // Fallback si theme non trouve
        css = `:root {
  --color-primary: ${parametres?.couleur_primaire || '#667eea'};
  --color-secondary: ${parametres?.couleur_secondaire || '#764ba2'};
}`;
      }

      // Ajouter CSS personnalise si present
      if (parametres?.css_personnalise) {
        css += `\n\n/* CSS Personnalise */\n${parametres.css_personnalise}`;
      }

      res.json({
        theme: theme ? {
          code: theme.code,
          name: theme.name,
          mode: theme.mode
        } : null,
        css,
        allow_selection: parametres?.allow_theme_selection || false
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation du theme public:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Liste les themes disponibles pour selection publique
   * GET /api/public/themes
   */
  static async getPublicThemes(req, res) {
    try {
      const parametres = await ParametresFront.findOne();

      if (!parametres || !parametres.allow_theme_selection) {
        return res.json({ themes: [], allow_selection: false });
      }

      const themes = themeService.scanThemes();

      res.json({
        themes: themes.map(t => ({
          code: t.code,
          name: t.name,
          mode: t.mode,
          colors: {
            primary: t.colors?.primary,
            secondary: t.colors?.secondary
          },
          preview: t.preview
        })),
        allow_selection: true
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation des themes publics:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation des themes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Recupere le CSS d'un theme pour le public
   * GET /api/public/themes/:code/css
   */
  static async getPublicThemeCSS(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).send('/* Theme not found */');
      }

      const css = themeService.generateThemeCSS(theme);

      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(css);
    } catch (error) {
      console.error('Erreur lors de la generation du CSS public:', error);
      res.status(500).send('/* Error generating CSS */');
    }
  }

  // ============================================
  // GESTION DES FICHIERS DE THEME
  // ============================================

  /**
   * Liste les fichiers d'un theme
   * GET /api/parametres/themes/:code/files
   */
  static async getFiles(req, res) {
    try {
      const { code } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      res.json({
        theme: { code: theme.code, name: theme.name },
        files: theme.files,
        path: theme.path
      });
    } catch (error) {
      console.error('Erreur liste fichiers theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la liste des fichiers',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Lit le contenu d'un fichier du theme
   * GET /api/parametres/themes/:code/files/:type/:filename
   */
  static async readFile(req, res) {
    try {
      const { code, type, filename } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const cleanFilename = path.basename(filename);
      let filePath;

      switch (type) {
        case 'css':
          filePath = path.join(theme.path, 'css', cleanFilename);
          break;
        case 'js':
          filePath = path.join(theme.path, 'js', cleanFilename);
          break;
        case 'page':
          filePath = path.join(theme.path, cleanFilename);
          break;
        case 'usager':
          filePath = path.join(theme.path, 'usager', cleanFilename);
          break;
        default:
          return res.status(400).json({ error: 'Type invalide' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouve' });
      }

      const content = fs.readFileSync(filePath, 'utf8');

      res.json({
        filename: cleanFilename,
        type,
        content
      });
    } catch (error) {
      console.error('Erreur lecture fichier theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la lecture du fichier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Sauvegarde un fichier dans le theme
   * POST /api/parametres/themes/:code/files
   */
  static async saveFile(req, res) {
    try {
      const { code } = req.params;
      const { filename, content, type } = req.body;

      if (!filename || content === undefined) {
        return res.status(400).json({ error: 'filename et content requis' });
      }

      const theme = themeService.getTheme(code);
      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const cleanFilename = path.basename(filename);
      let filePath;

      switch (type) {
        case 'css':
          filePath = path.join(theme.path, 'css', cleanFilename);
          break;
        case 'js':
          filePath = path.join(theme.path, 'js', cleanFilename);
          break;
        case 'page':
          filePath = path.join(theme.path, cleanFilename);
          break;
        case 'usager':
          filePath = path.join(theme.path, 'usager', cleanFilename);
          // Creer le dossier usager si necessaire
          const usagerDir = path.join(theme.path, 'usager');
          if (!fs.existsSync(usagerDir)) {
            fs.mkdirSync(usagerDir, { recursive: true });
          }
          break;
        default:
          return res.status(400).json({ error: 'Type invalide (css, js, page, usager)' });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      themeService.invalidateCache();

      res.json({
        message: 'Fichier sauvegarde',
        filename: cleanFilename,
        path: filePath.replace(theme.path, '')
      });
    } catch (error) {
      console.error('Erreur sauvegarde fichier theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la sauvegarde du fichier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Supprime un fichier du theme
   * DELETE /api/parametres/themes/:code/files/:type/:filename
   */
  static async deleteFile(req, res) {
    try {
      const { code, type, filename } = req.params;
      const theme = themeService.getTheme(code);

      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const cleanFilename = path.basename(filename);
      let filePath;

      switch (type) {
        case 'css':
          filePath = path.join(theme.path, 'css', cleanFilename);
          break;
        case 'js':
          filePath = path.join(theme.path, 'js', cleanFilename);
          break;
        case 'page':
          filePath = path.join(theme.path, cleanFilename);
          break;
        case 'usager':
          filePath = path.join(theme.path, 'usager', cleanFilename);
          break;
        default:
          return res.status(400).json({ error: 'Type invalide' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouve' });
      }

      fs.unlinkSync(filePath);
      themeService.invalidateCache();

      res.json({
        message: 'Fichier supprime',
        filename: cleanFilename
      });
    } catch (error) {
      console.error('Erreur suppression fichier theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la suppression du fichier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ThemesSiteController;
