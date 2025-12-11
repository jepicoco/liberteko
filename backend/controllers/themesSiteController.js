const path = require('path');
const fs = require('fs');
const { ThemeSite, ParametresFront } = require('../models');
const { createThemeStructure, listThemeFiles, invalidateThemeCache, OVERRIDABLE_PAGES } = require('../middleware/themeResolver');

// Chemin vers le dossier frontend
const FRONTEND_PATH = path.join(__dirname, '../../frontend');

/**
 * Controller pour la gestion des themes du site public
 */
class ThemesSiteController {
  /**
   * Recupere tous les themes (actifs et inactifs pour l'admin)
   * GET /api/parametres/themes
   */
  static async getAll(req, res) {
    try {
      // Retourner tous les themes pour l'admin (le filtrage se fait cote frontend)
      const themes = await ThemeSite.findAll({
        order: [['ordre_affichage', 'ASC'], ['nom', 'ASC']]
      });

      res.json({
        themes: themes.map(t => ({
          id: t.id,
          code: t.code,
          nom: t.nom,
          description: t.description,
          type: t.type,
          mode: t.mode,
          actif: t.actif,
          couleur_primaire: t.couleur_primaire,
          couleur_secondaire: t.couleur_secondaire,
          couleur_accent: t.couleur_accent,
          couleur_fond_principal: t.couleur_fond_principal,
          couleur_fond_secondaire: t.couleur_fond_secondaire,
          couleur_texte_principal: t.couleur_texte_principal,
          couleur_texte_secondaire: t.couleur_texte_secondaire,
          navbar_style: t.navbar_style,
          shadow_style: t.shadow_style,
          border_radius: t.border_radius,
          preview_image: t.preview_image,
          ordre_affichage: t.ordre_affichage
        }))
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
   * Recupere un theme par son code ou ID
   * GET /api/parametres/themes/:codeOrId
   */
  static async getByCodeOrId(req, res) {
    try {
      const { codeOrId } = req.params;
      let theme;

      // Essayer par ID si numerique
      if (!isNaN(codeOrId)) {
        theme = await ThemeSite.findByPk(parseInt(codeOrId));
      } else {
        theme = await ThemeSite.getByCode(codeOrId);
      }

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${codeOrId}`
        });
      }

      res.json(theme);
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
   * GET /api/parametres/themes/:codeOrId/css
   */
  static async getCSS(req, res) {
    try {
      const { codeOrId } = req.params;
      let theme;

      if (!isNaN(codeOrId)) {
        theme = await ThemeSite.findByPk(parseInt(codeOrId));
      } else {
        theme = await ThemeSite.getByCode(codeOrId);
      }

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${codeOrId}`
        });
      }

      const css = theme.genererCSS();

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
   * Cree un nouveau theme personnalise
   * POST /api/parametres/themes
   */
  static async create(req, res) {
    try {
      // Generer un code unique si non fourni
      if (!req.body.code) {
        req.body.code = `custom_${Date.now()}`;
      }

      // Forcer le type custom
      req.body.type = 'custom';

      const theme = await ThemeSite.create(req.body);

      res.status(201).json({
        message: 'Theme cree avec succes',
        theme
      });
    } catch (error) {
      console.error('Erreur lors de la creation du theme:', error);

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          error: 'Un theme avec ce code existe deja'
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la creation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Met a jour un theme
   * PUT /api/parametres/themes/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Empecher la modification des themes systeme (sauf CSS personnalise)
      if (theme.type === 'system') {
        // Autoriser uniquement css_personnalise et ordre_affichage pour themes system
        const champsAutorises = ['css_personnalise', 'ordre_affichage', 'actif'];
        const champsDemandes = Object.keys(req.body);
        const champsNonAutorises = champsDemandes.filter(c => !champsAutorises.includes(c));

        if (champsNonAutorises.length > 0) {
          return res.status(403).json({
            error: 'Les themes systeme ne peuvent pas etre modifies',
            champs_bloques: champsNonAutorises
          });
        }
      }

      // Empecher de changer le type
      delete req.body.type;
      delete req.body.code;

      await theme.update(req.body);

      res.json({
        message: 'Theme mis a jour',
        theme
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
   * Supprime un theme personnalise
   * DELETE /api/parametres/themes/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      if (theme.type === 'system') {
        return res.status(403).json({
          error: 'Les themes systeme ne peuvent pas etre supprimes'
        });
      }

      await theme.destroy();

      res.json({
        message: 'Theme supprime'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la suppression du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Duplique un theme
   * POST /api/parametres/themes/:id/duplicate
   */
  static async duplicate(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Creer une copie
      const data = theme.toExportJSON();
      data.code = `${theme.code}_copy_${Date.now()}`;
      data.nom = req.body.nom || `${theme.nom} (copie)`;
      data.type = 'custom';
      data.actif = true;

      const newTheme = await ThemeSite.create(data);

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
   * POST /api/parametres/themes/:id/activate
   */
  static async activate(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      if (!theme.actif) {
        return res.status(400).json({
          error: 'Ce theme est desactive'
        });
      }

      // Mettre a jour ParametresFront
      let parametres = await ParametresFront.findOne();
      if (!parametres) {
        parametres = await ParametresFront.create({});
      }

      // Mettre a jour les couleurs depuis le theme
      parametres.couleur_primaire = theme.couleur_primaire;
      parametres.couleur_secondaire = theme.couleur_secondaire;

      // Si le champ theme_id existe
      if ('theme_id' in parametres) {
        parametres.theme_id = theme.id;
      }

      await parametres.save();

      // Invalider le cache du theme resolver
      invalidateThemeCache();

      // Creer la structure de dossiers si elle n'existe pas
      createThemeStructure(theme.code, FRONTEND_PATH);

      res.json({
        message: `Theme "${theme.nom}" active`,
        theme: {
          id: theme.id,
          code: theme.code,
          nom: theme.nom
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
   * Exporte un theme en JSON
   * GET /api/parametres/themes/:id/export
   */
  static async exportTheme(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      const data = theme.toExportJSON();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="theme_${theme.code}.json"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'export du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'export du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Importe un theme depuis JSON
   * POST /api/parametres/themes/import
   */
  static async importTheme(req, res) {
    try {
      const data = req.body;

      if (!data.nom) {
        return res.status(400).json({
          error: 'Le champ "nom" est requis'
        });
      }

      // Generer un code unique
      data.code = `imported_${Date.now()}`;
      data.type = 'custom';
      data.actif = true;

      const theme = await ThemeSite.create(data);

      res.status(201).json({
        message: 'Theme importe avec succes',
        theme
      });
    } catch (error) {
      console.error('Erreur lors de l\'import du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'import du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reordonne les themes
   * PUT /api/parametres/themes/reorder
   */
  static async reorder(req, res) {
    try {
      const { ordre } = req.body;

      if (!Array.isArray(ordre)) {
        return res.status(400).json({
          error: 'Le champ "ordre" doit etre un tableau d\'IDs'
        });
      }

      for (let i = 0; i < ordre.length; i++) {
        await ThemeSite.update(
          { ordre_affichage: i },
          { where: { id: ordre[i] } }
        );
      }

      res.json({
        message: 'Ordre mis a jour'
      });
    } catch (error) {
      console.error('Erreur lors du reordonnement:', error);
      res.status(500).json({
        error: 'Erreur lors du reordonnement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Toggle actif/inactif
   * PATCH /api/parametres/themes/:id/toggle
   */
  static async toggle(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      theme.actif = !theme.actif;
      await theme.save();

      res.json({
        message: `Theme ${theme.actif ? 'active' : 'desactive'}`,
        actif: theme.actif
      });
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
      res.status(500).json({
        error: 'Erreur lors du toggle',
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

      let theme = null;
      let css = '';

      // Si un theme est defini
      if (parametres && parametres.theme_id) {
        theme = await ThemeSite.findByPk(parametres.theme_id);
        if (theme && theme.actif) {
          css = theme.genererCSS();
        }
      }

      // Sinon, generer CSS depuis les parametres
      if (!css && parametres) {
        css = `:root {
  --primary-color: ${parametres.couleur_primaire || '#667eea'};
  --secondary-color: ${parametres.couleur_secondaire || '#764ba2'};
}`;
        if (parametres.css_personnalise) {
          css += `\n\n/* CSS Personnalise */\n${parametres.css_personnalise}`;
        }
      }

      res.json({
        theme: theme ? {
          id: theme.id,
          code: theme.code,
          nom: theme.nom,
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

      const themes = await ThemeSite.getActifs();

      res.json({
        themes: themes.map(t => ({
          id: t.id,
          code: t.code,
          nom: t.nom,
          mode: t.mode,
          couleur_primaire: t.couleur_primaire,
          couleur_secondaire: t.couleur_secondaire,
          preview_image: t.preview_image
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
      const theme = await ThemeSite.getByCode(code);

      if (!theme) {
        return res.status(404).send('/* Theme not found */');
      }

      const css = theme.genererCSS();

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
   * GET /api/parametres/themes/:id/files
   */
  static async getFiles(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const files = listThemeFiles(theme.code, FRONTEND_PATH);

      res.json({
        theme: { id: theme.id, code: theme.code, nom: theme.nom },
        ...files,
        overridable_pages: OVERRIDABLE_PAGES
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
   * Cree la structure de dossiers pour un theme
   * POST /api/parametres/themes/:id/init-folder
   */
  static async initFolder(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const themePath = createThemeStructure(theme.code, FRONTEND_PATH);

      res.json({
        message: `Structure creee pour le theme "${theme.nom}"`,
        path: themePath,
        structure: ['css/', 'js/', 'assets/', 'README.md']
      });
    } catch (error) {
      console.error('Erreur creation dossier theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la creation de la structure',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload un fichier dans le theme (page HTML, CSS, JS)
   * POST /api/parametres/themes/:id/files
   * Body: { filename: string, content: string, type: 'page'|'css'|'js' }
   */
  static async uploadFile(req, res) {
    try {
      const { id } = req.params;
      const { filename, content, type } = req.body;

      if (!filename || !content) {
        return res.status(400).json({ error: 'filename et content requis' });
      }

      const theme = await ThemeSite.findByPk(id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      // Securite: nettoyer le nom de fichier
      const cleanFilename = path.basename(filename);

      // Determiner le chemin selon le type
      let filePath;
      switch (type) {
        case 'css':
          if (!cleanFilename.endsWith('.css')) {
            return res.status(400).json({ error: 'Extension .css requise' });
          }
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'css', cleanFilename);
          break;
        case 'js':
          if (!cleanFilename.endsWith('.js')) {
            return res.status(400).json({ error: 'Extension .js requise' });
          }
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'js', cleanFilename);
          break;
        case 'page':
          if (!OVERRIDABLE_PAGES.includes(cleanFilename)) {
            return res.status(400).json({
              error: 'Page non autorisee',
              allowed: OVERRIDABLE_PAGES
            });
          }
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, cleanFilename);
          break;
        default:
          return res.status(400).json({ error: 'Type invalide (page, css, js)' });
      }

      // Creer le dossier si necessaire
      createThemeStructure(theme.code, FRONTEND_PATH);

      // Ecrire le fichier
      fs.writeFileSync(filePath, content, 'utf8');

      res.json({
        message: 'Fichier sauvegarde',
        path: filePath.replace(FRONTEND_PATH, ''),
        filename: cleanFilename
      });
    } catch (error) {
      console.error('Erreur upload fichier theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la sauvegarde du fichier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Lit le contenu d'un fichier du theme
   * GET /api/parametres/themes/:id/files/:type/:filename
   */
  static async readFile(req, res) {
    try {
      const { id, type, filename } = req.params;

      const theme = await ThemeSite.findByPk(id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const cleanFilename = path.basename(filename);
      let filePath;

      switch (type) {
        case 'css':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'css', cleanFilename);
          break;
        case 'js':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'js', cleanFilename);
          break;
        case 'page':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, cleanFilename);
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
   * Supprime un fichier du theme
   * DELETE /api/parametres/themes/:id/files/:type/:filename
   */
  static async deleteFile(req, res) {
    try {
      const { id, type, filename } = req.params;

      const theme = await ThemeSite.findByPk(id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme non trouve' });
      }

      const cleanFilename = path.basename(filename);
      let filePath;

      switch (type) {
        case 'css':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'css', cleanFilename);
          break;
        case 'js':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, 'js', cleanFilename);
          break;
        case 'page':
          filePath = path.join(FRONTEND_PATH, 'themes', theme.code, cleanFilename);
          break;
        default:
          return res.status(400).json({ error: 'Type invalide' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouve' });
      }

      fs.unlinkSync(filePath);

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
