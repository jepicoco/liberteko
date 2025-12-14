/**
 * Service worker pour l'extension Assotheque MyLudo
 */

// Ecouter les messages des content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    // On ne peut pas ouvrir le popup programmatiquement
    // Mais on peut ouvrir l'onglet d'options
    chrome.runtime.openOptionsPage();
  }
  return true;
});

// Installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Ouvrir la page d'options lors de la premiere installation
    chrome.runtime.openOptionsPage();
  }
});

// Click sur l'icone de l'extension (s'execute avant le popup)
chrome.action.onClicked.addListener((tab) => {
  // Le popup s'ouvre automatiquement grace a default_popup
  // Cette fonction ne sera appelee que si on retire default_popup du manifest
});
