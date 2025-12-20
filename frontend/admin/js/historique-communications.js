/**
 * Historique Communications - Gestion unifiee des logs Emails et SMS
 */

// State
let currentPage = 1;
let currentType = 'tous'; // 'tous', 'email', 'sms'
const logsPerPage = 50;

// Cache pour les stats
let emailStats = null;
let smsStats = null;

// Filtre structure local (independant du selecteur global)
let localStructureFilter = null;

/**
 * Verifie si l'utilisateur est administrateur
 */
function isAdmin() {
  const userRole = localStorage.getItem('userRole') || 'usager';
  return userRole === 'administrateur';
}

/**
 * Charge la liste des structures pour le filtre
 */
async function loadStructuresFilter() {
  try {
    const select = document.getElementById('filter-structure');
    if (!select) return;

    // Charger toutes les structures accessibles
    const structures = await apiRequest('/structures');

    // Vider et repeupler le select
    select.innerHTML = '<option value="">Toutes les structures</option>';

    if (structures && structures.length > 0) {
      structures.forEach(structure => {
        const option = document.createElement('option');
        option.value = structure.id;
        option.textContent = structure.nom;
        select.appendChild(option);
      });
      // Afficher le filtre
      document.getElementById('filter-structure-container').style.display = 'block';

      // Synchroniser avec la structure globale si selectionnee
      syncStructureFilterWithGlobal();
    } else {
      // Cacher le filtre si pas de structures
      document.getElementById('filter-structure-container').style.display = 'none';
    }
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    document.getElementById('filter-structure-container').style.display = 'none';
  }
}

/**
 * Synchronise le filtre structure avec le selecteur global
 */
function syncStructureFilterWithGlobal() {
  const select = document.getElementById('filter-structure');
  if (!select) return;

  // Utiliser la structure globale courante
  const globalStructureId = window.CURRENT_STRUCTURE_ID || (typeof getCurrentStructureId === 'function' ? getCurrentStructureId() : null);

  if (globalStructureId) {
    select.value = globalStructureId;
    localStructureFilter = parseInt(globalStructureId);
  } else {
    select.value = '';
    localStructureFilter = null;
  }
}

/**
 * Gere le changement de filtre structure
 */
function onStructureFilterChange() {
  const select = document.getElementById('filter-structure');
  localStructureFilter = select.value ? parseInt(select.value) : null;

  // Invalider le cache des statistiques
  emailStats = null;
  smsStats = null;

  // Recharger toutes les donnees
  loadAllStatistics();
  loadLogs(1);
  loadProvidersFilter();
}

/**
 * Wrapper pour apiRequest avec structure locale
 * Utilise le filtre structure local au lieu du selecteur global
 */
async function apiRequestWithStructure(endpoint, options = {}) {
  // Sauvegarder la valeur globale actuelle
  const originalGetCurrentStructureId = window.getCurrentStructureId;

  // Remplacer temporairement pour utiliser le filtre local
  if (localStructureFilter !== null) {
    window.getCurrentStructureId = () => localStructureFilter;
  }

  try {
    return await apiRequest(endpoint, options);
  } finally {
    // Restaurer la fonction originale
    window.getCurrentStructureId = originalGetCurrentStructureId;
  }
}

/**
 * Initialisation de la page
 */
