/**
 * Animation Toggle - Permet de désactiver les animations des thèmes
 *
 * Usage: Inclure ce script dans les thèmes avec animations.
 * Le bouton sera automatiquement ajouté si le thème supporte les animations.
 * La préférence est stockée en localStorage par thème.
 */

(function() {
  'use strict';

  // Detecter le theme actuel depuis le chemin ou meta tag
  function getCurrentTheme() {
    // Check meta tag first
    const metaTheme = document.querySelector('meta[name="theme-name"]');
    if (metaTheme) return metaTheme.content;

    // Try to detect from CSS path
    const themeLink = document.querySelector('link[href*="/theme/css/"]');
    if (themeLink) {
      const match = themeLink.href.match(/themes\/([^/]+)\//);
      if (match) return match[1];
    }

    // Fallback: check body class or data attribute
    if (document.body.dataset.theme) return document.body.dataset.theme;

    // Default detection from URL path for theme pages
    const pathMatch = window.location.pathname.match(/themes\/([^/]+)\//);
    if (pathMatch) return pathMatch[1];

    return 'default';
  }

  // Themes avec animations
  const ANIMATED_THEMES = ['spring-blossom', 'pixel-geek', 'winter-wonder', 'autumn-harvest'];

  // Clé localStorage
  function getStorageKey(theme) {
    return `theme_animations_disabled_${theme}`;
  }

  // Vérifier si les animations sont désactivées
  function areAnimationsDisabled(theme) {
    return localStorage.getItem(getStorageKey(theme)) === 'true';
  }

  // Basculer l'état des animations
  function toggleAnimations(theme) {
    const disabled = areAnimationsDisabled(theme);
    localStorage.setItem(getStorageKey(theme), (!disabled).toString());
    applyAnimationState(theme);
    updateButtonState(!disabled);
  }

  // Appliquer l'état des animations au body
  function applyAnimationState(theme) {
    const disabled = areAnimationsDisabled(theme);
    document.body.classList.toggle('no-animations', disabled);

    // Also set data attribute for CSS selectors
    document.body.dataset.animationsDisabled = disabled ? 'true' : 'false';
  }

  // Mettre à jour l'apparence du bouton
  function updateButtonState(disabled) {
    const btn = document.getElementById('animation-toggle-btn');
    if (!btn) return;

    const icon = btn.querySelector('i');
    const text = btn.querySelector('span');

    if (disabled) {
      if (icon) {
        icon.className = 'bi bi-play-circle';
      }
      if (text) {
        text.textContent = 'Activer animations';
      }
      btn.title = 'Activer les animations';
      btn.classList.add('animations-off');
      btn.classList.remove('animations-on');
    } else {
      if (icon) {
        icon.className = 'bi bi-pause-circle';
      }
      if (text) {
        text.textContent = 'Desactiver animations';
      }
      btn.title = 'Desactiver les animations';
      btn.classList.remove('animations-off');
      btn.classList.add('animations-on');
    }
  }

  // Créer le bouton toggle
  function createToggleButton(theme) {
    // Ne pas créer si déjà présent
    if (document.getElementById('animation-toggle-btn')) return;

    const disabled = areAnimationsDisabled(theme);

    const btn = document.createElement('button');
    btn.id = 'animation-toggle-btn';
    btn.className = `animation-toggle ${disabled ? 'animations-off' : 'animations-on'}`;
    btn.title = disabled ? 'Activer les animations' : 'Desactiver les animations';
    btn.innerHTML = `
      <i class="bi ${disabled ? 'bi-play-circle' : 'bi-pause-circle'}"></i>
      <span>${disabled ? 'Activer animations' : 'Desactiver animations'}</span>
    `;

    btn.addEventListener('click', () => toggleAnimations(theme));

    // Ajouter les styles inline pour le bouton
    const style = document.createElement('style');
    style.textContent = `
      .animation-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }
      .animation-toggle i {
        font-size: 1.1rem;
      }
      .animation-toggle span {
        display: none;
      }
      .animation-toggle:hover span {
        display: inline;
      }
      .animation-toggle:hover {
        padding-right: 1.2rem;
      }

      /* Theme-specific styling */
      .animation-toggle.animations-on {
        background: rgba(255, 255, 255, 0.9);
        color: #333;
      }
      .animation-toggle.animations-on:hover {
        background: #fff;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }
      .animation-toggle.animations-off {
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
      }
      .animation-toggle.animations-off:hover {
        background: rgba(0, 0, 0, 0.85);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .animation-toggle {
          bottom: 15px;
          right: 15px;
          padding: 0.5rem 0.8rem;
        }
        .animation-toggle span {
          display: none !important;
        }
        .animation-toggle:hover {
          padding-right: 0.8rem;
        }
      }

      /* Respect prefers-reduced-motion */
      @media (prefers-reduced-motion: reduce) {
        .animation-toggle {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(btn);
  }

  // Initialisation
  function init() {
    const theme = getCurrentTheme();

    // Vérifier si c'est un thème avec animations
    if (!ANIMATED_THEMES.includes(theme)) {
      return;
    }

    // Appliquer l'état initial
    applyAnimationState(theme);

    // Créer le bouton une fois le DOM prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => createToggleButton(theme));
    } else {
      createToggleButton(theme);
    }

    // Respecter prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      document.body.classList.add('no-animations');
    }

    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('no-animations');
      } else if (!areAnimationsDisabled(theme)) {
        document.body.classList.remove('no-animations');
      }
    });
  }

  init();
})();
