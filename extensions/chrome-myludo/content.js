/**
 * Content script pour MyLudo
 * Extrait les donnees des pages de jeux
 * MyLudo est une SPA avec des URLs en hash (#!)
 */

(function() {
  'use strict';

  let isGamePage = false;
  let currentGameId = null;

  /**
   * Verifie si on est sur une page de jeu
   */
  function checkIfGamePage() {
    const hash = window.location.hash;
    // Format: #!/game/nom-du-jeu-12345
    const match = hash.match(/#!\/game\/([^\/]+)/);
    if (match) {
      const newGameId = match[1];
      if (newGameId !== currentGameId) {
        currentGameId = newGameId;
        isGamePage = true;
        console.log('[Assotheque] Page de jeu detectee:', currentGameId);
        waitForGameContent();
      }
    } else {
      isGamePage = false;
      currentGameId = null;
      removeImportButton();
    }
    return isGamePage;
  }

  /**
   * Extrait les donnees d'une page de jeu MyLudo
   * Structure basee sur l'analyse du HTML reel de MyLudo
   */
  function extractGameData() {
    if (!isGamePage) {
      return { success: false, error: 'Pas sur une page de jeu' };
    }

    const data = {
      source: 'myludo',
      url: window.location.href,
      myludo_id: currentGameId
    };

    try {
      // Titre du jeu - h2 avec classe grey-text text-darken-4
      const titleEl = document.querySelector('h2.grey-text.text-darken-4');
      if (titleEl) {
        // Le titre peut contenir un span.edition pour l'annee
        const editionSpan = titleEl.querySelector('span.edition');
        if (editionSpan) {
          data.annee_sortie = parseInt(editionSpan.textContent.trim());
          // Retirer le span pour avoir le titre propre
          data.titre = titleEl.textContent.replace(editionSpan.textContent, '').trim();
        } else {
          data.titre = titleEl.textContent.trim();
        }
      }

      // Image principale - dans .cover-picture
      const imageEl = document.querySelector('.cover-picture img');
      if (imageEl && imageEl.src) {
        // Prendre l'image en haute resolution si disponible
        let imgUrl = imageEl.src;
        // Remplacer /300/ par la version originale si possible
        if (imgUrl.includes('/300/')) {
          imgUrl = imgUrl.replace('/300/', '/jpg/').replace('.png', '.jpg');
        }
        data.image_url = imgUrl;
      }

      // EAN/Code-barre - dans .details avec icone barcode
      const barcodeEl = document.querySelector('.details .myludo-icons[title="barcode"]');
      if (barcodeEl) {
        const parentP = barcodeEl.closest('p');
        if (parentP) {
          const eanMatch = parentP.textContent.match(/(\d{13})/);
          if (eanMatch) {
            data.ean13 = eanMatch[1];
          }
        }
      }
      // Alternative: chercher directement le texte avec le code-barre
      if (!data.ean13) {
        const detailsCard = document.querySelector('.card-content.details');
        if (detailsCard) {
          const eanMatch = detailsCard.textContent.match(/(\d{13})/);
          if (eanMatch) {
            data.ean13 = eanMatch[1];
          }
        }
      }

      // Nombre de joueurs - dans .indication avec icone groups
      const playersEl = document.querySelector('.indication i[title="Joueurs"]');
      if (playersEl) {
        const playersLabel = playersEl.parentElement.querySelector('.label');
        if (playersLabel) {
          const playersText = playersLabel.textContent.trim();
          // Format: "2 - 4" ou "3+" ou "2-4"
          const rangeMatch = playersText.match(/(\d+)\s*[-–]\s*(\d+)/);
          if (rangeMatch) {
            data.joueurs_min = parseInt(rangeMatch[1]);
            data.joueurs_max = parseInt(rangeMatch[2]);
          } else {
            const singleMatch = playersText.match(/(\d+)\+?/);
            if (singleMatch) {
              data.joueurs_min = parseInt(singleMatch[1]);
              data.joueurs_max = null; // illimite
            }
          }
        }
      }

      // Age minimum - dans .indication avec icone cake
      const ageEl = document.querySelector('.indication i[title="Âge"]');
      if (ageEl) {
        const ageLabel = ageEl.parentElement.querySelector('.label');
        if (ageLabel) {
          const ageMatch = ageLabel.textContent.match(/(\d+)/);
          if (ageMatch) {
            data.age_minimum = parseInt(ageMatch[1]);
          }
        }
      }

      // Duree - dans .indication avec icone timer
      const timeEl = document.querySelector('.indication i[title="Durée"]');
      if (timeEl) {
        const timeLabel = timeEl.parentElement.querySelector('.label');
        if (timeLabel) {
          const timeMatch = timeLabel.textContent.match(/(\d+)/);
          if (timeMatch) {
            data.duree_partie = parseInt(timeMatch[1]);
          }
        }
      }

      // Prix - dans .details .price
      const priceEl = document.querySelector('.details .price');
      if (priceEl) {
        const priceMatch = priceEl.textContent.match(/(\d+)/);
        if (priceMatch) {
          data.prix = parseFloat(priceMatch[1]);
        }
      }

      // Editeur(s) - dans les .people-container avec status "Éditeur"
      const editors = [];
      document.querySelectorAll('.people-container').forEach(container => {
        const status = container.querySelector('.status');
        if (status && status.textContent.includes('diteur')) {
          const titleEl = container.querySelector('.title a');
          if (titleEl) {
            editors.push(titleEl.textContent.trim());
          }
        }
      });
      if (editors.length > 0) {
        data.editeur = editors.join(', ');
      }

      // Auteur(s) - dans les .people-container avec status "Auteur"
      const authors = [];
      document.querySelectorAll('.people-container').forEach(container => {
        const status = container.querySelector('.status');
        if (status && status.textContent.includes('Auteur')) {
          const titleEl = container.querySelector('.title a');
          if (titleEl) {
            authors.push(titleEl.textContent.trim());
          }
        }
      });
      if (authors.length > 0) {
        data.auteur = authors.join(', ');
      }

      // Illustrateur(s) - dans les .people-container avec status "Illustrateur"
      const illustrators = [];
      document.querySelectorAll('.people-container').forEach(container => {
        const status = container.querySelector('.status');
        if (status && status.textContent.includes('Illustrateur')) {
          const titleEl = container.querySelector('.title a');
          if (titleEl) {
            illustrators.push(titleEl.textContent.trim());
          }
        }
      });
      if (illustrators.length > 0) {
        data.illustrateur = illustrators.join(', ');
      }

      // Description - dans .card-content.description
      const descEl = document.querySelector('.card-content.description .hide-on-small-only');
      if (descEl) {
        data.description = descEl.textContent.trim().substring(0, 2000);
      } else {
        // Fallback pour version mobile
        const descMobile = document.querySelector('.card-content.description .line-clamp-8');
        if (descMobile) {
          data.description = descMobile.textContent.trim().substring(0, 2000);
        }
      }

      // Categories/Themes/Mecanismes - dans .themes .chip
      const themes = [];
      const categories = [];
      const mecanismes = [];
      document.querySelectorAll('.themes .chip').forEach(chip => {
        const text = chip.textContent.trim();
        const title = chip.getAttribute('title') || '';

        if (title.includes('Catégorie')) {
          categories.push(text);
        } else if (title.includes('Mécanisme')) {
          mecanismes.push(text);
        } else if (title.includes('Thématique')) {
          themes.push(text);
        }
      });
      if (categories.length > 0) data.categories = categories.join(', ');
      if (themes.length > 0) data.themes = themes.join(', ');
      if (mecanismes.length > 0) data.mecanismes = mecanismes.join(', ');

      // Langue - depuis les drapeaux dans .languages
      const langFlags = document.querySelectorAll('.languages img');
      if (langFlags.length > 0) {
        const langs = [];
        langFlags.forEach(flag => {
          const alt = flag.alt || '';
          const title = flag.title || '';
          if (title) langs.push(title);
          else if (alt.includes('fr')) langs.push('francais');
        });
        if (langs.length > 0) data.langue = langs.join(', ');
      }

      console.log('[Assotheque] Donnees extraites:', data);

    } catch (error) {
      console.error('[Assotheque] Erreur extraction:', error);
    }

    return data;
  }

  /**
   * Ajoute le bouton d'import flottant
   */
  function addImportButton() {
    // Verifier si le bouton existe deja
    if (document.getElementById('assotheque-import-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'assotheque-import-btn';
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Assotheque</span>
    `;
    btn.title = 'Importer vers Assotheque';
    btn.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    };

    document.body.appendChild(btn);
    console.log('[Assotheque] Bouton ajoute');
  }

  /**
   * Retire le bouton d'import
   */
  function removeImportButton() {
    const btn = document.getElementById('assotheque-import-btn');
    if (btn) {
      btn.remove();
    }
  }

  /**
   * Attend que le contenu du jeu soit charge
   */
  function waitForGameContent() {
    let attempts = 0;
    const maxAttempts = 30; // 15 secondes max

    const checkInterval = setInterval(() => {
      attempts++;

      // Chercher le titre du jeu (h2 avec le nom)
      const hasContent = document.querySelector('h2.grey-text.text-darken-4');

      if (hasContent || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (hasContent) {
          addImportButton();
        } else {
          console.log('[Assotheque] Timeout: contenu non trouve');
        }
      }
    }, 500);
  }

  /**
   * Ecoute les messages du popup
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Assotheque] Message recu:', request);

    if (request.action === 'getGameData') {
      // Verifier d'abord si on est sur une page de jeu
      checkIfGamePage();

      if (isGamePage) {
        const data = extractGameData();
        sendResponse({ success: true, data });
      } else {
        sendResponse({ success: false, error: 'Pas sur une page de jeu' });
      }
    } else if (request.action === 'checkGamePage') {
      sendResponse({ isGamePage: checkIfGamePage() });
    }

    return true;
  });

  /**
   * Ecoute les changements de hash (navigation SPA)
   */
  window.addEventListener('hashchange', () => {
    console.log('[Assotheque] Hash change detecte');
    checkIfGamePage();
  });

  // Initialisation
  console.log('[Assotheque] Content script charge sur:', window.location.href);
  checkIfGamePage();

})();
