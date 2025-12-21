/**
 * Administration - Baremes Quotient Familial
 * CRUD complet pour la gestion des configurations QF
 * Avec support des valeurs differentes par type de tarif
 */

// Donnees chargees
let baremes = [];
let typesTarifs = [];
let trancheCounter = 0;

// Modals Bootstrap
let modalBareme;
let modalDupliquer;
let modalSupprimer;

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Initialiser le template admin (navbar + sidebar)
  if (typeof initTemplate === 'function') {
    await initTemplate('parametres');
  }

  // Initialiser les modals
  modalBareme = new bootstrap.Modal(document.getElementById('modalBareme'));
  modalDupliquer = new bootstrap.Modal(document.getElementById('modalDupliquer'));
  modalSupprimer = new bootstrap.Modal(document.getElementById('modalSupprimer'));

  // Charger les donnees en parallele
  await Promise.all([
    chargerBaremes(),
    chargerTypesTarifs()
  ]);
});

// ============================================================
// CHARGEMENT DES DONNEES
// ============================================================

async function chargerBaremes() {
  try {
    const response = await apiAdmin.get('/parametres/baremes-qf');
    baremes = response.data || [];
    afficherBaremes();
  } catch (error) {
    console.error('Erreur chargement baremes:', error);
    showToast('Erreur lors du chargement des baremes', 'danger');
  }
}

async function chargerTypesTarifs() {
  try {
    const response = await apiAdmin.get('/parametres/baremes-qf/types-tarifs');
    typesTarifs = response.data || [];
  } catch (error) {
    console.error('Erreur chargement types tarifs:', error);
    // Pas critique, on continue sans les types
  }
}

// ============================================================
// AFFICHAGE
// ============================================================

