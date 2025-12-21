/**
 * Gestion des Tags Utilisateur
 * CRUD complet avec preview en temps reel
 */

// Cache des tags
let tagsCache = [];

// Couleurs predefinies
const COULEURS = [
  '#28a745', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997',
  '#e83e8c', '#dc3545', '#ffc107', '#6c757d', '#343a40',
  '#007bff', '#0056b3'
];

// Icones predefinies
const ICONES = [
  'bi-tag', 'bi-tags', 'bi-person', 'bi-people', 'bi-briefcase',
  'bi-heart', 'bi-star', 'bi-award', 'bi-universal-access', 'bi-cash-stack',
  'bi-mortarboard', 'bi-house', 'bi-geo-alt', 'bi-calendar', 'bi-clock',
  'bi-shield', 'bi-flag', 'bi-bookmark', 'bi-lightning', 'bi-gift'
];

// ============================================================
// Initialisation
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Tags Utilisateur] Initialisation...');

  // Initialiser le template admin
  if (typeof initTemplate === 'function') {
    await initTemplate('parametres');
  }

  // Initialiser les options de couleur et d'icone
  initColorOptions();
  initIconOptions();

  // Ecouter les changements pour le preview
  setupPreviewListeners();

  // Charger les tags
  await chargerTags();

  console.log('[Tags Utilisateur] Initialisation terminee');
});

// ============================================================
// Initialisation des options
// ============================================================

function initColorOptions() {
  const container = document.getElementById('color-options');
  container.innerHTML = COULEURS.map(couleur => `
    <div class="color-option" style="background-color: ${couleur};"
         data-color="${couleur}" onclick="selectColor('${couleur}')"
         title="${couleur}"></div>
  `).join('');
}

function initIconOptions() {
  const container = document.getElementById('icon-options');
  container.innerHTML = ICONES.map(icone => `
    <div class="icon-option" data-icon="${icone}" onclick="selectIcon('${icone}')" title="${icone}">
      <i class="bi ${icone}"></i>
    </div>
  `).join('');
}

function setupPreviewListeners() {
  document.getElementById('tag_libelle').addEventListener('input', updatePreview);
  document.getElementById('tag_couleur_custom').addEventListener('input', (e) => {
    selectColor(e.target.value);
  });
}

// ============================================================
// Selection couleur / icone
// ============================================================

let selectedColor = '#6c757d';
let selectedIcon = 'bi-tag';

function selectColor(couleur) {
  selectedColor = couleur;

  // Mettre a jour les options
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === couleur);
  });

  // Mettre a jour le color picker
  document.getElementById('tag_couleur_custom').value = couleur;

  updatePreview();
}

function selectIcon(icone) {
  selectedIcon = icone;

  // Mettre a jour les options
  document.querySelectorAll('.icon-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.icon === icone);
  });

  updatePreview();
}

function updatePreview() {
  const libelle = document.getElementById('tag_libelle').value || 'Nouveau tag';
  const preview = document.getElementById('tag-preview');

  preview.style.backgroundColor = selectedColor;
  preview.innerHTML = `
    <i class="bi ${selectedIcon}"></i>
    <span>${libelle}</span>
  `;
}

// ============================================================
// Chargement des tags
// ============================================================

async function chargerTags() {
  try {
    const response = await apiAdmin.get('/parametres/tags-utilisateur');
    tagsCache = response;
    afficherTags();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement tags:', error);
    showToast('Erreur lors du chargement des tags', 'error');
  }
}

