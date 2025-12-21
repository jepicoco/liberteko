/**
 * Administration - Configuration Tarification
 * Gestion des types de tarifs, quotient familial et regles de reduction
 */

// Donnees chargees
let typesTarifs = [];
let configurationsQF = [];
let reglesReduction = [];

// ============================================================
// INITIALISATION
// ============================================================

// Initialiser le template admin (doit etre appele avant DOMContentLoaded)
if (typeof initTemplate === 'function') {
  initTemplate('parametres');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialiser la navigation secondaire
  if (typeof renderSubNav === 'function') {
    renderSubNav('comptabilite', 'tarification');
  }

  await Promise.all([
    chargerTypesTarifs(),
    chargerConfigurationsQF(),
    chargerReglesReduction()
  ]);

  // Listener pour le type de calcul (suffix EUR/%)
  document.getElementById('regleTypeCalcul')?.addEventListener('change', (e) => {
    document.getElementById('regleValeurSuffix').textContent =
      e.target.value === 'pourcentage' ? '%' : 'EUR';
  });
});

// ============================================================
// TYPES DE TARIFS
// ============================================================

async function chargerTypesTarifs() {
  try {
    const response = await apiAdmin.get('/tarification/types-tarifs');
    typesTarifs = response.data || [];
    afficherTypesTarifs();
  } catch (error) {
    console.error('Erreur chargement types tarifs:', error);
    showToast('Erreur lors du chargement des types de tarifs', 'danger');
  }
}

