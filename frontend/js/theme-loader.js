/**
 * Theme Loader Service
 * Charge et applique le thème du site public
 */
(function() {
  'use strict';

  const THEME_STORAGE_KEY = 'selectedTheme';
  const THEME_CSS_ID = 'theme-css';
  const THEME_STYLE_ID = 'theme-dynamic-styles';

  /**
   * Charge le thème actif depuis l'API et l'applique
   */
  async function loadTheme() {
    try {
      const response = await fetch('/api/public/theme');
      if (!response.ok) return;

      const data = await response.json();

      // Appliquer le CSS du thème
      if (data.css) {
        applyThemeCSS(data.css);
      }

      // Stocker les infos du thème
      if (data.theme) {
        window.CURRENT_THEME = data.theme;
        document.documentElement.setAttribute('data-theme', data.theme.mode || 'light');
      }

      // Si la sélection de thème est autorisée, initialiser le sélecteur
      if (data.allow_selection) {
        window.ALLOW_THEME_SELECTION = true;
        initThemeSelector();
      }

    } catch (error) {
      console.warn('Impossible de charger le thème:', error);
    }
  }

  /**
   * Applique le CSS du thème
   */
  function applyThemeCSS(css) {
    // Supprimer l'ancien style de thème s'il existe
    let styleEl = document.getElementById(THEME_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = THEME_STYLE_ID;
      document.head.insertBefore(styleEl, document.head.firstChild);
    }
    styleEl.textContent = css;
  }

  /**
   * Change le thème actif (pour les utilisateurs si autorisé)
   */
  async function switchTheme(themeCode) {
    try {
      const response = await fetch(`/api/public/themes/${themeCode}/css`);
      if (!response.ok) throw new Error('Thème non trouvé');

      const css = await response.text();
      applyThemeCSS(css);

      // Sauvegarder la préférence
      localStorage.setItem(THEME_STORAGE_KEY, themeCode);

      // Mettre à jour l'attribut data-theme
      const themes = window.AVAILABLE_THEMES || [];
      const theme = themes.find(t => t.code === themeCode);
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme.mode || 'light');
        window.CURRENT_THEME = theme;
      }

      // Déclencher un événement
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { code: themeCode } }));

    } catch (error) {
      console.error('Erreur changement de thème:', error);
    }
  }

  /**
   * Initialise le sélecteur de thème
   */
  async function initThemeSelector() {
    try {
      const response = await fetch('/api/public/themes');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.allow_selection || !data.themes || data.themes.length === 0) return;

      window.AVAILABLE_THEMES = data.themes;

      // Vérifier si l'utilisateur avait une préférence
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && data.themes.find(t => t.code === savedTheme)) {
        await switchTheme(savedTheme);
      }

      // Créer le bouton de sélection de thème
      createThemeSelectorButton(data.themes);

    } catch (error) {
      console.warn('Impossible de charger les thèmes disponibles:', error);
    }
  }

  /**
   * Crée le bouton flottant de sélection de thème
   */
  function createThemeSelectorButton(themes) {
    // Ne pas créer si déjà existant
    if (document.getElementById('theme-selector-btn')) return;

    // Créer le bouton
    const btn = document.createElement('button');
    btn.id = 'theme-selector-btn';
    btn.className = 'theme-selector-btn';
    btn.innerHTML = '<i class="bi bi-palette"></i>';
    btn.title = 'Changer le thème';
    btn.onclick = () => showThemeModal(themes);

    // Ajouter les styles
    const style = document.createElement('style');
    style.textContent = `
      .theme-selector-btn {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--primary-color, #667eea);
        color: white;
        border: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        transition: all 0.3s ease;
      }
      .theme-selector-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      }
      .theme-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      .theme-modal-overlay.show {
        opacity: 1;
        visibility: visible;
      }
      .theme-modal {
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        transform: translateY(20px);
        transition: transform 0.3s ease;
      }
      .theme-modal-overlay.show .theme-modal {
        transform: translateY(0);
      }
      .theme-modal h5 {
        margin: 0 0 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .theme-modal-close {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .theme-modal-close:hover {
        opacity: 1;
      }
      .theme-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .theme-option:hover {
        border-color: var(--primary-color, #667eea);
        background: #f9fafb;
      }
      .theme-option.active {
        border-color: var(--primary-color, #667eea);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      }
      .theme-colors {
        display: flex;
        gap: 4px;
      }
      .theme-color-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .theme-info {
        flex: 1;
      }
      .theme-info strong {
        display: block;
        margin-bottom: 2px;
      }
      .theme-info small {
        color: #6b7280;
      }
      .theme-mode-badge {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 10px;
        background: #e5e7eb;
        color: #374151;
      }
      .theme-mode-badge.dark {
        background: #1f2937;
        color: white;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(btn);
  }

  /**
   * Affiche le modal de sélection de thème
   */
  function showThemeModal(themes) {
    // Supprimer l'ancien modal s'il existe
    const existingModal = document.getElementById('theme-modal-overlay');
    if (existingModal) existingModal.remove();

    const currentCode = window.CURRENT_THEME?.code || '';

    const overlay = document.createElement('div');
    overlay.id = 'theme-modal-overlay';
    overlay.className = 'theme-modal-overlay';
    overlay.innerHTML = `
      <div class="theme-modal">
        <h5>
          <i class="bi bi-palette"></i>
          Choisir un thème
          <button class="theme-modal-close" onclick="closeThemeModal()">&times;</button>
        </h5>
        <div class="theme-options">
          ${themes.map(theme => `
            <div class="theme-option ${theme.code === currentCode ? 'active' : ''}"
                 onclick="window.ThemeLoader.switchTheme('${theme.code}'); closeThemeModal();">
              <div class="theme-colors">
                <div class="theme-color-dot" style="background: ${theme.couleur_primaire}"></div>
                <div class="theme-color-dot" style="background: ${theme.couleur_secondaire}"></div>
              </div>
              <div class="theme-info">
                <strong>${theme.nom}</strong>
                <small>${theme.mode === 'dark' ? 'Mode sombre' : 'Mode clair'}</small>
              </div>
              <span class="theme-mode-badge ${theme.mode}">${theme.mode === 'dark' ? '🌙' : '☀️'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeThemeModal();
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  /**
   * Ferme le modal de sélection de thème
   */
  window.closeThemeModal = function() {
    const overlay = document.getElementById('theme-modal-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  };

  // Exposer l'API publique
  window.ThemeLoader = {
    loadTheme,
    switchTheme,
    applyThemeCSS
  };

  // Charger le thème au démarrage
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
  } else {
    loadTheme();
  }

})();