function afficherTags() {
  const container = document.getElementById('tags-container');

  if (tagsCache.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5 text-muted">
          <i class="bi bi-tags" style="font-size: 3rem;"></i>
          <h5 class="mt-3">Aucun tag</h5>
          <p>Creez votre premier tag pour categoriser les usagers.</p>
          <button class="btn btn-primary" onclick="ouvrirModal()">
            <i class="bi bi-plus-lg"></i> Creer un tag
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = tagsCache.map(tag => `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="card tag-card ${tag.actif ? '' : 'inactive'}" style="border-left-color: ${tag.couleur};">
        <div class="card-body">
          <div class="d-flex align-items-center mb-3">
            <div class="tag-icon-preview me-3" style="background-color: ${tag.couleur};">
              <i class="bi ${tag.icone || 'bi-tag'}"></i>
            </div>
            <div class="flex-grow-1">
              <h5 class="card-title mb-0">${escapeHtml(tag.libelle)}</h5>
              <code class="text-muted small">${tag.code}</code>
            </div>
            ${!tag.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
          </div>
          ${tag.description ? `<p class="card-text text-muted small">${escapeHtml(tag.description)}</p>` : ''}
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="text-muted small">
              <i class="bi bi-people"></i> ${tag.nb_utilisateurs || 0} usager(s)
            </span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="ouvrirModal(${tag.id})" title="Modifier">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-${tag.actif ? 'warning' : 'success'}"
                      onclick="toggleTag(${tag.id})"
                      title="${tag.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${tag.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="supprimerTag(${tag.id})" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Initialiser SortableJS pour le drag & drop
  new Sortable(container, {
    animation: 150,
    handle: '.card',
    onEnd: async (evt) => {
      const ordres = [];
      container.querySelectorAll('.col-md-6').forEach((el, index) => {
        const card = el.querySelector('.tag-card');
        if (card) {
          const tagId = parseInt(card.querySelector('[onclick^="ouvrirModal"]').getAttribute('onclick').match(/\d+/)[0]);
          ordres.push({ id: tagId, ordre: index });
        }
      });

      try {
        await apiAdmin.put('/parametres/tags-utilisateur-reorder', { ordres });
        showToast('Ordre mis a jour', 'success');
      } catch (error) {
        console.error('Erreur reordonnement:', error);
        showToast('Erreur lors du reordonnement', 'error');
        await chargerTags(); // Recharger pour restaurer l'ordre
      }
    }
  });
}

function updateStats() {
  const total = tagsCache.length;
  const actifs = tagsCache.filter(t => t.actif).length;
  const utilises = tagsCache.filter(t => t.nb_utilisateurs > 0).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statActifs').textContent = actifs;
  document.getElementById('statUtilises').textContent = utilises;
}

// ============================================================
// Modal et CRUD
// ============================================================

function ouvrirModal(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalTag'));
  const form = document.getElementById('formTag');
  form.reset();

  // Reset selections
  selectedColor = '#6c757d';
  selectedIcon = 'bi-tag';

  if (id) {
    // Mode edition
    const tag = tagsCache.find(t => t.id === id);
    if (!tag) return;

    document.getElementById('modalTagTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier le tag';
    document.getElementById('tag_id').value = tag.id;
    document.getElementById('tag_code').value = tag.code;
    document.getElementById('tag_code').readOnly = true; // Code non modifiable
    document.getElementById('tag_libelle').value = tag.libelle;
    document.getElementById('tag_description').value = tag.description || '';
    document.getElementById('tag_ordre').value = tag.ordre || 0;
    document.getElementById('tag_actif').checked = tag.actif;

    selectedColor = tag.couleur || '#6c757d';
    selectedIcon = tag.icone || 'bi-tag';
  } else {
    // Mode creation
    document.getElementById('modalTagTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Nouveau tag';
    document.getElementById('tag_id').value = '';
    document.getElementById('tag_code').readOnly = false;
    document.getElementById('tag_ordre').value = tagsCache.length;
  }

  // Appliquer les selections
  selectColor(selectedColor);
  selectIcon(selectedIcon);
  updatePreview();

  modal.show();
}

async function sauvegarderTag() {
  const id = document.getElementById('tag_id').value;
  const code = document.getElementById('tag_code').value.trim();
  const libelle = document.getElementById('tag_libelle').value.trim();
  const description = document.getElementById('tag_description').value.trim();
  const ordre = parseInt(document.getElementById('tag_ordre').value) || 0;
  const actif = document.getElementById('tag_actif').checked;

  // Validation
  if (!code || !libelle) {
    showToast('Le code et le libelle sont requis', 'error');
    return;
  }

  const data = {
    code,
    libelle,
    description: description || null,
    couleur: selectedColor,
    icone: selectedIcon,
    ordre,
    actif
  };

  try {
    if (id) {
      await apiAdmin.put(`/parametres/tags-utilisateur/${id}`, data);
      showToast('Tag modifie avec succes', 'success');
    } else {
      await apiAdmin.post('/parametres/tags-utilisateur', data);
      showToast('Tag cree avec succes', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalTag')).hide();
    await chargerTags();
  } catch (error) {
    console.error('Erreur sauvegarde tag:', error);
    showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
  }
}

async function toggleTag(id) {
  const tag = tagsCache.find(t => t.id === id);
  if (!tag) return;

  try {
    await apiAdmin.put(`/parametres/tags-utilisateur/${id}`, { actif: !tag.actif });
    showToast(`Tag ${tag.actif ? 'desactive' : 'active'}`, 'success');
    await chargerTags();
  } catch (error) {
    console.error('Erreur toggle tag:', error);
    showToast('Erreur lors de la modification', 'error');
  }
}

async function supprimerTag(id) {
  const tag = tagsCache.find(t => t.id === id);
  if (!tag) return;

  const result = await Swal.fire({
    title: 'Supprimer ce tag ?',
    html: `
      <p>Voulez-vous vraiment supprimer le tag <strong>${escapeHtml(tag.libelle)}</strong> ?</p>
      ${tag.nb_utilisateurs > 0 ?
        `<div class="alert alert-warning mt-3">
          <i class="bi bi-exclamation-triangle"></i>
          Ce tag est utilise par ${tag.nb_utilisateurs} usager(s). Il sera desactive au lieu d'etre supprime.
        </div>` : ''
      }
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: tag.nb_utilisateurs > 0 ? 'Desactiver' : 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiAdmin.delete(`/parametres/tags-utilisateur/${id}`);
    showToast(response.message || 'Tag supprime', 'success');
    await chargerTags();
  } catch (error) {
    console.error('Erreur suppression tag:', error);
    showToast('Erreur lors de la suppression', 'error');
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
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });

  Toast.fire({
    icon: type,
    title: message
  });
}

// Exporter les fonctions pour les onclick
window.ouvrirModal = ouvrirModal;
window.sauvegarderTag = sauvegarderTag;
window.toggleTag = toggleTag;
window.supprimerTag = supprimerTag;
window.selectColor = selectColor;
window.selectIcon = selectIcon;
