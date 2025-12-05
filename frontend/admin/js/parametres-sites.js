/**
 * Gestion des Sites et Comptes Bancaires
 */

let sites = [];
let comptes = [];
let fermetures = [];
let sortableSites = null;

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ==================== INITIALISATION ====================

async function initSitesPage() {
  // Attendre que le token soit disponible (vérifié par auth-admin.js)
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    await Promise.all([
      loadSites(),
      loadComptes(),
      loadFermetures(),
      loadParametresCalendrier()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-site').addEventListener('submit', handleSiteSubmit);
  document.getElementById('form-compte').addEventListener('submit', handleCompteSubmit);
  document.getElementById('form-fermeture').addEventListener('submit', handleFermetureSubmit);
  document.getElementById('form-parametres-calendrier').addEventListener('submit', handleCalendrierSubmit);

  // Toggle zone vacances selon pays
  document.getElementById('cal_pays').addEventListener('change', () => {
    const pays = document.getElementById('cal_pays').value;
    document.getElementById('zone-vacances-container').style.display = pays === 'FR' ? 'block' : 'none';
    document.getElementById('import-vacances-section').style.display = pays === 'FR' ? 'block' : 'none';
  });
}

// ==================== SITES ====================

async function loadSites() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/sites', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    sites = Array.isArray(data) ? data : [];
    renderSites();
    document.getElementById('count-sites').textContent = sites.length;
    populateSiteSelects();
  } catch (error) {
    console.error('Erreur chargement sites:', error);
    sites = [];
    renderSites();
  }
}

