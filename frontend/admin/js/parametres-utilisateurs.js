/**
 * parametres-utilisateurs.js
 * Gestion des utilisateurs avec support multi-structures
 */

// === State ===
let users = [];
let structures = []; // Structures accessibles par l'utilisateur connecte
let currentUserId = null;
let currentUserRole = null;
let selectedPromoteAdherent = null;
let resetPasswordUserId = null;
let editingUserId = null;

// Modals Bootstrap
let modalRole, modalPromote, modalResetPassword, modalAccesStructures;

// Constantes
const ROLE_LABELS = {
  'usager': 'Usager',
  'benevole': 'Benevole',
  'agent': 'Agent',
  'gestionnaire': 'Gestionnaire',
  'comptable': 'Comptable',
  'administrateur': 'Administrateur'
};

const ROLE_DESCRIPTIONS = {
  'usager': 'Espace membre uniquement',
  'benevole': 'Operations de base',
  'agent': 'Operations et prets',
  'gestionnaire': 'Gestion quotidienne',
  'comptable': 'Finances et statistiques',
  'administrateur': 'Acces complet'
};

const ROLE_COLORS = {
  'administrateur': 'danger',
  'comptable': 'warning',
  'gestionnaire': 'primary',
  'agent': 'info',
  'benevole': 'success',
  'usager': 'secondary'
};

// ROLE_HIERARCHY est defini dans admin-template.js

// === Initialisation ===
async function initPage() {
  // Initialiser les modals
  modalRole = new bootstrap.Modal(document.getElementById('modalRole'));
  modalPromote = new bootstrap.Modal(document.getElementById('modalPromote'));
  modalResetPassword = new bootstrap.Modal(document.getElementById('modalResetPassword'));
  modalAccesStructures = new bootstrap.Modal(document.getElementById('modalAccesStructures'));

  // Charger le profil utilisateur courant
  await loadCurrentUser();

  // Charger les structures accessibles
  await loadStructures();

  // Charger les utilisateurs
  await loadUsers();

  // Event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Filtres
  document.getElementById('filter-role').addEventListener('change', renderUsers);
  document.getElementById('filter-structure').addEventListener('change', renderUsers);
  document.getElementById('search-user').addEventListener('input', renderUsers);

  // Warning quand on change le role
  document.getElementById('modal-new-role').addEventListener('change', updateModalWarning);

  // Recherche pour promotion
  let searchTimeout;
  document.getElementById('promote-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchAdherents(e.target.value), 300);
  });
}

// === Chargement des donnees ===

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (response.ok) {
      const data = await response.json();
      currentUserRole = data.user?.role || 'usager';
    }
  } catch (error) {
    console.error('Erreur chargement profil:', error);
    currentUserRole = 'usager';
  }
}