function initCommunicationsPage() {
  // Afficher le bouton purge uniquement pour les administrateurs
  if (isAdmin()) {
    const adminActions = document.getElementById('admin-actions');
    if (adminActions) {
      adminActions.innerHTML = `
        <button class="btn btn-outline-danger" onclick="showPurgeModal()">
          <i class="bi bi-trash me-2"></i>
          Purger les anciens logs
        </button>
      `;
    }
  }

  // Charger les structures pour le filtre
  loadStructuresFilter();

  // Charger les stats et les logs
  loadAllStatistics();
  loadLogs(1);
  loadProvidersFilter();

  // Event listeners pour les onglets
  document.querySelectorAll('#commTabs .nav-link').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const type = e.target.closest('.nav-link').dataset.type;
      switchTab(type);
    });
  });

  // Event listener pour le formulaire de purge
  const form = document.getElementById('form-purge-logs');
  if (form) {
    form.addEventListener('submit', handlePurgeSubmit);
  }

  // Event listener pour le filtre destinataire (Enter key)
  const destinataireInput = document.getElementById('filter-destinataire');
  if (destinataireInput) {
    destinataireInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        loadLogs(1);
      }
    });
  }

  // Recharger au changement de structure globale
  window.addEventListener('structureChanged', () => {
    // Synchroniser le filtre avec la nouvelle structure globale
    syncStructureFilterWithGlobal();

    // Invalider le cache des statistiques
    emailStats = null;
    smsStats = null;

    // Recharger toutes les donnees
    loadAllStatistics();
    loadLogs(1);
    loadProvidersFilter();
  });
}

/**
 * Change d'onglet
 */
function switchTab(type) {
  currentType = type;
  currentPage = 1;

  // Afficher/masquer le filtre provider selon l'onglet
  const providerContainer = document.getElementById('filter-provider-container');
  if (type === 'sms') {
    providerContainer.style.display = 'block';
  } else {
    providerContainer.style.display = 'none';
    document.getElementById('filter-provider').value = '';
  }

  // Mettre a jour les stats affichees
  displayStatistics();

  // Recharger les logs
  loadLogs(1);
}

/**
 * Charge toutes les statistiques (emails + SMS)
 */