function renderSites() {
  const container = document.getElementById('liste-sites');

  if (sites.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-building display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucun site configure</p>
        <button class="btn btn-primary" onclick="showModalSite()">
          <i class="bi bi-plus-lg"></i> Creer le premier site
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = sites.map(site => `
    <div class="col-md-6 col-lg-4" data-site-id="${site.id}">
      <div class="card site-card h-100 ${!site.actif ? 'opacity-50' : ''}" onclick="showModalSite(${site.id})">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="drag-handle text-muted" onclick="event.stopPropagation()">
                <i class="bi bi-grip-vertical"></i>
              </span>
              <span class="site-badge" style="background-color: ${site.couleur}20; color: ${site.couleur}">
                <i class="bi bi-${site.icone || 'building'}"></i>
                ${site.type === 'mobile' ? 'Mobile' : 'Fixe'}
              </span>
            </div>
            ${!site.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
          </div>

          <h5 class="card-title">${escapeHtml(site.nom)}</h5>
          <p class="card-text small text-muted">${site.code}</p>

          ${site.type === 'fixe' && site.adresse ? `
            <p class="small mb-2">
              <i class="bi bi-geo-alt text-muted"></i>
              ${escapeHtml(site.ville || '')} ${site.code_postal || ''}
            </p>
          ` : ''}

          ${site.compteBancaire ? `
            <p class="small mb-2">
              <i class="bi bi-bank text-success"></i>
              ${escapeHtml(site.compteBancaire.libelle)}
            </p>
          ` : ''}

          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showModalHoraires(${site.id}, '${escapeHtml(site.nom)}', '${site.type}')">
              <i class="bi bi-clock"></i> Horaires
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteSite(${site.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Initialiser le drag & drop
  initSortable();
}

function initSortable() {
  const container = document.getElementById('liste-sites');
  if (sortableSites) sortableSites.destroy();

  sortableSites = new Sortable(container, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: async function(evt) {
      const ordres = [];
      container.querySelectorAll('[data-site-id]').forEach((el, index) => {
        ordres.push({ id: parseInt(el.dataset.siteId), ordre: index });
      });

      try {
        const token = getAuthToken();
        await fetch('/api/sites/reorder', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ordres })
        });
      } catch (error) {
        console.error('Erreur reorder:', error);
      }
    }
  });
}

function showModalSite(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalSite'));
  const form = document.getElementById('form-site');
  form.reset();

  document.getElementById('modalSiteTitle').textContent = id ? 'Modifier le site' : 'Nouveau site';
  document.getElementById('site_id').value = id || '';

  // Charger les comptes bancaires dans le select
  const selectCompte = document.getElementById('site_compte_bancaire');
  selectCompte.innerHTML = '<option value="">Aucun compte associe</option>' +
    comptes.filter(c => c.actif).map(c =>
      `<option value="${c.id}">${escapeHtml(c.libelle)}</option>`
    ).join('');

  if (id) {
    const site = sites.find(s => s.id === id);
    if (site) {
      document.getElementById('site_nom').value = site.nom;
      document.getElementById('site_code').value = site.code;
      document.getElementById('site_type').value = site.type;
      document.getElementById('site_pays').value = site.pays || 'FR';
      document.getElementById('site_description').value = site.description || '';
      document.getElementById('site_adresse').value = site.adresse || '';
      document.getElementById('site_code_postal').value = site.code_postal || '';
      document.getElementById('site_ville').value = site.ville || '';
      document.getElementById('site_telephone').value = site.telephone || '';
      document.getElementById('site_email').value = site.email || '';
      document.getElementById('site_compte_bancaire').value = site.compte_bancaire_id || '';
      document.getElementById('site_couleur').value = site.couleur || '#0d6efd';
      document.getElementById('site_icone').value = site.icone || 'building';
      document.getElementById('site_google_place_id').value = site.google_place_id || '';
      document.getElementById('site_actif').checked = site.actif;
    }
  }

  toggleSiteTypeFields();
  modal.show();
}

function toggleSiteTypeFields() {
  const type = document.getElementById('site_type').value;
  document.getElementById('site-adresse-section').style.display = type === 'fixe' ? 'block' : 'none';
}

async function handleSiteSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('site_id').value;
  const data = {
    nom: document.getElementById('site_nom').value,
    code: document.getElementById('site_code').value || undefined,
    type: document.getElementById('site_type').value,
    pays: document.getElementById('site_pays').value,
    description: document.getElementById('site_description').value,
    adresse: document.getElementById('site_adresse').value,
    code_postal: document.getElementById('site_code_postal').value,
    ville: document.getElementById('site_ville').value,
    telephone: document.getElementById('site_telephone').value,
    email: document.getElementById('site_email').value,
    compte_bancaire_id: document.getElementById('site_compte_bancaire').value || null,
    couleur: document.getElementById('site_couleur').value,
    icone: document.getElementById('site_icone').value,
    google_place_id: document.getElementById('site_google_place_id').value,
    actif: document.getElementById('site_actif').checked
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/sites/${id}` : '/api/sites';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erreur');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalSite')).hide();
    showToast(id ? 'Site modifie' : 'Site cree', 'success');
    await loadSites();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteSite(id) {
  const site = sites.find(s => s.id === id);
  const result = await Swal.fire({
    title: 'Desactiver ce site ?',
    text: `Le site "${site.nom}" sera desactive mais pas supprime.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Desactiver',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      const token = getAuthToken();
      await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Site desactive', 'success');
      await loadSites();
    } catch (error) {
      showToast('Erreur lors de la desactivation', 'error');
    }
  }
}

// ==================== HORAIRES ====================

let currentSiteCalendrier = null;

async function showModalHoraires(siteId, siteName, siteType) {
  const modal = new bootstrap.Modal(document.getElementById('modalHoraires'));
  document.getElementById('horaires_site_id').value = siteId;
  document.getElementById('horaires-site-nom').textContent = siteName;

  const isMobile = siteType === 'mobile';

  // Charger les parametres calendrier du site
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/calendrier/site/${siteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      currentSiteCalendrier = await response.json();
    } else {
      currentSiteCalendrier = { ouvert_jours_feries: false, ouvert_vacances: true, horaires_vacances_identiques: true };
    }
  } catch (error) {
    currentSiteCalendrier = { ouvert_jours_feries: false, ouvert_vacances: true, horaires_vacances_identiques: true };
  }

  // Remplir les checkboxes
  document.getElementById('site_ouvert_feries').checked = currentSiteCalendrier.ouvert_jours_feries;
  document.getElementById('site_ouvert_vacances').checked = currentSiteCalendrier.ouvert_vacances;

  if (currentSiteCalendrier.horaires_vacances_identiques) {
    document.getElementById('horaires_vacances_identiques').checked = true;
  } else {
    document.getElementById('horaires_vacances_specifiques').checked = true;
  }

  // Afficher/masquer config horaires vacances selon si ouvert
  toggleHorairesVacancesConfig();

  // Event listeners pour les radios
  document.getElementById('site_ouvert_vacances').addEventListener('change', toggleHorairesVacancesConfig);
  document.getElementById('horaires_vacances_identiques').addEventListener('change', updateHorairesVacancesDisplay);
  document.getElementById('horaires_vacances_specifiques').addEventListener('change', updateHorairesVacancesDisplay);

  // Charger les horaires existants
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/sites/${siteId}/horaires`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const horaires = await response.json();

    // Separer horaires normaux et vacances
    const horairesNormaux = horaires.filter(h => !h.periode || h.periode === 'normale');
    const horairesVacances = horaires.filter(h => h.periode === 'vacances');

    renderHorairesForm(horairesNormaux, 'normale', isMobile);
    renderHorairesForm(horairesVacances, 'vacances', isMobile);

    updateBadgeHorairesVacances(horairesVacances.length);
  } catch (error) {
    console.error('Erreur chargement horaires:', error);
    renderHorairesForm([], 'normale', isMobile);
    renderHorairesForm([], 'vacances', isMobile);
  }

  updateHorairesVacancesDisplay();
  modal.show();
}

function toggleHorairesVacancesConfig() {
  const ouvert = document.getElementById('site_ouvert_vacances').checked;
  document.getElementById('config-horaires-vacances').style.display = ouvert ? 'block' : 'none';

  if (!ouvert) {
    // Masquer l'onglet vacances si ferme
    document.getElementById('tab-horaires-vacances').classList.add('disabled');
    document.getElementById('alert-horaires-vacances-disabled').innerHTML = `
      <i class="bi bi-x-circle"></i>
      <strong>Ferme :</strong> Le site est ferme pendant les vacances scolaires.
    `;
  } else {
    document.getElementById('tab-horaires-vacances').classList.remove('disabled');
    updateHorairesVacancesDisplay();
  }
}

function updateHorairesVacancesDisplay() {
  const identiques = document.getElementById('horaires_vacances_identiques').checked;
  const ouvert = document.getElementById('site_ouvert_vacances').checked;

  if (!ouvert) {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'block';
    document.getElementById('alert-horaires-vacances-info').style.display = 'none';
    document.getElementById('btn-add-horaire-vacances').style.display = 'none';
    document.getElementById('horaires-vacances-container').style.opacity = '0.5';
  } else if (identiques) {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'block';
    document.getElementById('alert-horaires-vacances-disabled').innerHTML = `
      <i class="bi bi-exclamation-triangle"></i>
      <strong>Desactive :</strong> Les horaires vacances ne sont pas utilises car "Memes horaires que la periode normale" est selectionne.
    `;
    document.getElementById('alert-horaires-vacances-info').style.display = 'none';
    document.getElementById('btn-add-horaire-vacances').style.display = 'none';
    document.getElementById('horaires-vacances-container').style.opacity = '0.5';
  } else {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'none';
    document.getElementById('alert-horaires-vacances-info').style.display = 'block';
    document.getElementById('btn-add-horaire-vacances').style.display = 'inline-block';
    document.getElementById('horaires-vacances-container').style.opacity = '1';
  }
}

function updateBadgeHorairesVacances(count) {
  const badge = document.getElementById('badge-horaires-vacances');
  badge.textContent = count > 0 ? count : '-';
  badge.className = count > 0 ? 'badge bg-warning ms-1' : 'badge bg-secondary ms-1';
}

function renderHorairesForm(horaires, periode = 'normale', isMobile = false) {
  const containerId = periode === 'vacances' ? 'horaires-vacances-container' : 'horaires-normaux-container';
  const tbodyId = periode === 'vacances' ? 'horaires-vacances-tbody' : 'horaires-normaux-tbody';
  const container = document.getElementById(containerId);

  if (!container) return;

  if (horaires.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        Aucun horaire defini. Cliquez sur "Ajouter un creneau" pour commencer.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Jour</th>
          <th>Debut</th>
          <th>Fin</th>
          <th>Recurrence</th>
          ${isMobile ? '<th>Lieu</th>' : ''}
          <th></th>
        </tr>
      </thead>
      <tbody id="${tbodyId}">
        ${horaires.map((h, i) => renderHoraireRow(h, i, isMobile, periode)).join('')}
      </tbody>
    </table>
  `;
}

function renderHoraireRow(horaire = {}, index = 0, isMobile = false, periode = 'normale') {
  const rowClass = periode === 'vacances' ? 'table-warning' : '';
  return `
    <tr data-index="${index}" data-periode="${periode}" class="${rowClass}">
      <td>
        <select class="form-select form-select-sm horaire-jour" style="width: 130px">
          ${JOURS.map((j, i) => `<option value="${i}" ${horaire.jour_semaine === i ? 'selected' : ''}>${j}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="time" class="form-control form-control-sm horaire-debut" value="${horaire.heure_debut ? horaire.heure_debut.substring(0, 5) : '09:00'}" style="width: 100px">
      </td>
      <td>
        <input type="time" class="form-control form-control-sm horaire-fin" value="${horaire.heure_fin ? horaire.heure_fin.substring(0, 5) : '17:00'}" style="width: 100px">
      </td>
      <td>
        <select class="form-select form-select-sm horaire-recurrence" style="width: 140px">
          <option value="toutes" ${horaire.recurrence === 'toutes' ? 'selected' : ''}>Toutes</option>
          <option value="paires" ${horaire.recurrence === 'paires' ? 'selected' : ''}>Sem. paires</option>
          <option value="impaires" ${horaire.recurrence === 'impaires' ? 'selected' : ''}>Sem. impaires</option>
        </select>
      </td>
      ${isMobile ? `
        <td>
          <input type="text" class="form-control form-control-sm horaire-lieu" placeholder="Lieu" value="${escapeHtml(horaire.lieu_specifique || '')}" style="width: 150px">
        </td>
      ` : ''}
      <td>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeHoraireRow(this, '${periode}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function addHoraireRow(periode = 'normale') {
  const containerId = periode === 'vacances' ? 'horaires-vacances-container' : 'horaires-normaux-container';
  const tbodyId = periode === 'vacances' ? 'horaires-vacances-tbody' : 'horaires-normaux-tbody';
  const container = document.getElementById(containerId);
  let tbody = document.getElementById(tbodyId);

  const siteId = document.getElementById('horaires_site_id').value;
  const site = sites.find(s => s.id == siteId);
  const isMobile = site && site.type === 'mobile';

  // Si pas de tableau, le creer
  if (!tbody) {
    container.innerHTML = `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Jour</th>
            <th>Debut</th>
            <th>Fin</th>
            <th>Recurrence</th>
            ${isMobile ? '<th>Lieu</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody id="${tbodyId}"></tbody>
      </table>
    `;
    tbody = document.getElementById(tbodyId);
  }

  const index = tbody.children.length;
  tbody.insertAdjacentHTML('beforeend', renderHoraireRow({}, index, isMobile, periode));

  if (periode === 'vacances') {
    updateBadgeHorairesVacances(tbody.children.length);
  }
}

function removeHoraireRow(btn, periode = 'normale') {
  btn.closest('tr').remove();

  if (periode === 'vacances') {
    const tbody = document.getElementById('horaires-vacances-tbody');
    updateBadgeHorairesVacances(tbody ? tbody.children.length : 0);
  }
}

async function saveHoraires() {
  const siteId = document.getElementById('horaires_site_id').value;

  // Collecter horaires normaux
  const tbodyNormaux = document.getElementById('horaires-normaux-tbody');
  const horairesNormaux = [];
  if (tbodyNormaux) {
    tbodyNormaux.querySelectorAll('tr').forEach(row => {
      horairesNormaux.push({
        jour_semaine: parseInt(row.querySelector('.horaire-jour').value),
        heure_debut: row.querySelector('.horaire-debut').value,
        heure_fin: row.querySelector('.horaire-fin').value,
        recurrence: row.querySelector('.horaire-recurrence').value,
        lieu_specifique: row.querySelector('.horaire-lieu')?.value || null,
        periode: 'normale'
      });
    });
  }

  // Collecter horaires vacances
  const tbodyVacances = document.getElementById('horaires-vacances-tbody');
  const horairesVacances = [];
  if (tbodyVacances) {
    tbodyVacances.querySelectorAll('tr').forEach(row => {
      horairesVacances.push({
        jour_semaine: parseInt(row.querySelector('.horaire-jour').value),
        heure_debut: row.querySelector('.horaire-debut').value,
        heure_fin: row.querySelector('.horaire-fin').value,
        recurrence: row.querySelector('.horaire-recurrence').value,
        lieu_specifique: row.querySelector('.horaire-lieu')?.value || null,
        periode: 'vacances'
      });
    });
  }

  const allHoraires = [...horairesNormaux, ...horairesVacances];

  // Sauvegarder les parametres calendrier du site
  const calendrierData = {
    site_id: parseInt(siteId),
    ouvert_jours_feries: document.getElementById('site_ouvert_feries').checked,
    ouvert_vacances: document.getElementById('site_ouvert_vacances').checked,
    horaires_vacances_identiques: document.getElementById('horaires_vacances_identiques').checked
  };

  await saveHorairesToServer(siteId, allHoraires, calendrierData);
}

async function saveHorairesToServer(siteId, horaires, calendrierData) {
  try {
    const token = getAuthToken();

    // Sauvegarder les horaires
    await fetch(`/api/sites/${siteId}/horaires`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horaires })
    });

    // Sauvegarder les parametres calendrier
    await fetch(`/api/calendrier/site/${siteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendrierData)
    });

    bootstrap.Modal.getInstance(document.getElementById('modalHoraires')).hide();
    showToast('Horaires et parametres enregistres', 'success');
  } catch (error) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

// ==================== COMPTES BANCAIRES ====================

async function loadComptes() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/comptes-bancaires', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    comptes = Array.isArray(data) ? data : [];
    renderComptes();
    document.getElementById('count-comptes').textContent = comptes.length;
  } catch (error) {
    console.error('Erreur chargement comptes:', error);
    comptes = [];
    renderComptes();
  }
}

function renderComptes() {
  const container = document.getElementById('liste-comptes');

  if (comptes.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-bank display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucun compte bancaire</p>
        <button class="btn btn-primary" onclick="showModalCompte()">
          <i class="bi bi-plus-lg"></i> Ajouter un compte
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = comptes.map(compte => `
    <div class="col-md-6">
      <div class="card compte-card h-100 ${compte.par_defaut ? 'par-defaut border-success' : ''} ${!compte.actif ? 'opacity-50' : ''}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title">
                ${compte.par_defaut ? '<i class="bi bi-star-fill text-warning me-1"></i>' : ''}
                ${escapeHtml(compte.libelle)}
              </h5>
              ${compte.titulaire ? `<p class="text-muted small mb-1">${escapeHtml(compte.titulaire)}</p>` : ''}
              ${compte.banque ? `<p class="text-muted small mb-2">${escapeHtml(compte.banque)}</p>` : ''}
            </div>
            ${!compte.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
          </div>

          ${compte.iban ? `
            <div class="mt-3 p-2 bg-light rounded">
              <small class="text-muted d-block">IBAN</small>
              <span class="iban-display">${formatIban(compte.iban)}</span>
            </div>
          ` : ''}

          ${compte.bic ? `
            <div class="mt-2">
              <small class="text-muted">BIC: </small>
              <span class="font-monospace">${compte.bic}</span>
            </div>
          ` : ''}

          ${compte.sites && compte.sites.length > 0 ? `
            <div class="mt-3">
              <small class="text-muted d-block mb-1">Sites associes:</small>
              ${compte.sites.map(s => `<span class="badge bg-primary me-1">${escapeHtml(s.nom)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="showModalCompte(${compte.id})">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            ${!compte.par_defaut && compte.actif ? `
              <button class="btn btn-sm btn-outline-success" onclick="setCompteDefaut(${compte.id})">
                <i class="bi bi-star"></i> Defaut
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCompte(${compte.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function formatIban(iban) {
  if (!iban) return '';
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function showModalCompte(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalCompte'));
  const form = document.getElementById('form-compte');
  form.reset();

  document.getElementById('modalCompteTitle').textContent = id ? 'Modifier le compte' : 'Nouveau compte';
  document.getElementById('compte_id').value = id || '';

  if (id) {
    const compte = comptes.find(c => c.id === id);
    if (compte) {
      document.getElementById('compte_libelle').value = compte.libelle;
      document.getElementById('compte_titulaire').value = compte.titulaire || '';
      document.getElementById('compte_banque').value = compte.banque || '';
      document.getElementById('compte_iban').value = compte.iban || '';
      document.getElementById('compte_bic').value = compte.bic || '';
      document.getElementById('compte_par_defaut').checked = compte.par_defaut;
      document.getElementById('compte_actif').checked = compte.actif;
    }
  }

  modal.show();
}

async function handleCompteSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('compte_id').value;
  const data = {
    libelle: document.getElementById('compte_libelle').value,
    titulaire: document.getElementById('compte_titulaire').value,
    banque: document.getElementById('compte_banque').value,
    iban: document.getElementById('compte_iban').value,
    bic: document.getElementById('compte_bic').value,
    par_defaut: document.getElementById('compte_par_defaut').checked,
    actif: document.getElementById('compte_actif').checked
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/comptes-bancaires/${id}` : '/api/comptes-bancaires';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erreur');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalCompte')).hide();
    showToast(id ? 'Compte modifie' : 'Compte cree', 'success');
    await loadComptes();
    await loadSites(); // Recharger pour mettre a jour les associations
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function setCompteDefaut(id) {
  try {
    const token = getAuthToken();
    await fetch(`/api/comptes-bancaires/${id}/default`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast('Compte defini par defaut', 'success');
    await loadComptes();
  } catch (error) {
    showToast('Erreur', 'error');
  }
}

async function deleteCompte(id) {
  const compte = comptes.find(c => c.id === id);
  const result = await Swal.fire({
    title: 'Desactiver ce compte ?',
    text: `Le compte "${compte.libelle}" sera desactive.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Desactiver',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/comptes-bancaires/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      showToast('Compte desactive', 'success');
      await loadComptes();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

// ==================== CALENDRIER & FERMETURES ====================

async function loadParametresCalendrier() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/calendrier/parametres', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const params = await response.json();

    document.getElementById('cal_pays').value = params.pays || 'FR';
    document.getElementById('cal_zone').value = params.zone_vacances || 'B';
    document.getElementById('cal_ouvert_feries').checked = params.ouvert_jours_feries;
    document.getElementById('cal_ouvert_vacances').checked = params.ouvert_vacances;

    // Toggle zone selon pays
    const pays = params.pays || 'FR';
    document.getElementById('zone-vacances-container').style.display = pays === 'FR' ? 'block' : 'none';
    document.getElementById('import-vacances-section').style.display = pays === 'FR' ? 'block' : 'none';
  } catch (error) {
    console.error('Erreur chargement parametres calendrier:', error);
  }
}

async function handleCalendrierSubmit(e) {
  e.preventDefault();

  const data = {
    pays: document.getElementById('cal_pays').value,
    zone_vacances: document.getElementById('cal_zone').value,
    ouvert_jours_feries: document.getElementById('cal_ouvert_feries').checked,
    ouvert_vacances: document.getElementById('cal_ouvert_vacances').checked
  };

  try {
    const token = getAuthToken();
    await fetch('/api/calendrier/parametres', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    showToast('Parametres enregistres', 'success');
  } catch (error) {
    showToast('Erreur', 'error');
  }
}

async function loadFermetures() {
  try {
    const token = getAuthToken();
    const annee = document.getElementById('filter-fermetures-annee')?.value || new Date().getFullYear();
    const type = document.getElementById('filter-fermetures-type')?.value || '';

    let url = `/api/calendrier/fermetures?annee=${annee}`;
    if (type) url += `&type=${type}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    fermetures = Array.isArray(data) ? data : [];
    renderFermetures();
  } catch (error) {
    console.error('Erreur chargement fermetures:', error);
    fermetures = [];
    renderFermetures();
  }
}

function renderFermetures() {
  const container = document.getElementById('liste-fermetures');

  if (fermetures.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-calendar-check"></i> Aucune fermeture pour cette periode
      </div>
    `;
    return;
  }

  const typeBadges = {
    'ferie': 'bg-danger',
    'vacances': 'bg-warning text-dark',
    'ponctuel': 'bg-info',
    'autre': 'bg-secondary'
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Motif</th>
            <th>Site</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${fermetures.map(f => `
            <tr>
              <td>
                <span class="badge ${typeBadges[f.type] || 'bg-secondary'}">
                  ${f.type}
                  ${f.recurrent_annuel ? ' <i class="bi bi-arrow-repeat"></i>' : ''}
                </span>
              </td>
              <td>
                ${formatDate(f.date_debut)}
                ${f.date_fin !== f.date_debut ? ` - ${formatDate(f.date_fin)}` : ''}
              </td>
              <td>${escapeHtml(f.motif || '-')}</td>
              <td>${f.site_id ? (sites.find(s => s.id === f.site_id)?.nom || 'Site #' + f.site_id) : '<em>Tous</em>'}</td>
              <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFermeture(${f.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function populateSiteSelects() {
  const select = document.getElementById('fermeture_site');
  if (select) {
    select.innerHTML = '<option value="">Tous les sites</option>' +
      sites.filter(s => s.actif).map(s =>
        `<option value="${s.id}">${escapeHtml(s.nom)}</option>`
      ).join('');
  }
}

function showModalFermeture() {
  const modal = new bootstrap.Modal(document.getElementById('modalFermeture'));
  document.getElementById('form-fermeture').reset();

  // Date par defaut = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fermeture_date_debut').value = today;
  document.getElementById('fermeture_date_fin').value = today;

  modal.show();
}

async function handleFermetureSubmit(e) {
  e.preventDefault();

  const data = {
    site_id: document.getElementById('fermeture_site').value || null,
    date_debut: document.getElementById('fermeture_date_debut').value,
    date_fin: document.getElementById('fermeture_date_fin').value,
    motif: document.getElementById('fermeture_motif').value,
    type: document.getElementById('fermeture_type').value,
    recurrent_annuel: document.getElementById('fermeture_recurrent').checked
  };

  try {
    const token = getAuthToken();
    await fetch('/api/calendrier/fermetures', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    bootstrap.Modal.getInstance(document.getElementById('modalFermeture')).hide();
    showToast('Fermeture ajoutee', 'success');
    await loadFermetures();
  } catch (error) {
    showToast('Erreur', 'error');
  }
}

async function deleteFermeture(id) {
  const result = await Swal.fire({
    title: 'Supprimer cette fermeture ?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      const token = getAuthToken();
      await fetch(`/api/calendrier/fermetures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Fermeture supprimee', 'success');
      await loadFermetures();
    } catch (error) {
      showToast('Erreur', 'error');
    }
  }
}

async function importerJoursFeries() {
  const annee = document.getElementById('import_feries_annee').value;
  const pays = document.getElementById('cal_pays').value;

  try {
    const token = getAuthToken();
    const response = await fetch('/api/calendrier/jours-feries/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pays, annee })
    });

    const result = await response.json();
    if (result.success) {
      showToast(result.message, 'success');
      await loadFermetures();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Erreur lors de l\'import', 'error');
  }
}

async function importerVacances() {
  const annee_scolaire = document.getElementById('import_vacances_annee').value;
  const zone = document.getElementById('cal_zone').value;

  try {
    const token = getAuthToken();
    const response = await fetch('/api/calendrier/vacances/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ zone, annee_scolaire })
    });

    const result = await response.json();
    if (result.success) {
      showToast(result.message, 'success');
      await loadFermetures();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Erreur lors de l\'import', 'error');
  }
}

// ==================== UTILITAIRES ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });

  Toast.fire({
    icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
    title: message
  });
}