async function loadStructures() {
  try {
    const response = await fetch('/api/parametres/mes-structures', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (response.ok) {
      structures = await response.json();
      renderStructureFilter();
    }
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    structures = [];
  }
}

async function loadUsers() {
  try {
    const structureFilter = document.getElementById('filter-structure')?.value;
    let url = '/api/parametres/utilisateurs';
    if (structureFilter) {
      url += `?structure_id=${structureFilter}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) throw new Error('Erreur chargement');

    users = await response.json();
    updateStats();
    renderUsers();
  } catch (error) {
    console.error('Erreur:', error);
    document.getElementById('users-list').innerHTML = `
      <tr><td colspan="6" class="text-center py-4">
        <div class="alert alert-danger mb-0">Erreur lors du chargement des utilisateurs</div>
      </td></tr>
    `;
  }
}

// === Rendu ===

function renderStructureFilter() {
  const select = document.getElementById('filter-structure');
  if (!select) return;

  select.innerHTML = '<option value="">Toutes les structures</option>';
  structures.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.innerHTML = `${s.icone ? `<i class="bi ${s.icone}"></i> ` : ''}${s.nom}`;
    option.textContent = s.nom;
    select.appendChild(option);
  });
}

function updateStats() {
  // Compter uniquement les utilisateurs avec un role administratif
  const adminUsers = users.filter(u => u.role && u.role !== 'usager');

  document.getElementById('stat-total').textContent = adminUsers.length;
  document.getElementById('stat-administrateur').textContent = users.filter(u => u.role === 'administrateur').length;
  document.getElementById('stat-comptable').textContent = users.filter(u => u.role === 'comptable').length;
  document.getElementById('stat-gestionnaire').textContent = users.filter(u => u.role === 'gestionnaire').length;
  document.getElementById('stat-benevole').textContent = users.filter(u => u.role === 'benevole').length;

  // Stats par structure
  renderStructureStats();
}

function renderStructureStats() {
  const container = document.getElementById('structure-stats');
  if (!container || structures.length === 0) return;

  container.innerHTML = structures.map(s => {
    const count = users.filter(u =>
      u.structures && u.structures.some(us => us.structure_id === s.id)
    ).length;
    return `
      <span class="badge me-1" style="background-color: ${s.couleur || '#6c757d'}">
        ${s.nom}: ${count}
      </span>
    `;
  }).join('');
}

function renderUsers() {
  const container = document.getElementById('users-list');
  const filterRole = document.getElementById('filter-role').value;
  const filterStructure = document.getElementById('filter-structure').value;
  const searchTerm = document.getElementById('search-user').value.toLowerCase();

  // Filtrer les utilisateurs
  let filteredUsers = users.filter(u => u.role && u.role !== 'usager');

  if (filterRole) {
    filteredUsers = filteredUsers.filter(u => u.role === filterRole);
  }

  if (filterStructure) {
    filteredUsers = filteredUsers.filter(u =>
      u.role === 'administrateur' || // Admin global voit tout
      (u.structures && u.structures.some(s => s.structure_id === parseInt(filterStructure)))
    );
  }

  if (searchTerm) {
    filteredUsers = filteredUsers.filter(u =>
      (u.nom && u.nom.toLowerCase().includes(searchTerm)) ||
      (u.prenom && u.prenom.toLowerCase().includes(searchTerm)) ||
      (u.email && u.email.toLowerCase().includes(searchTerm))
    );
  }

  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <tr><td colspan="6" class="text-center py-5 text-muted">
        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
        <p class="mt-2 mb-0">Aucun utilisateur trouve</p>
      </td></tr>
    `;
    return;
  }

  container.innerHTML = filteredUsers.map(user => {
    const initials = getInitials(user);
    const roleClass = `role-${user.role}`;
    const statutBadge = user.statut === 'actif'
      ? '<span class="badge bg-success">Actif</span>'
      : user.statut === 'suspendu'
        ? '<span class="badge bg-warning">Suspendu</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

    const canModify = canModifyUser(user);
    const canResetPwd = canResetPassword(user);
    const structuresHtml = renderUserStructures(user);

    return `
      <tr>
        <td>
          <div class="user-avatar">${initials}</div>
        </td>
        <td>
          <div class="fw-semibold">${user.prenom || ''} ${user.nom || ''}</div>
          <small class="text-muted">${user.telephone || ''}</small>
        </td>
        <td>${user.email}</td>
        <td>
          <span class="badge role-badge ${roleClass}">${ROLE_LABELS[user.role] || user.role}</span>
          ${user.role === 'administrateur' ? '<small class="text-muted d-block">Acces global</small>' : ''}
        </td>
        <td>
          ${structuresHtml}
        </td>
        <td class="text-end">
          <div class="btn-group">
            <a href="usagers.html?id=${user.id}" class="btn btn-sm btn-outline-secondary btn-action" title="Voir le profil">
              <i class="bi bi-eye"></i>
            </a>
            ${canModify ? `
              <button class="btn btn-sm btn-outline-info btn-action" onclick="openAccesStructuresModal(${user.id})" title="Gerer les acces structures">
                <i class="bi bi-building"></i>
              </button>
            ` : ''}
            ${canResetPwd ? `
              <button class="btn btn-sm btn-outline-warning btn-action" onclick="openResetPasswordModal(${user.id}, '${user.email}')" title="Reinitialiser le mot de passe">
                <i class="bi bi-key"></i>
              </button>
            ` : ''}
            ${canModify ? `
              <button class="btn btn-sm btn-outline-primary btn-action" onclick="openRoleModal(${user.id})" title="Modifier le role global">
                <i class="bi bi-pencil"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderUserStructures(user) {
  if (!user.structures || user.structures.length === 0) {
    if (user.role === 'administrateur') {
      return '<small class="text-muted"><i class="bi bi-infinity"></i> Toutes</small>';
    }
    return '<small class="text-muted">Aucune</small>';
  }

  return user.structures.map(s => {
    const isExpired = s.date_fin && new Date(s.date_fin) < new Date();
    const isInactive = !s.actif;
    const opacity = (isExpired || isInactive) ? 'opacity-50' : '';
    const roleLabel = s.role_structure
      ? ROLE_LABELS[s.role_structure] || s.role_structure
      : `<span class="text-muted" title="Role global">${ROLE_LABELS[user.role]}</span>`;

    let periodInfo = '';
    if (s.date_fin) {
      const dateFin = new Date(s.date_fin).toLocaleDateString('fr-FR');
      periodInfo = isExpired
        ? `<small class="text-danger"> (expire ${dateFin})</small>`
        : `<small class="text-muted"> (jusqu'au ${dateFin})</small>`;
    }

    return `
      <div class="structure-badge ${opacity}" style="border-left: 3px solid ${s.structure_couleur || '#6c757d'}; padding-left: 5px; margin-bottom: 2px;">
        <small>
          ${s.structure_icone ? `<i class="bi ${s.structure_icone}"></i>` : ''}
          ${s.structure_nom}: <strong>${roleLabel}</strong>
          ${periodInfo}
          ${isInactive ? '<span class="badge bg-secondary">Inactif</span>' : ''}
        </small>
      </div>
    `;
  }).join('');
}

// === Helpers ===

function getInitials(user) {
  const prenom = user.prenom || '';
  const nom = user.nom || '';
  if (prenom && nom) {
    return (prenom[0] + nom[0]).toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return '?';
}

function canModifyUser(user) {
  // Admin peut modifier tout le monde sauf lui-meme pour le role
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  return currentLevel >= ROLE_HIERARCHY['gestionnaire'];
}

function canResetPassword(user) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  // Admins peuvent reset tout le monde sauf les autres admins
  if (currentLevel >= ROLE_HIERARCHY['administrateur']) {
    return user.role !== 'administrateur';
  }
  return false;
}

// === Modal Role Global ===

function openRoleModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  currentUserId = userId;
  document.getElementById('modal-user-name').textContent = `${user.prenom || ''} ${user.nom || ''} (${user.email})`;

  // Generer les options de role
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const roleSelect = document.getElementById('modal-new-role');
  roleSelect.innerHTML = '';

  Object.entries(ROLE_HIERARCHY).forEach(([role, level]) => {
    if (level <= currentLevel) {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = `${ROLE_LABELS[role]} - ${ROLE_DESCRIPTIONS[role]}`;
      if (user.role === role) option.selected = true;
      roleSelect.appendChild(option);
    }
  });

  document.getElementById('modal-warning').style.display = 'none';
  modalRole.show();
}

function updateModalWarning() {
  const newRole = document.getElementById('modal-new-role').value;
  const user = users.find(u => u.id === currentUserId);
  const warning = document.getElementById('modal-warning');
  const warningText = document.getElementById('modal-warning-text');

  if (user && user.role === 'administrateur' && newRole !== 'administrateur') {
    const adminCount = users.filter(u => u.role === 'administrateur').length;
    if (adminCount <= 1) {
      warning.style.display = 'block';
      warning.className = 'alert alert-danger';
      warningText.textContent = 'Impossible: vous etes le dernier administrateur!';
      return;
    }
    warning.style.display = 'block';
    warning.className = 'alert alert-warning';
    warningText.textContent = 'Cet utilisateur perdra ses droits d\'administration globale.';
  } else if (newRole === 'administrateur') {
    warning.style.display = 'block';
    warning.className = 'alert alert-warning';
    warningText.textContent = 'Cet utilisateur aura un acces complet a toutes les structures.';
  } else if (newRole === 'usager' && user.role !== 'usager') {
    warning.style.display = 'block';
    warning.className = 'alert alert-warning';
    warningText.textContent = 'Cet utilisateur perdra tous ses droits d\'acces a l\'administration.';
  } else {
    warning.style.display = 'none';
  }
}

async function saveRole() {
  const newRole = document.getElementById('modal-new-role').value;
  const user = users.find(u => u.id === currentUserId);

  // Verification de securite
  if (user && user.role === 'administrateur' && newRole !== 'administrateur') {
    const adminCount = users.filter(u => u.role === 'administrateur').length;
    if (adminCount <= 1) {
      showToast('Impossible: vous etes le dernier administrateur', 'error');
      return;
    }
  }

  try {
    const response = await fetch(`/api/parametres/utilisateurs/${currentUserId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erreur');
    }

    modalRole.hide();
    showToast('Role global mis a jour', 'success');
    loadUsers();
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

// === Modal Acces Structures ===

async function openAccesStructuresModal(userId) {
  editingUserId = userId;
  const user = users.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('acces-user-name').textContent = `${user.prenom || ''} ${user.nom || ''}`;
  document.getElementById('acces-user-role').textContent = ROLE_LABELS[user.role] || user.role;

  // Charger les acces structure de l'utilisateur
  await loadEditingUserStructures(userId);

  modalAccesStructures.show();
}

async function loadEditingUserStructures(userId) {
  const container = document.getElementById('structures-list');
  container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>';

  try {
    const response = await fetch(`/api/parametres/utilisateurs/${userId}/structures`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) throw new Error('Erreur');

    const data = await response.json();
    renderUserStructuresModal(data);
  } catch (error) {
    console.error('Erreur:', error);
    container.innerHTML = '<div class="alert alert-danger">Erreur de chargement</div>';
  }
}

function renderUserStructuresModal(data) {
  const container = document.getElementById('structures-list');
  const user = data.utilisateur;
  const userStructures = data.structures;
  const availableStructures = data.structures_disponibles;

  if (userStructures.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="bi bi-building" style="font-size: 2rem;"></i>
        <p class="mb-0">Aucun acces structure defini</p>
        <small>Le role global (${ROLE_LABELS[user.role]}) s'applique</small>
      </div>
    `;
  } else {
    container.innerHTML = userStructures.map(s => `
      <div class="card mb-2 ${!s.actif ? 'opacity-50' : ''}" style="border-left: 4px solid ${s.structure_couleur || '#6c757d'}">
        <div class="card-body py-2 px-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>
                ${s.structure_icone ? `<i class="bi ${s.structure_icone}"></i>` : ''}
                ${s.structure_nom}
              </strong>
              <div class="small">
                Role:
                <select class="form-select form-select-sm d-inline-block w-auto"
                        onchange="updateStructureRole(${s.structure_id}, this.value)"
                        ${!s.can_edit ? 'disabled' : ''}>
                  <option value="" ${!s.role_structure ? 'selected' : ''}>-- Role global (${ROLE_LABELS[user.role]}) --</option>
                  ${Object.entries(ROLE_LABELS).map(([role, label]) =>
                    `<option value="${role}" ${s.role_structure === role ? 'selected' : ''}>${label}</option>`
                  ).join('')}
                </select>
              </div>
              ${s.date_debut || s.date_fin ? `
                <div class="small text-muted mt-1">
                  <i class="bi bi-calendar"></i>
                  ${s.date_debut ? new Date(s.date_debut).toLocaleDateString('fr-FR') : '...'}
                  →
                  ${s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : '...'}
                </div>
              ` : ''}
            </div>
            <div class="btn-group btn-group-sm">
              ${s.can_edit ? `
                <button class="btn btn-outline-${s.actif ? 'warning' : 'success'}"
                        onclick="toggleStructureAccess(${s.structure_id}, ${!s.actif})"
                        title="${s.actif ? 'Desactiver' : 'Activer'}">
                  <i class="bi bi-${s.actif ? 'pause' : 'play'}"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="removeStructureAccess(${s.structure_id})" title="Supprimer">
                  <i class="bi bi-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Section pour ajouter une structure
  const addContainer = document.getElementById('add-structure-container');
  if (availableStructures && availableStructures.length > 0) {
    addContainer.innerHTML = `
      <div class="input-group">
        <select class="form-select" id="new-structure-select">
          <option value="">Ajouter une structure...</option>
          ${availableStructures.map(s =>
            `<option value="${s.id}">${s.nom}</option>`
          ).join('')}
        </select>
        <button class="btn btn-success" onclick="addStructureAccess()">
          <i class="bi bi-plus"></i> Ajouter
        </button>
      </div>
    `;
    addContainer.style.display = 'block';
  } else {
    addContainer.style.display = 'none';
  }
}

async function addStructureAccess() {
  const structureId = document.getElementById('new-structure-select').value;
  if (!structureId) {
    showToast('Selectionnez une structure', 'warning');
    return;
  }

  try {
    const response = await fetch(`/api/parametres/utilisateurs/${editingUserId}/structures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ structure_id: parseInt(structureId) })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || 'Erreur');
    }

    showToast('Acces structure ajoute', 'success');
    loadEditingUserStructures(editingUserId);
    loadUsers(); // Rafraichir la liste principale
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

async function updateStructureRole(structureId, roleStructure) {
  try {
    const response = await fetch(`/api/parametres/utilisateurs/${editingUserId}/structures/${structureId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ role_structure: roleStructure || null })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || 'Erreur');
    }

    showToast('Role mis a jour', 'success');
    loadUsers(); // Rafraichir la liste principale
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
    loadEditingUserStructures(editingUserId); // Recharger pour annuler le changement visuel
  }
}

async function toggleStructureAccess(structureId, actif) {
  try {
    const response = await fetch(`/api/parametres/utilisateurs/${editingUserId}/structures/${structureId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ actif })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || 'Erreur');
    }

    showToast(actif ? 'Acces active' : 'Acces desactive', 'success');
    loadEditingUserStructures(editingUserId);
    loadUsers();
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

async function removeStructureAccess(structureId) {
  if (!confirm('Supprimer cet acces structure ?')) return;

  try {
    const response = await fetch(`/api/parametres/utilisateurs/${editingUserId}/structures/${structureId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || 'Erreur');
    }

    showToast('Acces supprime', 'success');
    loadEditingUserStructures(editingUserId);
    loadUsers();
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

// === Modal Promouvoir Usager ===

function openPromoteModal() {
  selectedPromoteAdherent = null;
  document.getElementById('promote-search').value = '';
  document.getElementById('promote-results').style.display = 'none';
  document.getElementById('promote-results').innerHTML = '';
  document.getElementById('promote-selected').style.display = 'none';
  document.getElementById('promote-role-container').style.display = 'none';
  document.getElementById('promote-structures-container').style.display = 'none';
  document.getElementById('btn-promote').disabled = true;

  // Generer les options de role
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const maxLevel = currentUserRole === 'administrateur' ? currentLevel : currentLevel - 1;
  const roleSelect = document.getElementById('promote-role');
  roleSelect.innerHTML = '';

  Object.entries(ROLE_HIERARCHY).forEach(([role, level]) => {
    if (level > 0 && level <= maxLevel) {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = ROLE_LABELS[role];
      roleSelect.appendChild(option);
    }
  });

  // Generer les checkboxes de structures
  const structuresContainer = document.getElementById('promote-structures-checkboxes');
  structuresContainer.innerHTML = structures.map(s => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox" id="promote-struct-${s.id}" value="${s.id}">
      <label class="form-check-label" for="promote-struct-${s.id}">
        ${s.icone ? `<i class="bi ${s.icone}"></i>` : ''} ${s.nom}
      </label>
    </div>
  `).join('');

  modalPromote.show();
  setTimeout(() => document.getElementById('promote-search').focus(), 500);
}

async function searchAdherents(term) {
  const resultsContainer = document.getElementById('promote-results');

  if (term.length < 2) {
    resultsContainer.style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`/api/adherents?search=${encodeURIComponent(term)}&limit=10`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) throw new Error('Erreur recherche');

    const result = await response.json();
    const adherents = result.adherents || result;

    // Filtrer les adherents qui ont deja un role administratif
    const eligibles = adherents.filter(a => !a.role || a.role === 'usager');

    if (eligibles.length === 0) {
      resultsContainer.innerHTML = '<div class="p-3 text-muted text-center">Aucun usager eligible trouve</div>';
    } else {
      resultsContainer.innerHTML = eligibles.map(a => `
        <div class="search-result-item" onclick="selectAdherentToPromote(${a.id}, '${(a.prenom || '').replace(/'/g, "\\'")} ${(a.nom || '').replace(/'/g, "\\'")}', '${a.email}')">
          <div class="fw-semibold">${a.prenom} ${a.nom}</div>
          <small class="text-muted">${a.email}</small>
        </div>
      `).join('');
    }
    resultsContainer.style.display = 'block';
  } catch (error) {
    console.error('Erreur recherche:', error);
    resultsContainer.innerHTML = '<div class="p-3 text-danger">Erreur lors de la recherche</div>';
    resultsContainer.style.display = 'block';
  }
}

function selectAdherentToPromote(id, name, email) {
  selectedPromoteAdherent = { id, name, email };
  document.getElementById('promote-results').style.display = 'none';
  document.getElementById('promote-search').value = '';
  document.getElementById('promote-selected').style.display = 'block';
  document.getElementById('promote-selected-name').innerHTML = `<strong>${name}</strong><br><small>${email}</small>`;
  document.getElementById('promote-role-container').style.display = 'block';
  document.getElementById('promote-structures-container').style.display = 'block';
  document.getElementById('btn-promote').disabled = false;
}

function clearPromoteSelection() {
  selectedPromoteAdherent = null;
  document.getElementById('promote-selected').style.display = 'none';
  document.getElementById('promote-role-container').style.display = 'none';
  document.getElementById('promote-structures-container').style.display = 'none';
  document.getElementById('btn-promote').disabled = true;
}

async function promoteAdherent() {
  if (!selectedPromoteAdherent) return;

  const newRole = document.getElementById('promote-role').value;

  // Collecter les structures selectionnees
  const selectedStructures = [];
  structures.forEach(s => {
    const checkbox = document.getElementById(`promote-struct-${s.id}`);
    if (checkbox && checkbox.checked) {
      selectedStructures.push(s.id);
    }
  });

  try {
    // 1. Changer le role global
    const roleResponse = await fetch(`/api/parametres/utilisateurs/${selectedPromoteAdherent.id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!roleResponse.ok) {
      const err = await roleResponse.json();
      throw new Error(err.error || err.message || 'Erreur changement role');
    }

    // 2. Ajouter les acces structures
    for (const structureId of selectedStructures) {
      try {
        await fetch(`/api/parametres/utilisateurs/${selectedPromoteAdherent.id}/structures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ structure_id: structureId })
        });
      } catch (e) {
        console.warn(`Erreur ajout structure ${structureId}:`, e);
      }
    }

    modalPromote.hide();
    showToast(`${selectedPromoteAdherent.name} est maintenant ${ROLE_LABELS[newRole]}`, 'success');
    loadUsers();
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

// === Modal Reset Password ===

function openResetPasswordModal(userId, email) {
  resetPasswordUserId = userId;
  document.getElementById('reset-email').textContent = email;
  modalResetPassword.show();
}

async function confirmResetPassword() {
  if (!resetPasswordUserId) return;

  try {
    const response = await fetch(`/api/parametres/utilisateurs/${resetPasswordUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || 'Erreur');
    }

    modalResetPassword.hide();
    showToast('Email de reinitialisation envoye', 'success');
  } catch (error) {
    console.error('Erreur:', error);
    showToast(error.message, 'error');
  }
}

// === Toast ===

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  toastContainer.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container position-fixed top-0 end-0 p-3';
  container.style.zIndex = '1100';
  document.body.appendChild(container);
  return container;
}

// === Initialisation au chargement ===
document.addEventListener('DOMContentLoaded', () => {
  renderSubNav('general', 'utilisateurs');
  initPage();
});
