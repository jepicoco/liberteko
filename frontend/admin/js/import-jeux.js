/**
 * Import Jeux - JavaScript
 * Gestion de l'interface d'import de jeux depuis CSV
 */

// State
let selectedFile = null;
let previewData = null;
let currentMapping = {};
let availableFields = [];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const btnAnalyze = document.getElementById('btnAnalyze');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  // Charger les champs disponibles
  try {
    const response = await importAPI.getFields();
    availableFields = response.fields;
  } catch (error) {
    console.error('Erreur chargement champs:', error);
  }

  setupDropZone();
  setupFileInput();
});

// ==================== FILE HANDLING ====================

function setupDropZone() {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function setupFileInput() {
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });
}

function handleFile(file) {
  // Verifier le type
  const validExtensions = ['.csv', '.txt'];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!validExtensions.includes(ext)) {
    Swal.fire({
      icon: 'error',
      title: 'Format non supporte',
      text: 'Veuillez selectionner un fichier CSV ou TXT'
    });
    return;
  }

  // Verifier la taille (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    Swal.fire({
      icon: 'error',
      title: 'Fichier trop volumineux',
      text: 'Le fichier ne doit pas depasser 10 MB'
    });
    return;
  }

  selectedFile = file;
  updateDropZoneUI();
  btnAnalyze.disabled = false;
}

