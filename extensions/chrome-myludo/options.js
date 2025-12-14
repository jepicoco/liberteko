/**
 * Script de la page d'options
 */

const form = document.getElementById('configForm');
const serverUrlInput = document.getElementById('serverUrl');
const apiKeyInput = document.getElementById('apiKey');
const statusEl = document.getElementById('status');
const connectionStatusEl = document.getElementById('connectionStatus');

/**
 * Charge la configuration sauvegardee
 */
function loadConfig() {
  chrome.storage.sync.get(['serverUrl', 'apiKey'], (result) => {
    if (result.serverUrl) serverUrlInput.value = result.serverUrl;
    if (result.apiKey) apiKeyInput.value = result.apiKey;
  });
}

/**
 * Sauvegarde la configuration
 */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  let serverUrl = serverUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  // Retirer le slash final
  if (serverUrl.endsWith('/')) {
    serverUrl = serverUrl.slice(0, -1);
  }

  chrome.storage.sync.set({ serverUrl, apiKey }, () => {
    showStatus('Configuration sauvegardee avec succes!', 'success');
    testConnection();
  });
});

/**
 * Teste la connexion au serveur
 */
async function testConnection() {
  const serverUrl = serverUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!serverUrl || !apiKey) {
    showStatus('Veuillez remplir tous les champs', 'error');
    return;
  }

  updateConnectionStatus('testing');

  try {
    const response = await fetch(`${serverUrl}/api/external/stats`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      updateConnectionStatus('connected', data.data);
      showStatus(`Connexion reussie! Cle: ${data.data.key_prefix}`, 'success');
    } else {
      updateConnectionStatus('disconnected');
      showStatus(`Erreur: ${data.message || 'Connexion refusee'}`, 'error');
    }
  } catch (error) {
    updateConnectionStatus('disconnected');
    showStatus(`Erreur de connexion: ${error.message}`, 'error');
  }
}

/**
 * Affiche un message de statut
 */
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  // Masquer apres 5 secondes
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

/**
 * Met a jour le statut de connexion
 */
function updateConnectionStatus(status, data = null) {
  connectionStatusEl.style.display = 'flex';

  const dot = connectionStatusEl.querySelector('.dot');
  const text = connectionStatusEl.querySelector('.text');

  switch (status) {
    case 'testing':
      dot.className = 'dot unknown';
      text.textContent = 'Test en cours...';
      break;
    case 'connected':
      dot.className = 'dot connected';
      text.textContent = data
        ? `Connecte - ${data.total_requetes || 0} requetes effectuees`
        : 'Connecte';
      break;
    case 'disconnected':
      dot.className = 'dot disconnected';
      text.textContent = 'Non connecte';
      break;
    default:
      dot.className = 'dot unknown';
      text.textContent = 'Non teste';
  }
}

// Charger la config au demarrage
document.addEventListener('DOMContentLoaded', loadConfig);
