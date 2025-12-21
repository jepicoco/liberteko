/**
 * Gestion des Communautes de Communes
 */

let communautesCache = [];
let communesCache = [];
let selectedCommunes = []; // Communes selectionnees pour le formulaire

// ============================================================
// Initialisation
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[CommunautesCommunes] Initialisation...');

  // Initialiser le template admin (navbar + sidebar)
  if (typeof initTemplate === 'function') {
    await initTemplate('parametres');
  }

  await Promise.all([
    chargerCommunautes(),
    chargerCommunes()
  ]);
});

// ============================================================
// Chargement des donnees
// ============================================================

async function chargerCommunautes() {
  try {
    const response = await apiAdmin.get('/communautes-communes');
    communautesCache = response?.data || response || [];
    if (!Array.isArray(communautesCache)) communautesCache = [];
    afficherCommunautes();
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur chargement:', error);
    document.getElementById('cc-list').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Erreur lors du chargement des communautes
      </div>
    `;
  }
}

async function chargerCommunes() {
  try {
    const response = await apiAdmin.get('/communes?limit=1000');
    communesCache = response?.communes || response?.data || response || [];
    if (!Array.isArray(communesCache)) communesCache = [];
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur chargement communes:', error);
    communesCache = [];
  }
}

// ============================================================
// Affichage
// ============================================================

function afficherCommunautes() {
  const container = document.getElementById('cc-list');

  if (!communautesCache || communautesCache.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-geo-alt-fill text-muted" style="font-size: 3rem;"></i>
        <h5 class="mt-3">Aucune communaute configuree</h5>
        <p class="text-muted">Les communautes de communes permettent de regrouper des communes<br>pour appliquer des reductions tarifaires.</p>
        <button class="btn btn-primary" onclick="ouvrirModalCC()">
          <i class="bi bi-plus"></i> Creer une communaute
        </button>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';

  communautesCache.forEach(cc => {
    const isActive = cc.actif !== false;
    const communes = cc.communes || [];
    const typeLabels = {
      'CC': 'Communaute de Communes',
      'CA': 'Communaute d\'Agglomeration',
      'CU': 'Communaute Urbaine',
      'ME': 'Metropole'
    };

    html += `
      <div class="col-md-6 col-lg-4">
        <div class="cc-card ${isActive ? '' : 'inactive'}">
          <div class="cc-header d-flex justify-content-between align-items-start">
            <div>
              <h5 class="mb-1">${escapeHtml(cc.nom)}</h5>
              <small class="text-muted">${cc.code}</small>
            </div>
            <span class="badge type-badge bg-${cc.type_epci === 'ME' ? 'primary' : cc.type_epci === 'CU' ? 'info' : cc.type_epci === 'CA' ? 'success' : 'secondary'}">
              ${cc.type_epci || 'CC'}
            </span>
          </div>
          <div class="cc-body">
            ${cc.departement ? `<p class="mb-2"><i class="bi bi-geo"></i> Departement ${cc.departement}</p>` : ''}
            ${cc.description ? `<p class="text-muted small mb-2">${escapeHtml(cc.description)}</p>` : ''}

            <div class="mb-3">
              <strong>${communes.length} commune${communes.length > 1 ? 's' : ''}</strong>
              ${communes.length > 0 ? `
                <div class="mt-1">
                  ${communes.slice(0, 5).map(c => `
                    <span class="commune-badge">${escapeHtml(c.nom)}</span>
                  `).join('')}
                  ${communes.length > 5 ? `<span class="commune-badge bg-primary text-white">+${communes.length - 5}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="ouvrirModalCC(${cc.id})">
                <i class="bi bi-pencil"></i> Modifier
              </button>
              ${isActive ? `
                <button class="btn btn-sm btn-outline-warning" onclick="toggleCC(${cc.id})">
                  <i class="bi bi-eye-slash"></i> Desactiver
                </button>
              ` : `
                <button class="btn btn-sm btn-outline-success" onclick="toggleCC(${cc.id})">
                  <i class="bi bi-eye"></i> Activer
                </button>
              `}
              <button class="btn btn-sm btn-outline-danger" onclick="supprimerCC(${cc.id})">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// Modal
// ============================================================

function ouvrirModalCC(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalCC'));
  const form = document.getElementById('formCC');
  form.reset();

  selectedCommunes = [];
  document.getElementById('cc_search_results').style.display = 'none';

  if (id) {
    const cc = communautesCache.find(c => c.id === id);
    if (!cc) {
      showToast('Communaute non trouvee', 'error');
      return;
    }

    document.getElementById('modalCCTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier la communaute';
    document.getElementById('cc_id').value = cc.id;
    document.getElementById('cc_code').value = cc.code || '';
    document.getElementById('cc_nom').value = cc.nom || '';
    document.getElementById('cc_type').value = cc.type_epci || 'CC';
    document.getElementById('cc_departement').value = cc.departement || '';
    document.getElementById('cc_siren').value = cc.code_siren || '';
    document.getElementById('cc_description').value = cc.description || '';

    // Charger les communes
    selectedCommunes = (cc.communes || []).map(c => ({
      id: c.id,
      nom: c.nom,
      code_postal: c.code_postal
    }));
    afficherCommunesSelectionnees();
  } else {
    document.getElementById('modalCCTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Nouvelle communaute';
    document.getElementById('cc_id').value = '';
    afficherCommunesSelectionnees();
  }

  modal.show();
}

// ============================================================
// Recherche et selection de communes
// ============================================================

async function rechercherCommunes() {
  const query = document.getElementById('cc_search_commune').value.trim();
  if (query.length < 2) {
    showToast('Entrez au moins 2 caracteres', 'warning');
    return;
  }

  const container = document.getElementById('cc_search_results');

  try {
    const response = await apiAdmin.get(`/communes?q=${encodeURIComponent(query)}&limit=20`);
    const communes = response?.communes || response?.data || response || [];

    if (communes.length === 0) {
      container.innerHTML = '<div class="list-group-item text-muted">Aucune commune trouvee</div>';
      container.style.display = 'block';
      return;
    }

    let html = '';
    communes.forEach(c => {
      const alreadySelected = selectedCommunes.some(sc => sc.id === c.id);
      html += `
        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${alreadySelected ? 'disabled' : ''}"
                onclick="ajouterCommune(${c.id}, '${escapeHtml(c.nom)}', '${c.code_postal || ''}')">
          <span>${escapeHtml(c.nom)} <small class="text-muted">(${c.code_postal || 'N/A'})</small></span>
          ${alreadySelected ? '<span class="badge bg-success">Ajoute</span>' : '<i class="bi bi-plus-circle text-primary"></i>'}
        </button>
      `;
    });

    container.innerHTML = html;
    container.style.display = 'block';
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur recherche:', error);
    container.innerHTML = '<div class="list-group-item text-danger">Erreur de recherche</div>';
    container.style.display = 'block';
  }
}

function ajouterCommune(id, nom, codePostal) {
  if (selectedCommunes.some(c => c.id === id)) {
    return;
  }

  selectedCommunes.push({ id, nom, code_postal: codePostal });
  afficherCommunesSelectionnees();

  // Mettre a jour les resultats de recherche
  rechercherCommunes();
}

function retirerCommune(id) {
  selectedCommunes = selectedCommunes.filter(c => c.id !== id);
  afficherCommunesSelectionnees();
}

function afficherCommunesSelectionnees() {
  const container = document.getElementById('cc_communes_list');

  if (selectedCommunes.length === 0) {
    container.innerHTML = '<p class="text-muted">Aucune commune selectionnee</p>';
    return;
  }

  let html = '<div class="d-flex flex-wrap">';
  selectedCommunes.forEach(c => {
    html += `
      <span class="commune-badge">
        ${escapeHtml(c.nom)} (${c.code_postal || 'N/A'})
        <button type="button" class="btn btn-sm btn-danger btn-remove" onclick="retirerCommune(${c.id})">
          <i class="bi bi-x"></i>
        </button>
      </span>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// CRUD
// ============================================================

async function sauvegarderCC() {
  const id = document.getElementById('cc_id').value;

  const data = {
    code: document.getElementById('cc_code').value.trim().toUpperCase(),
    nom: document.getElementById('cc_nom').value.trim(),
    type_epci: document.getElementById('cc_type').value,
    departement: document.getElementById('cc_departement').value.trim() || null,
    code_siren: document.getElementById('cc_siren').value.trim() || null,
    description: document.getElementById('cc_description').value.trim() || null,
    communes: selectedCommunes.map(c => c.id)
  };

  if (!data.code || !data.nom) {
    showToast('Code et nom obligatoires', 'error');
    return;
  }

  try {
    if (id) {
      await apiAdmin.put(`/communautes-communes/${id}`, data);
      showToast('Communaute modifiee', 'success');
    } else {
      await apiAdmin.post('/communautes-communes', data);
      showToast('Communaute creee', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalCC')).hide();
    await chargerCommunautes();
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur sauvegarde:', error);
    showToast('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
  }
}

async function toggleCC(id) {
  const cc = communautesCache.find(c => c.id === id);
  if (!cc) return;

  try {
    await apiAdmin.put(`/communautes-communes/${id}`, {
      actif: !cc.actif
    });
    showToast('Statut mis a jour', 'success');
    await chargerCommunautes();
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur:', error);
    showToast('Erreur', 'error');
  }
}

async function supprimerCC(id) {
  const cc = communautesCache.find(c => c.id === id);
  if (!cc) return;

  const result = await Swal.fire({
    title: 'Supprimer cette communaute ?',
    text: cc.nom,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiAdmin.delete(`/communautes-communes/${id}`);
    showToast('Communaute supprimee', 'success');
    await chargerCommunautes();
  } catch (error) {
    console.error('[CommunautesCommunes] Erreur:', error);
    showToast('Erreur', 'error');
  }
}

// ============================================================
// Utilitaires
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }
}

// Ecouter la touche Entree pour la recherche
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('cc_search_commune');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        rechercherCommunes();
      }
    });
  }
});

// Exports globaux
window.ouvrirModalCC = ouvrirModalCC;
window.rechercherCommunes = rechercherCommunes;
window.ajouterCommune = ajouterCommune;
window.retirerCommune = retirerCommune;
window.sauvegarderCC = sauvegarderCC;
window.toggleCC = toggleCC;
window.supprimerCC = supprimerCC;