function afficherTypesTarifs() {
  const container = document.getElementById('types-tarifs-list');
  if (!container) return;

  if (typesTarifs.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary">
          <i class="bi bi-info-circle"></i> Aucun type de tarif configure.
        </div>
      </div>`;
    return;
  }

  container.innerHTML = typesTarifs.map(type => `
    <div class="col-md-4">
      <div class="card type-tarif-card h-100 ${type.actif ? '' : 'inactive'}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="card-title mb-0">${escapeHtml(type.libelle)}</h6>
              <small class="text-muted">${escapeHtml(type.code)}</small>
            </div>
            <span class="badge ${type.actif ? 'bg-success' : 'bg-secondary'}">
              ${type.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>

          <p class="card-text small text-muted mb-2">
            ${type.description ? escapeHtml(type.description) : '<em>Pas de description</em>'}
          </p>

          <div class="condition-preview mb-2">
            ${formatConditionAge(type)}
          </div>

          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Priorite: ${type.priorite}</small>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="modifierTypeTarif(${type.id})" title="Modifier">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="toggleTypeTarif(${type.id}, ${type.actif})"
                      title="${type.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${type.actif ? 'x-circle' : 'check-circle'}"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function formatConditionAge(type) {
  switch (type.condition_age_operateur) {
    case '<':
      return `<i class="bi bi-person"></i> Age &lt; ${type.condition_age_max} ans`;
    case '<=':
      return `<i class="bi bi-person"></i> Age &le; ${type.condition_age_max} ans`;
    case '>':
      return `<i class="bi bi-person"></i> Age &gt; ${type.condition_age_max} ans`;
    case '>=':
      return `<i class="bi bi-person"></i> Age &ge; ${type.condition_age_max} ans`;
    case 'entre':
      return `<i class="bi bi-person"></i> ${type.condition_age_min} &le; Age &le; ${type.condition_age_max} ans`;
    default:
      return `<i class="bi bi-infinity"></i> Aucune condition d'age`;
  }
}

function ouvrirModalTypeTarif(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalTypeTarif'));
  const form = document.getElementById('formTypeTarif');
  form.reset();

  document.getElementById('typeTarifId').value = '';
  document.getElementById('modalTypeTarifTitle').textContent = 'Nouveau type de tarif';
  document.getElementById('conditionAgeValues').style.display = 'none';

  if (id) {
    const type = typesTarifs.find(t => t.id === id);
    if (type) {
      document.getElementById('modalTypeTarifTitle').textContent = 'Modifier le type de tarif';
      document.getElementById('typeTarifId').value = type.id;
      document.getElementById('typeTarifCode').value = type.code;
      document.getElementById('typeTarifLibelle').value = type.libelle;
      document.getElementById('typeTarifDescription').value = type.description || '';
      document.getElementById('typeTarifOperateur').value = type.condition_age_operateur || 'aucune';
      document.getElementById('typeTarifAgeMin').value = type.condition_age_min || '';
      document.getElementById('typeTarifAgeMax').value = type.condition_age_max || '';
      document.getElementById('typeTarifPriorite').value = type.priorite || 100;
      updateConditionAgeUI();
    }
  }

  modal.show();
}

function modifierTypeTarif(id) {
  ouvrirModalTypeTarif(id);
}

function updateConditionAgeUI() {
  const operateur = document.getElementById('typeTarifOperateur').value;
  const container = document.getElementById('conditionAgeValues');
  const minGroup = document.getElementById('ageMinGroup');
  const maxGroup = document.getElementById('ageMaxGroup');
  const maxLabel = document.getElementById('ageMaxLabel');

  if (operateur === 'aucune') {
    container.style.display = 'none';
  } else if (operateur === 'entre') {
    container.style.display = 'flex';
    minGroup.style.display = 'block';
    maxGroup.style.display = 'block';
    maxLabel.textContent = 'maximum';
  } else {
    container.style.display = 'flex';
    minGroup.style.display = 'none';
    maxGroup.style.display = 'block';
    maxLabel.textContent = 'seuil';
  }
}

async function sauvegarderTypeTarif() {
  const id = document.getElementById('typeTarifId').value;
  const data = {
    code: document.getElementById('typeTarifCode').value.toUpperCase(),
    libelle: document.getElementById('typeTarifLibelle').value,
    description: document.getElementById('typeTarifDescription').value,
    condition_age_operateur: document.getElementById('typeTarifOperateur').value,
    condition_age_min: document.getElementById('typeTarifAgeMin').value || null,
    condition_age_max: document.getElementById('typeTarifAgeMax').value || null,
    priorite: parseInt(document.getElementById('typeTarifPriorite').value) || 100
  };

  try {
    if (id) {
      await apiAdmin.put(`/tarification/types-tarifs/${id}`, data);
      showToast('Type de tarif modifie', 'success');
    } else {
      await apiAdmin.post('/tarification/types-tarifs', data);
      showToast('Type de tarif cree', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalTypeTarif')).hide();
    await chargerTypesTarifs();
  } catch (error) {
    console.error('Erreur sauvegarde type tarif:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

async function toggleTypeTarif(id, currentState) {
  if (!confirm(`Voulez-vous ${currentState ? 'desactiver' : 'activer'} ce type de tarif ?`)) {
    return;
  }

  try {
    await apiAdmin.put(`/tarification/types-tarifs/${id}`, { actif: !currentState });
    showToast(`Type de tarif ${currentState ? 'desactive' : 'active'}`, 'success');
    await chargerTypesTarifs();
  } catch (error) {
    console.error('Erreur toggle type tarif:', error);
    showToast('Erreur lors de la modification', 'danger');
  }
}

// ============================================================
// QUOTIENT FAMILIAL
// ============================================================

async function chargerConfigurationsQF() {
  try {
    const response = await apiAdmin.get('/tarification/configurations-qf');
    configurationsQF = response.data || [];
    afficherConfigurationsQF();
  } catch (error) {
    console.error('Erreur chargement configurations QF:', error);
    showToast('Erreur lors du chargement des configurations QF', 'danger');
  }
}

function afficherConfigurationsQF() {
  const container = document.getElementById('configurations-qf-list');
  if (!container) return;

  if (configurationsQF.length === 0) {
    container.innerHTML = `
      <div class="alert alert-secondary">
        <i class="bi bi-info-circle"></i> Aucun bareme de quotient familial.
        <a href="parametres-baremes-qf.html">Creer un bareme</a>
      </div>`;
    return;
  }

  container.innerHTML = configurationsQF.map(config => `
    <div class="card mb-3" id="bareme-${config.id}">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <strong>${escapeHtml(config.libelle)}</strong>
          <span class="badge bg-secondary ms-2">${escapeHtml(config.code)}</span>
          ${config.par_defaut ? '<span class="badge bg-primary ms-1">Par defaut</span>' : ''}
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="sauvegarderValeursBareme(${config.id})">
          <i class="bi bi-check-lg"></i> Enregistrer
        </button>
      </div>
      <div class="card-body">
        ${config.description ? `<p class="text-muted small mb-3">${escapeHtml(config.description)}</p>` : ''}

        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Tranche</th>
                <th>Bornes QF</th>
                <th style="width: 120px;">Type</th>
                <th style="width: 120px;">Valeur</th>
              </tr>
            </thead>
            <tbody>
              ${(config.tranches || []).sort((a, b) => a.ordre - b.ordre).map(tranche => `
                <tr>
                  <td><strong>${escapeHtml(tranche.libelle)}</strong></td>
                  <td class="text-muted">${tranche.borne_min} - ${tranche.borne_max !== null ? tranche.borne_max : '+infini'}</td>
                  <td>
                    <select class="form-select form-select-sm" id="type-${tranche.id}" data-tranche-id="${tranche.id}">
                      <option value="fixe" ${tranche.type_calcul === 'fixe' ? 'selected' : ''}>Fixe (EUR)</option>
                      <option value="pourcentage" ${tranche.type_calcul === 'pourcentage' ? 'selected' : ''}>%</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" class="form-control form-control-sm" id="valeur-${tranche.id}"
                           data-tranche-id="${tranche.id}" value="${tranche.valeur || 0}" step="0.01" min="0">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `).join('');
}

async function sauvegarderValeursBareme(baremeId) {
  const config = configurationsQF.find(c => c.id === baremeId);
  if (!config) return;

  // Collecter les valeurs modifiees
  const tranches = (config.tranches || []).map(tranche => {
    const typeEl = document.getElementById(`type-${tranche.id}`);
    const valeurEl = document.getElementById(`valeur-${tranche.id}`);
    return {
      libelle: tranche.libelle,
      borne_min: tranche.borne_min,
      borne_max: tranche.borne_max,
      type_calcul: typeEl?.value || 'fixe',
      valeur: parseFloat(valeurEl?.value) || 0,
      ordre: tranche.ordre
    };
  });

  try {
    await apiAdmin.put(`/parametres/baremes-qf/${baremeId}`, {
      libelle: config.libelle,
      description: config.description,
      par_defaut: config.par_defaut,
      tranches
    });
    showToast('Valeurs enregistrees', 'success');
    await chargerConfigurationsQF();
  } catch (error) {
    console.error('Erreur sauvegarde valeurs bareme:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

// ============================================================
// REGLES DE REDUCTION
// ============================================================

async function chargerReglesReduction() {
  try {
    const response = await apiAdmin.get('/tarification/regles-reduction');
    reglesReduction = response.data || [];
    afficherReglesReduction();
  } catch (error) {
    console.error('Erreur chargement regles reduction:', error);
    showToast('Erreur lors du chargement des regles', 'danger');
  }
}

function afficherReglesReduction() {
  const container = document.getElementById('regles-reduction-list');
  if (!container) return;

  const filtre = document.getElementById('filtre-source')?.value || '';
  const reglesFiltrees = filtre
    ? reglesReduction.filter(r => r.type_source === filtre)
    : reglesReduction;

  if (reglesFiltrees.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary">
          <i class="bi bi-info-circle"></i> Aucune regle de reduction ${filtre ? 'pour cette source' : 'configuree'}.
        </div>
      </div>`;
    return;
  }

  container.innerHTML = reglesFiltrees.map(regle => `
    <div class="col-md-6">
      <div class="card regle-card h-100 ${regle.actif ? '' : 'inactive'}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="card-title mb-0">${escapeHtml(regle.libelle)}</h6>
              <small class="text-muted">${escapeHtml(regle.code)}</small>
            </div>
            <span class="badge ${regle.actif ? 'bg-success' : 'bg-secondary'}">
              ${regle.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>

          <div class="mb-2">
            <span class="badge badge-source ${getBadgeColorForSource(regle.type_source)}">
              ${formatSourceLabel(regle.type_source)}
            </span>
            <span class="badge bg-dark ms-1">
              ${regle.type_calcul === 'pourcentage' ? `${regle.valeur}%` : `${parseFloat(regle.valeur).toFixed(2)} EUR`}
            </span>
          </div>

          ${regle.description ? `<p class="card-text small text-muted mb-2">${escapeHtml(regle.description)}</p>` : ''}

          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Priorite: ${regle.ordre_application}</small>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="modifierRegle(${regle.id})" title="Modifier">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="toggleRegle(${regle.id}, ${regle.actif})"
                      title="${regle.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${regle.actif ? 'x-circle' : 'check-circle'}"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function getBadgeColorForSource(source) {
  const colors = {
    commune: 'bg-primary',
    quotient_familial: 'bg-info',
    statut_social: 'bg-warning text-dark',
    multi_enfants: 'bg-success',
    fidelite: 'bg-purple',
    partenariat: 'bg-secondary',
    handicap: 'bg-danger',
    age: 'bg-dark',
    manuel: 'bg-light text-dark'
  };
  return colors[source] || 'bg-secondary';
}

function formatSourceLabel(source) {
  const labels = {
    commune: 'Commune',
    quotient_familial: 'QF',
    statut_social: 'Statut social',
    multi_enfants: 'Multi-enfants',
    fidelite: 'Fidelite',
    partenariat: 'Partenariat',
    handicap: 'Handicap',
    age: 'Age',
    manuel: 'Manuel'
  };
  return labels[source] || source;
}

function filtrerRegles() {
  afficherReglesReduction();
}

function ouvrirModalRegle(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalRegle'));
  const form = document.getElementById('formRegle');
  form.reset();

  document.getElementById('regleId').value = '';
  document.getElementById('modalRegleTitle').textContent = 'Nouvelle regle de reduction';
  document.getElementById('condition-container').style.display = 'none';
  document.getElementById('regleValeurSuffix').textContent = 'EUR';

  if (id) {
    const regle = reglesReduction.find(r => r.id === id);
    if (regle) {
      document.getElementById('modalRegleTitle').textContent = 'Modifier la regle';
      document.getElementById('regleId').value = regle.id;
      document.getElementById('regleCode').value = regle.code;
      document.getElementById('regleLibelle').value = regle.libelle;
      document.getElementById('regleSource').value = regle.type_source;
      document.getElementById('reglePriorite').value = regle.ordre_application;
      document.getElementById('regleTypeCalcul').value = regle.type_calcul;
      document.getElementById('regleValeur').value = regle.valeur;
      document.getElementById('regleDescription').value = regle.description || '';
      document.getElementById('regleValeurSuffix').textContent =
        regle.type_calcul === 'pourcentage' ? '%' : 'EUR';

      updateConditionUI();
      // TODO: remplir les champs de condition depuis condition_json
    }
  }

  modal.show();
}

function modifierRegle(id) {
  ouvrirModalRegle(id);
}

function updateConditionUI() {
  const source = document.getElementById('regleSource').value;
  const container = document.getElementById('condition-container');
  const fields = document.getElementById('condition-fields');

  if (!source || source === 'manuel' || source === 'handicap') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  switch (source) {
    case 'commune':
      fields.innerHTML = `
        <label class="form-label small">Codes postaux (separes par virgule)</label>
        <input type="text" class="form-control form-control-sm" id="conditionCodesPostaux"
               placeholder="74140, 74200, 74500">`;
      break;

    case 'quotient_familial':
      fields.innerHTML = `
        <div class="row">
          <div class="col-6">
            <label class="form-label small">QF minimum</label>
            <input type="number" class="form-control form-control-sm" id="conditionQFMin" min="0">
          </div>
          <div class="col-6">
            <label class="form-label small">QF maximum</label>
            <input type="number" class="form-control form-control-sm" id="conditionQFMax" min="0">
          </div>
        </div>`;
      break;

    case 'statut_social':
      fields.innerHTML = `
        <label class="form-label small">Statuts concernes</label>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="statutRSA" value="rsa">
          <label class="form-check-label" for="statutRSA">RSA</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="statutAAH" value="aah">
          <label class="form-check-label" for="statutAAH">AAH</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="statutEtudiant" value="etudiant">
          <label class="form-check-label" for="statutEtudiant">Etudiant</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="statutChomeur" value="chomeur">
          <label class="form-check-label" for="statutChomeur">Demandeur d'emploi</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="statutRetraite" value="retraite">
          <label class="form-check-label" for="statutRetraite">Retraite</label>
        </div>`;
      break;

    case 'multi_enfants':
      fields.innerHTML = `
        <label class="form-label small">Nombre minimum d'enfants</label>
        <input type="number" class="form-control form-control-sm" id="conditionNbEnfants" min="2" value="3">`;
      break;

    case 'fidelite':
      fields.innerHTML = `
        <label class="form-label small">Annees d'anciennete minimum</label>
        <input type="number" class="form-control form-control-sm" id="conditionAnciennete" min="1" value="3">`;
      break;

    case 'age':
      fields.innerHTML = `
        <div class="row">
          <div class="col-4">
            <label class="form-label small">Operateur</label>
            <select class="form-select form-select-sm" id="conditionAgeOp">
              <option value="<">Inferieur</option>
              <option value="<=">Inf. ou egal</option>
              <option value=">">Superieur</option>
              <option value=">=">Sup. ou egal</option>
            </select>
          </div>
          <div class="col-4">
            <label class="form-label small">Age</label>
            <input type="number" class="form-control form-control-sm" id="conditionAgeSeuil" min="0" max="120">
          </div>
        </div>`;
      break;

    case 'partenariat':
      fields.innerHTML = `
        <label class="form-label small">Code partenaire</label>
        <input type="text" class="form-control form-control-sm" id="conditionPartenaire"
               placeholder="Ex: PARTNER_001">`;
      break;

    default:
      fields.innerHTML = '<p class="text-muted small">Pas de condition specifique pour cette source.</p>';
  }
}

function collecterCondition() {
  const source = document.getElementById('regleSource').value;
  const condition = {};

  switch (source) {
    case 'commune':
      const codesPostaux = document.getElementById('conditionCodesPostaux')?.value;
      if (codesPostaux) {
        condition.codes_postaux = codesPostaux.split(',').map(c => c.trim());
      }
      break;

    case 'quotient_familial':
      const qfMin = document.getElementById('conditionQFMin')?.value;
      const qfMax = document.getElementById('conditionQFMax')?.value;
      if (qfMin) condition.qf_min = parseInt(qfMin);
      if (qfMax) condition.qf_max = parseInt(qfMax);
      break;

    case 'statut_social':
      const statuts = [];
      ['RSA', 'AAH', 'Etudiant', 'Chomeur', 'Retraite'].forEach(s => {
        if (document.getElementById(`statut${s}`)?.checked) {
          statuts.push(s.toLowerCase());
        }
      });
      if (statuts.length > 0) condition.statuts = statuts;
      break;

    case 'multi_enfants':
      const nbEnfants = document.getElementById('conditionNbEnfants')?.value;
      if (nbEnfants) condition.nb_enfants_min = parseInt(nbEnfants);
      break;

    case 'fidelite':
      const anciennete = document.getElementById('conditionAnciennete')?.value;
      if (anciennete) condition.annees_min = parseInt(anciennete);
      break;

    case 'age':
      const ageOp = document.getElementById('conditionAgeOp')?.value;
      const ageSeuil = document.getElementById('conditionAgeSeuil')?.value;
      if (ageOp && ageSeuil) {
        condition.operateur = ageOp;
        condition.age = parseInt(ageSeuil);
      }
      break;

    case 'partenariat':
      const partenaire = document.getElementById('conditionPartenaire')?.value;
      if (partenaire) condition.code_partenaire = partenaire;
      break;
  }

  return Object.keys(condition).length > 0 ? condition : null;
}

async function sauvegarderRegle() {
  const id = document.getElementById('regleId').value;
  const condition = collecterCondition();

  const data = {
    code: document.getElementById('regleCode').value.toUpperCase(),
    libelle: document.getElementById('regleLibelle').value,
    type_source: document.getElementById('regleSource').value,
    type_calcul: document.getElementById('regleTypeCalcul').value,
    valeur: parseFloat(document.getElementById('regleValeur').value),
    ordre_application: parseInt(document.getElementById('reglePriorite').value) || 100,
    description: document.getElementById('regleDescription').value,
    condition_json: condition
  };

  try {
    if (id) {
      await apiAdmin.put(`/tarification/regles-reduction/${id}`, data);
      showToast('Regle de reduction modifiee', 'success');
    } else {
      await apiAdmin.post('/tarification/regles-reduction', data);
      showToast('Regle de reduction creee', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalRegle')).hide();
    await chargerReglesReduction();
  } catch (error) {
    console.error('Erreur sauvegarde regle:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

async function toggleRegle(id, currentState) {
  if (!confirm(`Voulez-vous ${currentState ? 'desactiver' : 'activer'} cette regle ?`)) {
    return;
  }

  try {
    await apiAdmin.put(`/tarification/regles-reduction/${id}`, { actif: !currentState });
    showToast(`Regle ${currentState ? 'desactivee' : 'activee'}`, 'success');
    await chargerReglesReduction();
  } catch (error) {
    console.error('Erreur toggle regle:', error);
    showToast('Erreur lors de la modification', 'danger');
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