function updateDropZoneUI() {
  if (selectedFile) {
    const sizeKB = (selectedFile.size / 1024).toFixed(1);
    const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    const sizeStr = selectedFile.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    dropZone.classList.add('has-file');
    dropZone.innerHTML = `
      <i class="bi bi-file-earmark-check"></i>
      <h4>Fichier selectionne</h4>
      <div class="file-info">
        <i class="bi bi-file-earmark-spreadsheet file-icon"></i>
        <div class="file-details">
          <div class="file-name">${selectedFile.name}</div>
          <div class="file-size">${sizeStr}</div>
        </div>
        <button class="btn btn-outline-danger btn-sm" onclick="removeFile(event)">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  } else {
    dropZone.classList.remove('has-file');
    dropZone.innerHTML = `
      <i class="bi bi-cloud-upload"></i>
      <h4>Glissez-deposez votre fichier CSV ici</h4>
      <p class="text-muted">ou cliquez pour selectionner un fichier</p>
      <p class="text-muted small">Formats acceptes : CSV, TXT (max 10 MB)</p>
    `;
  }
}

function removeFile(event) {
  event.stopPropagation();
  selectedFile = null;
  fileInput.value = '';
  updateDropZoneUI();
  btnAnalyze.disabled = true;
}

// ==================== ANALYZE ====================

async function analyzeFile() {
  if (!selectedFile) return;

  const separator = document.getElementById('separator').value;

  btnAnalyze.disabled = true;
  btnAnalyze.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Analyse...';

  try {
    previewData = await importAPI.previewJeux(selectedFile, separator);
    currentMapping = previewData.mapping;

    renderMappingTable();
    renderPreviewTable();
    document.getElementById('totalCount').textContent = previewData.totalRows;

    goToStep(2);
  } catch (error) {
    console.error('Erreur analyse:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur d\'analyse',
      text: error.message || 'Impossible d\'analyser le fichier'
    });
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyze.innerHTML = '<i class="bi bi-search"></i> Analyser le fichier';
  }
}

// ==================== MAPPING ====================

function renderMappingTable() {
  const tbody = document.getElementById('mappingTableBody');
  const rawPreview = previewData.rawPreview[0] || {};

  // Grouper les champs par groupe pour l'affichage
  const groupedFields = {};
  availableFields.forEach(field => {
    const group = field.group || 'Autre';
    if (!groupedFields[group]) groupedFields[group] = [];
    groupedFields[group].push(field);
  });

  tbody.innerHTML = previewData.columns.map(col => {
    const example = rawPreview[col] || '';
    const currentField = currentMapping[col] || 'ignore';

    // Generer les options groupees
    let options = '';
    Object.entries(groupedFields).forEach(([group, fields]) => {
      options += `<optgroup label="${group}">`;
      fields.forEach(field => {
        const selected = field.id === currentField ? 'selected' : '';
        const required = field.required ? ' *' : '';
        options += `<option value="${field.id}" ${selected}>${field.label}${required}</option>`;
      });
      options += '</optgroup>';
    });

    // Verifier si c'est une colonne auto-mappee
    const autoMapped = currentMapping[col] && currentMapping[col] !== 'ignore';
    const rowClass = autoMapped ? 'table-success' : '';

    return `
      <tr class="${rowClass}">
        <td><strong>${col}</strong> ${autoMapped ? '<i class="bi bi-check-circle text-success" title="Auto-detecte"></i>' : ''}</td>
        <td class="text-muted small">${truncate(example, 50)}</td>
        <td>
          <select class="form-select form-select-sm" onchange="updateMapping('${escapeHtml(col)}', this.value)">
            ${options}
          </select>
        </td>
      </tr>
    `;
  }).join('');

  // Afficher le nombre de colonnes mappees
  const mappedCount = Object.keys(currentMapping).length;
  const totalCount = previewData.columns.length;
  const mappingInfo = document.createElement('div');
  mappingInfo.className = 'alert alert-info mt-2';
  mappingInfo.innerHTML = `<i class="bi bi-info-circle"></i> ${mappedCount} colonnes sur ${totalCount} sont mappees automatiquement (surbrillance verte)`;

  const existingInfo = tbody.parentElement.parentElement.querySelector('.alert-info');
  if (existingInfo) existingInfo.remove();
  tbody.parentElement.parentElement.insertBefore(mappingInfo, tbody.parentElement);
}

function updateMapping(column, field) {
  if (field === 'ignore') {
    delete currentMapping[column];
  } else {
    currentMapping[column] = field;
  }
}

function renderPreviewTable() {
  const table = document.getElementById('previewTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // En-tetes
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Titre</th>
      <th>Type</th>
      <th>Editeur</th>
      <th>Joueurs</th>
      <th>Duree</th>
      <th>Age</th>
      <th>Categories</th>
      <th>EAN</th>
    </tr>
  `;

  // Donnees
  tbody.innerHTML = previewData.preview.map((jeu, idx) => {
    // Type badge
    const typeMap = {
      'basegame': '<span class="badge bg-primary">Base</span>',
      'extension': '<span class="badge bg-info">Extension</span>',
      'standalone': '<span class="badge bg-secondary">Standalone</span>',
      'accessoire': '<span class="badge bg-warning">Accessoire</span>'
    };
    const typeBadge = typeMap[jeu.type_jeu] || '<span class="badge bg-primary">Base</span>';

    // Formater les categories (prendre les 2 premieres)
    let categories = '-';
    if (jeu.categories) {
      const cats = jeu.categories.split(',').map(c => c.trim()).slice(0, 2);
      categories = cats.join(', ') + (jeu.categories.split(',').length > 2 ? '...' : '');
    }

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${jeu.titre || '<em class="text-muted">-</em>'}</strong>
          ${jeu.sous_titre ? '<br><small class="text-muted">' + jeu.sous_titre + '</small>' : ''}
        </td>
        <td>${typeBadge}</td>
        <td>${jeu.editeur || '-'}</td>
        <td>${jeu.nb_joueurs_min ? `${jeu.nb_joueurs_min}${jeu.nb_joueurs_max ? '-' + jeu.nb_joueurs_max : '+'}` : '-'}</td>
        <td>${jeu.duree_partie ? jeu.duree_partie + ' min' : '-'}</td>
        <td>${jeu.age_min ? jeu.age_min + '+' : '-'}</td>
        <td><small>${categories}</small></td>
        <td><small class="text-muted">${jeu.ean || '-'}</small></td>
      </tr>
    `;
  }).join('');
}

// ==================== IMPORT ====================

async function startImport() {
  if (!selectedFile) return;

  // Determiner l'action pour les doublons
  const duplicateAction = document.querySelector('input[name="duplicateAction"]:checked')?.value || 'skip';
  const skipDuplicates = duplicateAction === 'skip';
  const updateExisting = duplicateAction === 'update';

  // Message de confirmation adapte
  let confirmText = `Vous allez importer ${previewData.totalRows} jeux.`;
  if (updateExisting) {
    confirmText += ' Les jeux existants seront mis a jour.';
  } else if (skipDuplicates) {
    confirmText += ' Les doublons seront ignores.';
  } else {
    confirmText += ' Attention: des doublons peuvent etre crees.';
  }

  const result = await Swal.fire({
    title: 'Confirmer l\'import',
    text: confirmText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Importer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  // Afficher le loader
  Swal.fire({
    title: 'Import en cours...',
    html: `<div class="progress" style="height: 20px;">
      <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
    </div>
    <p class="mt-2">Traitement de ${previewData.totalRows} jeux...</p>`,
    allowOutsideClick: false,
    showConfirmButton: false
  });

  try {
    const importResult = await importAPI.importJeux(selectedFile, {
      separator: document.getElementById('separator').value,
      skipDuplicates,
      updateExisting,
      mapping: currentMapping
    });

    Swal.close();
    showResults(importResult);
    goToStep(3);

  } catch (error) {
    console.error('Erreur import:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur d\'import',
      text: error.message || 'Une erreur est survenue lors de l\'import'
    });
  }
}

function showResults(results) {
  const summaryDiv = document.getElementById('resultsSummary');

  summaryDiv.innerHTML = `
    <div class="result-card success">
      <div class="number">${results.imported}</div>
      <div class="label">Jeux importes</div>
    </div>
    <div class="result-card" style="background: #cfe2ff; color: #084298;">
      <div class="number">${results.updated || 0}</div>
      <div class="label">Mis a jour</div>
    </div>
    <div class="result-card warning">
      <div class="number">${results.skipped}</div>
      <div class="label">Ignores (doublons)</div>
    </div>
    <div class="result-card error">
      <div class="number">${results.errors.length}</div>
      <div class="label">Erreurs</div>
    </div>
  `;

  // Afficher les erreurs si presentes
  const errorsSection = document.getElementById('errorsSection');
  const errorsTableBody = document.getElementById('errorsTableBody');

  if (results.errors.length > 0) {
    errorsSection.classList.remove('d-none');
    errorsTableBody.innerHTML = results.errors.map(err => `
      <tr>
        <td>${err.line}</td>
        <td class="text-danger">${err.error}</td>
        <td class="small">${err.data ? Object.values(err.data).slice(0, 3).join(', ') : '-'}</td>
      </tr>
    `).join('');
  } else {
    errorsSection.classList.add('d-none');
  }
}

// ==================== NAVIGATION ====================

function goToStep(stepNum) {
  // Cacher toutes les etapes
  document.getElementById('step1').classList.add('d-none');
  document.getElementById('step2').classList.add('d-none');
  document.getElementById('step3').classList.add('d-none');

  // Afficher l'etape demandee
  document.getElementById(`step${stepNum}`).classList.remove('d-none');

  // Mettre a jour les indicateurs
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    indicator.classList.remove('active', 'completed');

    if (i < stepNum) {
      indicator.classList.add('completed');
    } else if (i === stepNum) {
      indicator.classList.add('active');
    }
  }

  // Reset si retour a l'etape 1
  if (stepNum === 1) {
    selectedFile = null;
    previewData = null;
    currentMapping = {};
    fileInput.value = '';
    updateDropZoneUI();
    btnAnalyze.disabled = true;
  }
}

// ==================== UTILITIES ====================

function truncate(str, maxLength) {
  if (!str) return '';
  str = String(str);
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
