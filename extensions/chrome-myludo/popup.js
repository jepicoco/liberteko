/**
 * Popup script pour l'extension Liberteko MyLudo
 */

let gameData = null;
let config = null;

// Elements du DOM (initialises apres DOMContentLoaded)
let loadingEl, configNeededEl, notGamePageEl, gameContentEl, statusContainerEl, btnImportEl, btnUpdateEl, btnOptionsEl;

/**
 * Initialisation
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialiser les references DOM
  loadingEl = document.getElementById('loading');
  configNeededEl = document.getElementById('config-needed');
  notGamePageEl = document.getElementById('not-game-page');
  gameContentEl = document.getElementById('game-content');
  statusContainerEl = document.getElementById('status-container');
  btnImportEl = document.getElementById('btn-import');
  btnUpdateEl = document.getElementById('btn-update');
  btnOptionsEl = document.getElementById('btn-options');

  // Attacher les event listeners
  btnImportEl.addEventListener('click', () => importGame(false));
  btnUpdateEl.addEventListener('click', () => importGame(true));
  btnOptionsEl.addEventListener('click', openOptions);

  // Lien config dans le message "config requise"
  const configLink = document.getElementById('config-link');
  if (configLink) {
    configLink.addEventListener('click', (e) => {
      e.preventDefault();
      openOptions();
    });
  }

  try {
    // Charger la configuration
    config = await loadConfig();

    if (!config.serverUrl || !config.apiKey) {
      showConfigNeeded();
      return;
    }

    // Verifier si on est sur MyLudo
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('myludo.fr')) {
      showNotGamePage();
      return;
    }

    // Demander les donnees du jeu au content script
    // Le content script detecte si on est sur une page de jeu via le hash
    chrome.tabs.sendMessage(tab.id, { action: 'getGameData' }, async (response) => {
      if (chrome.runtime.lastError) {
        // Le content script n'est peut-etre pas charge, reessayer
        console.log('[Liberteko] Retry - content script not ready:', chrome.runtime.lastError);
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'getGameData' }, handleGameData);
        }, 1000);
      } else {
        handleGameData(response);
      }
    });
  } catch (error) {
    showStatus('Erreur: ' + error.message, 'error');
    hideLoading();
  }
});

/**
 * Charge la configuration depuis le storage
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['serverUrl', 'apiKey'], (result) => {
      resolve({
        serverUrl: result.serverUrl || '',
        apiKey: result.apiKey || ''
      });
    });
  });
}

/**
 * Gere la reception des donnees du jeu
 */
async function handleGameData(response) {
  if (!response || !response.success) {
    showStatus('Impossible de recuperer les donnees du jeu', 'error');
    showNotGamePage();
    return;
  }

  gameData = response.data;
  await displayGamePreview();
}

/**
 * Affiche l'apercu du jeu
 */
async function displayGamePreview() {
  hideLoading();
  gameContentEl.style.display = 'block';

  // Afficher les infos
  document.getElementById('game-title').textContent = gameData.titre || 'Sans titre';
  document.getElementById('game-editeur').textContent = gameData.editeur ? `Editeur: ${gameData.editeur}` : '';
  document.getElementById('game-annee').textContent = gameData.annee_sortie ? `Annee: ${gameData.annee_sortie}` : '';
  document.getElementById('game-ean').textContent = gameData.ean13 ? `EAN: ${gameData.ean13}` : '';

  if (gameData.image_url) {
    document.getElementById('game-image').src = gameData.image_url;
  } else {
    document.getElementById('game-image').style.display = 'none';
  }

  // Verifier si le jeu existe deja
  if (gameData.ean13) {
    try {
      const exists = await checkGameExists(gameData.ean13);
      if (exists) {
        showStatus('Ce jeu existe deja dans votre base', 'warning');
        btnImportEl.style.display = 'none';
        btnUpdateEl.style.display = 'block';
      }
    } catch (error) {
      console.error('Erreur verification:', error);
    }
  }
}

/**
 * Verifie si le jeu existe deja
 */
async function checkGameExists(ean) {
  try {
    const response = await fetch(`${config.serverUrl}/api/external/jeux/check-ean/${ean}`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey
      }
    });

    const data = await response.json();
    return data.success && data.exists;
  } catch (error) {
    console.error('Erreur check EAN:', error);
    return false;
  }
}

/**
 * Importe le jeu
 */
async function importGame(isUpdate = false) {
  if (!gameData) return;

  const btn = isUpdate ? btnUpdateEl : btnImportEl;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Import en cours...';

  try {
    // Envoyer les donnees au serveur
    const response = await fetch(`${config.serverUrl}/api/external/jeux`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({
        ...gameData,
        source: 'myludo',
        source_url: gameData.url
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Erreur serveur');
    }

    const action = result.action === 'created' ? 'cree' : 'mis a jour';
    showStatus(`Jeu ${action} avec succes! (ID: ${result.data.id})`, 'success');

    btn.textContent = 'Termine!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);

  } catch (error) {
    showStatus('Erreur: ' + error.message, 'error');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/**
 * Affiche un message de statut
 */
function showStatus(message, type = 'info') {
  statusContainerEl.innerHTML = `<div class="status ${type}">${message}</div>`;
}

/**
 * Cache le loader
 */
function hideLoading() {
  loadingEl.style.display = 'none';
}

/**
 * Affiche la config requise
 */
function showConfigNeeded() {
  loadingEl.style.display = 'none';
  configNeededEl.style.display = 'block';
}

/**
 * Affiche le message "pas sur une page de jeu"
 */
function showNotGamePage() {
  loadingEl.style.display = 'none';
  notGamePageEl.style.display = 'block';
}

/**
 * Ouvre la page d'options
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}