function afficherBaremes() {
  const container = document.getElementById('baremes-list');
  const emptyState = document.getElementById('empty-state');

  if (baremes.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = baremes.map(bareme => `
    <div class="col-md-6 col-lg-4">
      <div class="card bareme-card h-100 ${bareme.par_defaut ? 'default' : ''} ${!bareme.actif ? 'inactive' : ''}">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(bareme.libelle)}</strong>
            ${bareme.par_defaut ? '<span class="badge badge-defaut ms-2">Par defaut</span>' : ''}
          </div>
          ${!bareme.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
        </div>
        <div class="card-body">
          <p class="text-muted small mb-2">
            <i class="bi bi-tag"></i> Code: <code>${escapeHtml(bareme.code)}</code>
          </p>

          ${bareme.description ? `<p class="small text-muted mb-3">${escapeHtml(bareme.description)}</p>` : ''}

          <h6 class="mb-2">
            <i class="bi bi-layers"></i> ${bareme.tranches?.length || 0} tranche(s)
          </h6>

          <div class="tranche-list">
            ${(bareme.tranches || []).sort((a, b) => a.ordre - b.ordre).map(tranche => {
              const nbValeursType = (tranche.valeursParType || []).filter(v => v.actif !== false).length;
              return `
                <div class="tranche-row d-flex justify-content-between align-items-center">
                  <div>
                    <span class="fw-medium">${escapeHtml(tranche.libelle)}</span>
                    ${nbValeursType > 0 ? `<span class="badge bg-info ms-1" title="${nbValeursType} valeur(s) par type"><i class="bi bi-currency-euro"></i> ${nbValeursType}</span>` : ''}
                  </div>
                  <span class="badge bg-secondary">
                    ${tranche.borne_min}${tranche.borne_max !== null ? ' - ' + tranche.borne_max : '+'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="card-footer">
          <div class="btn-group btn-group-sm w-100">
            <button class="btn btn-outline-primary" onclick="modifierBareme(${bareme.id})" title="Modifier">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            <button class="btn btn-outline-secondary" onclick="dupliquerBareme(${bareme.id})" title="Dupliquer">
              <i class="bi bi-copy"></i>
            </button>
            ${!bareme.par_defaut ? `
              <button class="btn btn-outline-success" onclick="definirParDefaut(${bareme.id})" title="Definir par defaut">
                <i class="bi bi-star"></i>
              </button>
            ` : ''}
            ${!bareme.par_defaut ? `
              <button class="btn btn-outline-danger" onclick="supprimerBareme(${bareme.id}, '${escapeHtml(bareme.libelle)}')" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// MODAL BAREME (CREATION / MODIFICATION)
// ============================================================

function ouvrirModalBareme(id = null) {
  const form = document.getElementById('formBareme');
  form.reset();

  document.getElementById('baremeId').value = '';
  document.getElementById('modalBaremeTitle').textContent = 'Nouveau bareme';
  document.getElementById('baremeCode').disabled = false;
  document.getElementById('tranches-container').innerHTML = '';
  document.getElementById('tranches-empty').style.display = 'block';
  trancheCounter = 0;

  if (id) {
    const bareme = baremes.find(b => b.id === id);
    if (bareme) {
      document.getElementById('modalBaremeTitle').textContent = 'Modifier le bareme';
      document.getElementById('baremeId').value = bareme.id;
      document.getElementById('baremeCode').value = bareme.code;
      document.getElementById('baremeCode').disabled = true; // Code non modifiable
      document.getElementById('baremeLibelle').value = bareme.libelle;
      document.getElementById('baremeDescription').value = bareme.description || '';
      document.getElementById('baremeDefaut').checked = bareme.par_defaut;

      // Charger les tranches existantes
      document.getElementById('tranches-empty').style.display = 'none';
      (bareme.tranches || []).sort((a, b) => a.ordre - b.ordre).forEach(tranche => {
        ajouterTranche(tranche);
      });
    }
  } else {
    // Ajouter une tranche vide par defaut
    ajouterTranche();
  }

  modalBareme.show();
}

async function modifierBareme(id) {
  try {
    // Charger le detail complet avec valeurs par type
    const response = await apiAdmin.get(`/parametres/baremes-qf/${id}`);
    const baremeDetail = response.data;

    // Mettre a jour le bareme dans la liste locale
    const index = baremes.findIndex(b => b.id === id);
    if (index !== -1) {
      baremes[index] = baremeDetail;
    }

    ouvrirModalBareme(id);
  } catch (error) {
    console.error('Erreur chargement detail bareme:', error);
    // Fallback: ouvrir avec les donnees locales
    ouvrirModalBareme(id);
  }
}

// ============================================================
// GESTION DES TRANCHES
// ============================================================

function ajouterTranche(data = null) {
  const container = document.getElementById('tranches-container');
  const emptyMsg = document.getElementById('tranches-empty');
  emptyMsg.style.display = 'none';

  const index = trancheCounter++;

  // Generer les lignes de valeurs par type
  const valeursParTypeHtml = typesTarifs.map(type => {
    // Chercher la valeur existante pour ce type
    const valeurExistante = data?.valeursParType?.find(v => v.type_tarif_id === type.id);
    const hasValue = valeurExistante && valeurExistante.valeur > 0;

    return `
      <div class="valeur-type-row">
        <span class="type-name">${escapeHtml(type.libelle)}</span>
        <select class="form-select form-select-sm" id="tranche-${index}-type-${type.id}-calcul" style="width: 110px;">
          <option value="fixe" ${valeurExistante?.type_calcul !== 'pourcentage' ? 'selected' : ''}>Fixe (€)</option>
          <option value="pourcentage" ${valeurExistante?.type_calcul === 'pourcentage' ? 'selected' : ''}>Pourcentage</option>
        </select>
        <input type="number" class="form-control form-control-sm" id="tranche-${index}-type-${type.id}-valeur"
               value="${hasValue ? valeurExistante.valeur : ''}" placeholder="Valeur" step="0.01" style="width: 100px;">
        <span class="text-muted small" id="tranche-${index}-type-${type.id}-unit">€</span>
      </div>
    `;
  }).join('');

  const hasValeursParType = data?.valeursParType?.length > 0;

  const html = `
    <div class="tranche-row" id="tranche-${index}" draggable="true"
         ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)"
         ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)"
         ondrop="handleDrop(event)">
      <div class="row g-2 align-items-center">
        <div class="col-auto">
          <span class="drag-handle" title="Glisser pour reordonner">
            <i class="bi bi-grip-vertical"></i>
          </span>
        </div>
        <div class="col-auto">
          <div class="btn-group-vertical">
            <button type="button" class="btn btn-outline-secondary ordre-btn" onclick="monterTranche(${index})" title="Monter">
              <i class="bi bi-chevron-up"></i>
            </button>
            <button type="button" class="btn btn-outline-secondary ordre-btn" onclick="descendreTranche(${index})" title="Descendre">
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>
        <div class="col">
          <label class="form-label small mb-0">Libelle</label>
          <input type="text" class="form-control form-control-sm" id="tranche-libelle-${index}"
                 value="${data?.libelle || ''}" placeholder="Ex: QF 0-400" required>
        </div>
        <div class="col-2">
          <label class="form-label small mb-0">Borne min</label>
          <input type="number" class="form-control form-control-sm" id="tranche-min-${index}"
                 value="${data?.borne_min ?? 0}" min="0" required>
        </div>
        <div class="col-2">
          <label class="form-label small mb-0">Borne max</label>
          <input type="number" class="form-control form-control-sm" id="tranche-max-${index}"
                 value="${data?.borne_max ?? ''}" placeholder="infini">
        </div>
        <div class="col-auto">
          ${typesTarifs.length > 0 ? `
            <button type="button" class="btn btn-outline-info btn-sm" onclick="toggleValeursParType(${index})"
                    title="Valeurs par type de tarif" id="btn-valeurs-${index}">
              <i class="bi bi-currency-euro"></i>
              ${hasValeursParType ? '<span class="badge bg-info ms-1">' + data.valeursParType.filter(v => v.valeur > 0).length + '</span>' : ''}
            </button>
          ` : ''}
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="supprimerTranche(${index})" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      ${typesTarifs.length > 0 ? `
        <div class="valeurs-type-container mt-2" id="valeurs-type-${index}" style="display: ${hasValeursParType ? 'block' : 'none'};">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <small class="text-muted fw-bold">Valeurs par type de tarif</small>
            <button type="button" class="btn btn-link btn-sm p-0 text-muted" onclick="toggleValeursParType(${index})">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          ${valeursParTypeHtml || '<p class="text-muted small mb-0">Aucun type de tarif configure</p>'}
        </div>
      ` : ''}
    </div>`;

  container.insertAdjacentHTML('beforeend', html);

  // Attacher les ecouteurs pour mettre a jour l'unite
  typesTarifs.forEach(type => {
    const selectCalcul = document.getElementById(`tranche-${index}-type-${type.id}-calcul`);
    if (selectCalcul) {
      selectCalcul.addEventListener('change', () => updateUnitLabel(index, type.id));
    }
  });
}

function toggleValeursParType(index) {
  const container = document.getElementById(`valeurs-type-${index}`);
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
}

function updateUnitLabel(trancheIndex, typeId) {
  const selectCalcul = document.getElementById(`tranche-${trancheIndex}-type-${typeId}-calcul`);
  const unitLabel = document.getElementById(`tranche-${trancheIndex}-type-${typeId}-unit`);
  if (selectCalcul && unitLabel) {
    unitLabel.textContent = selectCalcul.value === 'pourcentage' ? '%' : '€';
  }
}

function supprimerTranche(index) {
  const el = document.getElementById(`tranche-${index}`);
  if (el) {
    el.remove();

    // Afficher message si plus de tranches
    const container = document.getElementById('tranches-container');
    if (container.children.length === 0) {
      document.getElementById('tranches-empty').style.display = 'block';
    }
  }
}

// ============================================================
// REORDONNANCEMENT DES TRANCHES
// ============================================================

function monterTranche(index) {
  const el = document.getElementById(`tranche-${index}`);
  if (!el || !el.previousElementSibling) return;
  el.parentNode.insertBefore(el, el.previousElementSibling);
}

function descendreTranche(index) {
  const el = document.getElementById(`tranche-${index}`);
  if (!el || !el.nextElementSibling) return;
  el.parentNode.insertBefore(el.nextElementSibling, el);
}

// Drag & Drop
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.target.closest('.tranche-row');
  if (draggedElement) {
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedElement.id);
  }
}

function handleDragEnd(e) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
  // Retirer tous les indicateurs visuels
  document.querySelectorAll('.tranche-row.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
  draggedElement = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.target.closest('.tranche-row');
  if (target && target !== draggedElement) {
    target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  const target = e.target.closest('.tranche-row');
  if (target) {
    target.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const target = e.target.closest('.tranche-row');
  if (!target || !draggedElement || target === draggedElement) return;

  target.classList.remove('drag-over');

  const container = document.getElementById('tranches-container');
  const allRows = Array.from(container.querySelectorAll('.tranche-row'));
  const draggedIndex = allRows.indexOf(draggedElement);
  const targetIndex = allRows.indexOf(target);

  if (draggedIndex < targetIndex) {
    // Deplacer apres la cible
    target.parentNode.insertBefore(draggedElement, target.nextSibling);
  } else {
    // Deplacer avant la cible
    target.parentNode.insertBefore(draggedElement, target);
  }
}

function collecterTranches() {
  const container = document.getElementById('tranches-container');
  const tranches = [];

  container.querySelectorAll('.tranche-row').forEach((row, ordre) => {
    const id = row.id.replace('tranche-', '');
    const libelle = document.getElementById(`tranche-libelle-${id}`)?.value?.trim();
    const borneMin = document.getElementById(`tranche-min-${id}`)?.value;
    const borneMax = document.getElementById(`tranche-max-${id}`)?.value;

    if (libelle) {
      // Collecter les valeurs par type de tarif
      const valeursParType = [];
      typesTarifs.forEach(type => {
        const valeurInput = document.getElementById(`tranche-${id}-type-${type.id}-valeur`);
        const calculSelect = document.getElementById(`tranche-${id}-type-${type.id}-calcul`);

        if (valeurInput && valeurInput.value) {
          const valeur = parseFloat(valeurInput.value);
          if (!isNaN(valeur) && valeur > 0) {
            valeursParType.push({
              type_tarif_id: type.id,
              type_calcul: calculSelect?.value || 'fixe',
              valeur: valeur
            });
          }
        }
      });

      tranches.push({
        libelle,
        borne_min: parseInt(borneMin) || 0,
        borne_max: borneMax ? parseInt(borneMax) : null,
        ordre: ordre + 1,
        valeursParType: valeursParType.length > 0 ? valeursParType : undefined
      });
    }
  });

  return tranches;
}

// ============================================================
// SAUVEGARDE
// ============================================================

async function sauvegarderBareme() {
  const id = document.getElementById('baremeId').value;
  const tranches = collecterTranches();

  if (tranches.length === 0) {
    showToast('Ajoutez au moins une tranche', 'warning');
    return;
  }

  const code = document.getElementById('baremeCode').value?.trim().toUpperCase();
  const libelle = document.getElementById('baremeLibelle').value?.trim();

  if (!code || !libelle) {
    showToast('Code et libelle sont requis', 'warning');
    return;
  }

  const data = {
    code,
    libelle,
    description: document.getElementById('baremeDescription').value?.trim() || null,
    par_defaut: document.getElementById('baremeDefaut').checked,
    tranches
  };

  try {
    if (id) {
      await apiAdmin.put(`/parametres/baremes-qf/${id}`, data);
      showToast('Bareme modifie avec succes', 'success');
    } else {
      await apiAdmin.post('/parametres/baremes-qf', data);
      showToast('Bareme cree avec succes', 'success');
    }

    modalBareme.hide();
    await chargerBaremes();
  } catch (error) {
    console.error('Erreur sauvegarde bareme:', error);
    const message = error.response?.data?.error || 'Erreur lors de la sauvegarde';
    showToast(message, 'danger');
  }
}

// ============================================================
// DUPLICATION
// ============================================================

function dupliquerBareme(id) {
  const bareme = baremes.find(b => b.id === id);
  if (!bareme) return;

  document.getElementById('dupliquerBaremeId').value = id;
  document.getElementById('dupliquerCode').value = bareme.code + '_COPIE';
  document.getElementById('dupliquerLibelle').value = bareme.libelle + ' (copie)';

  modalDupliquer.show();
}

async function confirmerDuplication() {
  const id = document.getElementById('dupliquerBaremeId').value;
  const nouveauCode = document.getElementById('dupliquerCode').value?.trim().toUpperCase();
  const nouveauLibelle = document.getElementById('dupliquerLibelle').value?.trim();

  if (!nouveauCode || !nouveauLibelle) {
    showToast('Code et libelle sont requis', 'warning');
    return;
  }

  try {
    await apiAdmin.post(`/parametres/baremes-qf/${id}/dupliquer`, {
      nouveau_code: nouveauCode,
      nouveau_libelle: nouveauLibelle
    });

    showToast('Bareme duplique avec succes', 'success');
    modalDupliquer.hide();
    await chargerBaremes();
  } catch (error) {
    console.error('Erreur duplication bareme:', error);
    const message = error.response?.data?.error || 'Erreur lors de la duplication';
    showToast(message, 'danger');
  }
}

// ============================================================
// SUPPRESSION
// ============================================================

function supprimerBareme(id, nom) {
  document.getElementById('supprimerBaremeId').value = id;
  document.getElementById('supprimerBaremeNom').textContent = nom;
  modalSupprimer.show();
}

async function confirmerSuppression() {
  const id = document.getElementById('supprimerBaremeId').value;

  try {
    await apiAdmin.delete(`/parametres/baremes-qf/${id}`);
    showToast('Bareme supprime', 'success');
    modalSupprimer.hide();
    await chargerBaremes();
  } catch (error) {
    console.error('Erreur suppression bareme:', error);
    const message = error.response?.data?.error || 'Erreur lors de la suppression';
    showToast(message, 'danger');
  }
}

// ============================================================
// DEFINIR PAR DEFAUT
// ============================================================

async function definirParDefaut(id) {
  try {
    await apiAdmin.put(`/parametres/baremes-qf/${id}/defaut`);
    showToast('Bareme defini par defaut', 'success');
    await chargerBaremes();
  } catch (error) {
    console.error('Erreur set default bareme:', error);
    const message = error.response?.data?.error || 'Erreur lors de la modification';
    showToast(message, 'danger');
  }
}

// ============================================================
// UTILITAIRES
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  toast.style.zIndex = 9999;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