async function loadAllStatistics() {
  try {
    // Charger les deux en parallele (avec filtre structure local)
    const [emailData, smsData] = await Promise.all([
      apiRequestWithStructure('/email-logs/statistics').catch(() => null),
      apiRequestWithStructure('/sms-logs/statistics').catch(() => null)
    ]);

    emailStats = emailData;
    smsStats = smsData;

    // Mettre a jour les compteurs dans les onglets
    updateTabCounts();

    // Afficher les stats
    displayStatistics();

  } catch (error) {
    console.error('Erreur chargement statistiques:', error);
    document.getElementById('comm-statistics').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement des statistiques
      </div>
    `;
  }
}

/**
 * Met a jour les compteurs dans les onglets
 */
function updateTabCounts() {
  const emailTotal = emailStats?.statistiquesGenerales?.total || 0;
  const smsTotal = smsStats?.statistiquesGenerales?.total || 0;

  document.getElementById('count-tous').textContent = emailTotal + smsTotal;
  document.getElementById('count-emails').textContent = emailTotal;
  document.getElementById('count-sms').textContent = smsTotal;
}

/**
 * Affiche les statistiques selon l'onglet actif
 */
function displayStatistics() {
  const container = document.getElementById('comm-statistics');

  if (currentType === 'email') {
    displayEmailStatistics(container);
  } else if (currentType === 'sms') {
    displaySmsStatistics(container);
  } else {
    displayCombinedStatistics(container);
  }
}

/**
 * Affiche les statistiques combinees
 */
function displayCombinedStatistics(container) {
  const emailData = emailStats?.statistiquesGenerales || { total: 0, envoyes: 0, erreurs: 0, tauxReussite: 0 };
  const smsData = smsStats?.statistiquesGenerales || { total: 0, envoyes: 0, delivres: 0, erreurs: 0, tauxReussite: 0, coutTotal: '0.00' };

  const totalMessages = emailData.total + smsData.total;
  const totalEnvoyes = emailData.envoyes + smsData.envoyes;
  const totalErreurs = emailData.erreurs + smsData.erreurs;
  const tauxGlobal = totalMessages > 0 ? Math.round((totalEnvoyes / totalMessages) * 100) : 0;

  container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-primary mb-1">${totalMessages}</h3>
            <p class="text-muted mb-0 small">Total messages</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-success mb-1">${totalEnvoyes}</h3>
            <p class="text-muted mb-0 small">Envoyes</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-danger mb-1">${totalErreurs}</h3>
            <p class="text-muted mb-0 small">Erreurs</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-info mb-1">${tauxGlobal}%</h3>
            <p class="text-muted mb-0 small">Taux reussite</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100" style="background-color: #e7f1ff;">
          <div class="card-body">
            <h3 class="text-primary mb-1">${emailData.total}</h3>
            <p class="text-muted mb-0 small"><i class="bi bi-envelope"></i> Emails</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100" style="background-color: #d1e7dd;">
          <div class="card-body">
            <h3 class="text-success mb-1">${smsData.total}</h3>
            <p class="text-muted mb-0 small"><i class="bi bi-chat-dots"></i> SMS</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Affiche les statistiques emails
 */
function displayEmailStatistics(container) {
  const data = emailStats?.statistiquesGenerales || { total: 0, envoyes: 0, erreurs: 0, tauxReussite: 0 };

  container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-primary mb-1">${data.total}</h3>
            <p class="text-muted mb-0 small">Total emails</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-success mb-1">${data.envoyes}</h3>
            <p class="text-muted mb-0 small">Envoyes</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-danger mb-1">${data.erreurs}</h3>
            <p class="text-muted mb-0 small">Erreurs</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-info mb-1">${data.tauxReussite}%</h3>
            <p class="text-muted mb-0 small">Taux reussite</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Affiche les statistiques SMS
 */
function displaySmsStatistics(container) {
  const data = smsStats?.statistiquesGenerales || { total: 0, envoyes: 0, delivres: 0, erreurs: 0, tauxReussite: 0, coutTotal: '0.00' };

  container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-primary mb-1">${data.total}</h3>
            <p class="text-muted mb-0 small">Total SMS</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-success mb-1">${data.envoyes}</h3>
            <p class="text-muted mb-0 small">Envoyes</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-primary mb-1">${data.delivres || 0}</h3>
            <p class="text-muted mb-0 small">Delivres</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-danger mb-1">${data.erreurs}</h3>
            <p class="text-muted mb-0 small">Erreurs</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-info mb-1">${data.tauxReussite}%</h3>
            <p class="text-muted mb-0 small">Taux reussite</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card stat-card text-center h-100">
          <div class="card-body">
            <h3 class="text-warning mb-1">${data.coutTotal} EUR</h3>
            <p class="text-muted mb-0 small">Cout total</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Charge les logs selon l'onglet actif
 */
async function loadLogs(page = 1) {
  currentPage = page;

  const destinataire = document.getElementById('filter-destinataire')?.value || '';
  const statut = document.getElementById('filter-statut')?.value || '';
  const provider = document.getElementById('filter-provider')?.value || '';
  const dateDebut = document.getElementById('filter-date-debut')?.value || '';
  const dateFin = document.getElementById('filter-date-fin')?.value || '';

  // Detecter si des filtres sont actifs (incluant le filtre structure local)
  const hasFilters = destinataire || statut || provider || dateDebut || dateFin || localStructureFilter;

  try {
    let allLogs = [];
    let totalItems = 0;
    let emailTotal = 0;
    let smsTotal = 0;

    // Statuts specifiques aux SMS (ne pas charger les emails pour ces statuts)
    const smsOnlyStatuts = ['delivre', 'echec_livraison'];
    const shouldLoadEmails = (currentType === 'tous' || currentType === 'email') && !smsOnlyStatuts.includes(statut);

    if (shouldLoadEmails) {
      const emailParams = new URLSearchParams({
        page: currentPage,
        limit: currentType === 'tous' ? Math.floor(logsPerPage / 2) : logsPerPage
      });
      if (destinataire) emailParams.append('destinataire', destinataire);
      if (statut) emailParams.append('statut', statut);
      if (dateDebut) emailParams.append('date_debut', dateDebut);
      if (dateFin) emailParams.append('date_fin', dateFin);

      try {
        const emailData = await apiRequestWithStructure(`/email-logs?${emailParams.toString()}`);
        const emailLogs = (emailData.emailLogs || []).map(log => ({ ...log, _type: 'email' }));
        allLogs = allLogs.concat(emailLogs);
        emailTotal = emailData.pagination?.total || 0;
        if (currentType === 'email') {
          totalItems = emailTotal;
        }
      } catch (e) {
        console.warn('Erreur chargement emails:', e);
      }
    }

    if (currentType === 'tous' || currentType === 'sms') {
      const smsParams = new URLSearchParams({
        page: currentPage,
        limit: currentType === 'tous' ? Math.floor(logsPerPage / 2) : logsPerPage
      });
      if (destinataire) smsParams.append('destinataire', destinataire);
      if (statut) smsParams.append('statut', statut);
      if (provider) smsParams.append('provider', provider);
      if (dateDebut) smsParams.append('date_debut', dateDebut);
      if (dateFin) smsParams.append('date_fin', dateFin);

      try {
        const smsData = await apiRequestWithStructure(`/sms-logs?${smsParams.toString()}`);
        const smsLogs = (smsData.smsLogs || []).map(log => ({ ...log, _type: 'sms' }));
        allLogs = allLogs.concat(smsLogs);
        smsTotal = smsData.pagination?.total || 0;
        if (currentType === 'sms') {
          totalItems = smsTotal;
        }
      } catch (e) {
        console.warn('Erreur chargement SMS:', e);
      }
    }

    // Trier par date decroissante
    allLogs.sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));

    // Pour l'onglet "tous", limiter au nombre de logs par page
    if (currentType === 'tous') {
      allLogs = allLogs.slice(0, logsPerPage);
      // Utiliser les totaux filtres si des filtres sont actifs, sinon les stats globales
      if (hasFilters) {
        totalItems = emailTotal + smsTotal;
      } else {
        totalItems = (emailStats?.statistiquesGenerales?.total || 0) + (smsStats?.statistiquesGenerales?.total || 0);
      }
    }

    displayLogs(allLogs);

    // Masquer la pagination si aucun resultat
    if (allLogs.length === 0) {
      document.getElementById('logs-pagination').innerHTML = '';
    } else {
      displayPagination({ page: currentPage, total: totalItems, limit: logsPerPage, totalPages: Math.ceil(totalItems / logsPerPage) });
    }

  } catch (error) {
    console.error('Erreur chargement logs:', error);
    showError('Impossible de charger l\'historique');
  }
}

/**
 * Affiche la liste des logs
 */
function displayLogs(logs) {
  const container = document.getElementById('liste-logs');

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i> Aucun message trouve avec les filtres selectionnes.
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead>
          <tr>
            <th style="width: 40px;">Type</th>
            <th>Date</th>
            <th>Destinataire</th>
            <th>Contenu</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  logs.forEach(log => {
    const isEmail = log._type === 'email';
    const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
    const statutBadge = isEmail ? getEmailStatutBadge(log.statut) : getSmsStatutBadge(log.statut);

    const adherentInfo = log.adherent ?
      `${log.adherent.prenom} ${log.adherent.nom}` :
      log.destinataire_nom || '';

    // Contenu : objet pour email, message pour SMS
    const contenu = isEmail ?
      (log.objet || '-') :
      (log.message ? (log.message.length > 40 ? log.message.substring(0, 40) + '...' : log.message) : '-');

    const typeIcon = isEmail ?
      '<span class="type-icon email"><i class="bi bi-envelope"></i></span>' :
      '<span class="type-icon sms"><i class="bi bi-chat-dots"></i></span>';

    html += `
      <tr>
        <td>${typeIcon}</td>
        <td>
          <small>${dateEnvoi}</small>
        </td>
        <td>
          <div>${log.destinataire}</div>
          ${adherentInfo ? `<small class="text-muted">${adherentInfo}</small>` : ''}
        </td>
        <td>
          <div class="text-truncate" style="max-width: 250px;" title="${isEmail ? log.objet : log.message || ''}">
            ${contenu}
          </div>
          ${!isEmail && log.nb_segments > 1 ? `<small class="text-muted">${log.nb_segments} segments</small>` : ''}
        </td>
        <td>${statutBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewLogDetails('${log._type}', ${log.id})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Retourne le badge HTML pour un statut email
 */
function getEmailStatutBadge(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Envoye</span>',
    'erreur': '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Erreur</span>',
    'en_attente': '<span class="badge bg-warning"><i class="bi bi-clock"></i> En attente</span>'
  };
  return badges[statut] || `<span class="badge bg-secondary">${statut}</span>`;
}

/**
 * Retourne le badge HTML pour un statut SMS
 */
function getSmsStatutBadge(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Envoye</span>',
    'delivre': '<span class="badge bg-primary"><i class="bi bi-check2-circle"></i> Delivre</span>',
    'erreur': '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Erreur</span>',
    'echec_livraison': '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> Echec</span>',
    'en_attente': '<span class="badge bg-secondary"><i class="bi bi-clock"></i> En attente</span>'
  };
  return badges[statut] || `<span class="badge bg-secondary">${statut}</span>`;
}

/**
 * Affiche la pagination
 */
function displayPagination(pagination) {
  const container = document.getElementById('logs-pagination');

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <nav>
      <ul class="pagination justify-content-center mb-2">
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadLogs(${pagination.page - 1}); return false;">
            Precedent
          </a>
        </li>
  `;

  const maxPages = 5;
  let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
  let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === pagination.page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadLogs(${i}); return false;">${i}</a>
      </li>
    `;
  }

  html += `
        <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadLogs(${pagination.page + 1}); return false;">
            Suivant
          </a>
        </li>
      </ul>
    </nav>
    <div class="text-center text-muted">
      <small>
        Page ${pagination.page} sur ${pagination.totalPages} (${pagination.total} messages)
      </small>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Affiche les details d'un log
 */
async function viewLogDetails(type, logId) {
  try {
    const endpoint = type === 'email' ? `/email-logs/${logId}` : `/sms-logs/${logId}`;
    const log = await apiRequest(endpoint);

    const content = document.getElementById('log-details-content');
    const title = document.getElementById('modal-details-title');

    if (type === 'email') {
      title.innerHTML = '<i class="bi bi-envelope me-2"></i> Details de l\'email';
      content.innerHTML = buildEmailDetailsHtml(log);
    } else {
      title.innerHTML = '<i class="bi bi-chat-dots me-2"></i> Details du SMS';
      content.innerHTML = buildSmsDetailsHtml(log);
    }

    const modal = new bootstrap.Modal(document.getElementById('modalLogDetails'));
    modal.show();

  } catch (error) {
    console.error('Erreur chargement details:', error);
    showError('Impossible de charger les details');
  }
}

/**
 * Construit le HTML des details d'un email
 */
function buildEmailDetailsHtml(log) {
  const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
  const statutBadge = getEmailStatutBadge(log.statut);

  let html = `
    <div class="row">
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-calendar"></i> Date d'envoi</h6>
        <p>${dateEnvoi}</p>
      </div>
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-flag"></i> Statut</h6>
        <p>${statutBadge}</p>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-person"></i> Destinataire</h6>
        <p>${log.destinataire}</p>
        ${log.destinataire_nom ? `<small class="text-muted">${log.destinataire_nom}</small>` : ''}
      </div>
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-file-text"></i> Template</h6>
        <p>${log.template_code ? `<span class="badge bg-info">${log.template_code}</span>` : '<span class="text-muted">Aucun</span>'}</p>
      </div>
    </div>

    <div class="mb-3">
      <h6><i class="bi bi-envelope"></i> Objet</h6>
      <p>${log.objet}</p>
    </div>

    <div class="mb-3">
      <h6><i class="bi bi-file-code"></i> Corps de l'email</h6>
      <div class="border rounded p-3" style="max-height: 300px; overflow-y: auto; background: #f8f9fa;">
        ${log.corps}
      </div>
    </div>
  `;

  if (log.message_id) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-hash"></i> Message ID</h6>
        <p><code>${log.message_id}</code></p>
      </div>
    `;
  }

  if (log.erreur_message) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-exclamation-triangle text-danger"></i> Message d'erreur</h6>
        <div class="alert alert-danger">${log.erreur_message}</div>
      </div>
    `;
  }

  if (log.adherent) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-person-badge"></i> Adherent lie</h6>
        <p>
          ${log.adherent.prenom} ${log.adherent.nom}
          <br>
          <small class="text-muted">ID: ${log.adherent.id} - ${log.adherent.email}</small>
        </p>
      </div>
    `;
  }

  return html;
}

/**
 * Construit le HTML des details d'un SMS
 */
function buildSmsDetailsHtml(log) {
  const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
  const dateLivraison = log.date_livraison ? new Date(log.date_livraison).toLocaleString('fr-FR') : null;
  const statutBadge = getSmsStatutBadge(log.statut);

  let html = `
    <div class="row">
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-calendar"></i> Date d'envoi</h6>
        <p>${dateEnvoi}</p>
      </div>
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-flag"></i> Statut</h6>
        <p>${statutBadge}</p>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-phone"></i> Destinataire</h6>
        <p>${log.destinataire}</p>
        ${log.destinataire_nom ? `<small class="text-muted">${log.destinataire_nom}</small>` : ''}
      </div>
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-file-text"></i> Template</h6>
        <p>${log.template_code ? `<span class="badge bg-info">${log.template_code}</span>` : '<span class="text-muted">Aucun</span>'}</p>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-layers"></i> Segments</h6>
        <p><span class="badge bg-secondary">${log.nb_segments || 1} segment(s)</span></p>
      </div>
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-building"></i> Provider</h6>
        <p>${log.provider ? `<span class="badge bg-primary">${log.provider}</span>` : '<span class="text-muted">Non specifie</span>'}</p>
      </div>
    </div>

    <div class="mb-3">
      <h6><i class="bi bi-chat-text"></i> Message</h6>
      <div class="border rounded p-3 bg-light">
        ${log.message || '<span class="text-muted">Aucun message</span>'}
      </div>
      <small class="text-muted">${(log.message || '').length} caracteres</small>
    </div>
  `;

  if (dateLivraison) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-check2-all text-success"></i> Date de livraison</h6>
        <p>${dateLivraison}</p>
      </div>
    `;
  }

  if (log.message_id) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-hash"></i> Message ID</h6>
        <p><code>${log.message_id}</code></p>
      </div>
    `;
  }

  if (log.cout) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-currency-euro"></i> Cout</h6>
        <p>${parseFloat(log.cout).toFixed(4)} EUR</p>
      </div>
    `;
  }

  if (log.erreur_code || log.erreur_message) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-exclamation-triangle text-danger"></i> Erreur</h6>
        <div class="alert alert-danger">
          ${log.erreur_code ? `<strong>Code:</strong> ${log.erreur_code}<br>` : ''}
          ${log.erreur_message || 'Erreur inconnue'}
        </div>
      </div>
    `;
  }

  if (log.adherent) {
    html += `
      <div class="mb-3">
        <h6><i class="bi bi-person-badge"></i> Adherent lie</h6>
        <p>
          ${log.adherent.prenom} ${log.adherent.nom}
          <br>
          <small class="text-muted">ID: ${log.adherent.id} - ${log.adherent.telephone || 'Pas de telephone'}</small>
        </p>
      </div>
    `;
  }

  return html;
}

/**
 * Charge la liste des providers SMS pour le filtre
 */
async function loadProvidersFilter() {
  try {
    const providers = await apiRequestWithStructure('/sms-logs/providers');

    const select = document.getElementById('filter-provider');
    if (!select) return;

    // Vider les options existantes sauf "Tous"
    select.innerHTML = '<option value="">Tous</option>';

    providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.provider;
      option.textContent = `${provider.provider} (${provider.total})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Erreur chargement providers:', error);
  }
}

/**
 * Reinitialise les filtres
 */
function resetFilters() {
  document.getElementById('filter-structure').value = '';
  document.getElementById('filter-destinataire').value = '';
  document.getElementById('filter-statut').value = '';
  document.getElementById('filter-provider').value = '';
  document.getElementById('filter-date-debut').value = '';
  document.getElementById('filter-date-fin').value = '';

  // Reset le filtre structure local
  localStructureFilter = null;

  // Invalider le cache et recharger
  emailStats = null;
  smsStats = null;
  loadAllStatistics();
  loadLogs(1);
  loadProvidersFilter();
}

/**
 * Affiche la modal de purge (admin uniquement)
 */
function showPurgeModal() {
  // Verification de securite : seuls les admins peuvent purger
  if (!isAdmin()) {
    showError('Acces refuse. Seuls les administrateurs peuvent purger les logs.');
    return;
  }

  // Pre-selectionner le type selon l'onglet actif
  const purgeType = document.getElementById('purge_type');
  if (currentType === 'email') {
    purgeType.value = 'email';
  } else if (currentType === 'sms') {
    purgeType.value = 'sms';
  } else {
    purgeType.value = 'tous';
  }

  const modal = new bootstrap.Modal(document.getElementById('modalPurgeLogs'));
  modal.show();
}

/**
 * Gere la soumission du formulaire de purge (admin uniquement)
 */
async function handlePurgeSubmit(e) {
  e.preventDefault();

  // Double verification de securite
  if (!isAdmin()) {
    showError('Acces refuse. Seuls les administrateurs peuvent purger les logs.');
    return;
  }

  const type = document.getElementById('purge_type').value;
  const jours = parseInt(document.getElementById('purge_jours').value);

  if (jours < 1) {
    showError('Le nombre de jours doit etre superieur a 0');
    return;
  }

  const typeLabel = type === 'tous' ? 'tous les logs (emails + SMS)' : `les logs ${type}`;
  if (!confirm(`Etes-vous sur de vouloir supprimer ${typeLabel} de plus de ${jours} jours ?`)) {
    return;
  }

  try {
    let results = [];

    if (type === 'tous' || type === 'email') {
      try {
        const emailResult = await apiRequestWithStructure('/email-logs/purge', {
          method: 'POST',
          body: JSON.stringify({ jours })
        });
        results.push(`Emails: ${emailResult.message}`);
      } catch (e) {
        results.push(`Emails: Erreur - ${e.message}`);
      }
    }

    if (type === 'tous' || type === 'sms') {
      try {
        const smsResult = await apiRequestWithStructure('/sms-logs/purge', {
          method: 'POST',
          body: JSON.stringify({ jours })
        });
        results.push(`SMS: ${smsResult.message}`);
      } catch (e) {
        results.push(`SMS: Erreur - ${e.message}`);
      }
    }

    showSuccess(results.join('\n'));

    // Fermer la modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalPurgeLogs'));
    modal.hide();

    // Recharger les donnees
    loadAllStatistics();
    loadLogs(1);

  } catch (error) {
    console.error('Erreur purge logs:', error);
    showError('Impossible de purger les logs');
  }
}

/**
 * Helper pour afficher un message de succes
 */
function showSuccess(message) {
  Swal.fire({
    icon: 'success',
    title: 'Succes',
    text: message,
    timer: 3000,
    timerProgressBar: true
  });
}

/**
 * Helper pour afficher un message d'erreur
 */
function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Erreur',
    text: message
  });
}
