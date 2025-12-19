/**
 * Import Listes - JavaScript
 * Gestion de l'interface d'import de jeux par listes MyLudo
 */

// State
let selectedFile = null;
let previewData = null;

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
      <p class="text-muted small">Export MyLudo par listes (colonne "liste" obligatoire)</p>
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
    previewData = await importAPI.previewJeuxListes(selectedFile, separator);

    // Mettre a jour les stats
    document.getElementById('totalRows').textContent = previewData.totalRows;
    document.getElementById('uniqueGames').textContent = previewData.uniqueGames;
    document.getElementById('listesCount').textContent = previewData.listes.length;
    document.getElementById('importCount').textContent = previewData.uniqueGames;

    // Afficher les listes detectees
    renderListesDetected();

    // Afficher le preview
    renderPreviewTable();

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

// ==================== RENDER ====================

function renderListesDetected() {
  const container = document.getElementById('listesContainer');

  if (!previewData.listes || previewData.listes.length === 0) {
    container.innerHTML = '<p class="text-muted">Aucune liste detectee</p>';
    return;
  }

  container.innerHTML = previewData.listes.map(liste => `
    <span class="liste-badge">
      ${escapeHtml(liste.nom)}
      <span class="count">${liste.count} jeux</span>
    </span>
  `).join('');
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
      <th>EAN</th>
      <th>Listes</th>
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

    // Listes badges
    const listesBadges = (jeu.listes || []).map(l =>
      `<span class="badge bg-purple me-1" style="background: #6f42c1 !important;">${escapeHtml(l)}</span>`
    ).join('');

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${jeu.titre || '<em class="text-muted">-</em>'}</strong>
          ${jeu.sous_titre ? '<br><small class="text-muted">' + escapeHtml(jeu.sous_titre) + '</small>' : ''}
        </td>
        <td>${typeBadge}</td>
        <td><small class="text-muted">${jeu.ean || '-'}</small></td>
        <td>${listesBadges || '-'}</td>
      </tr>
    `;
  }).join('');
}

// ==================== IMPORT ====================

async function startImport() {
  if (!selectedFile) return;

  const result = await Swal.fire({
    title: 'Confirmer l\'import',
    html: `
      <p>Vous allez importer <strong>${previewData.uniqueGames}</strong> jeux uniques.</p>
      <p><strong>${previewData.listes.length}</strong> listes seront creees comme thematiques.</p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Importer',
    confirmButtonColor: '#6f42c1',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  // Afficher la modal de progression
  Swal.fire({
    title: 'Import en cours...',
    html: `
      <div class="progress mb-3" style="height: 24px;">
        <div id="swal-progress-bar" class="progress-bar" role="progressbar"
             style="width: 0%; background: #6f42c1; transition: width 0.2s ease;">
          <span id="swal-progress-text" class="fw-bold">0%</span>
        </div>
      </div>
      <div id="swal-current-game" class="text-muted small mb-2">Preparation...</div>
      <div class="d-flex justify-content-around text-center small">
        <div>
          <div id="swal-imported" class="fw-bold text-success">0</div>
          <div class="text-muted">Crees</div>
        </div>
        <div>
          <div id="swal-updated" class="fw-bold text-info">0</div>
          <div class="text-muted">Mis a jour</div>
        </div>
        <div>
          <div id="swal-errors" class="fw-bold text-danger">0</div>
          <div class="text-muted">Erreurs</div>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      startStreamingImport();
    }
  });
}

async function startStreamingImport() {
  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('separator', document.getElementById('separator').value);
  if (previewData.mapping) {
    formData.append('mapping', JSON.stringify(previewData.mapping));
  }

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/import/jeux-listes/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erreur serveur');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Traiter les evenements SSE dans le buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Garder la ligne incomplete

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleProgressEvent(data);

            if (data.type === 'complete') {
              finalResult = data;
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.error('Erreur parsing SSE:', e);
            }
          }
        }
      }
    }

    Swal.close();

    if (finalResult) {
      showResults(finalResult);
      goToStep(3);
    }

  } catch (error) {
    console.error('Erreur import streaming:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur d\'import',
      text: error.message || 'Une erreur est survenue lors de l\'import'
    });
  }
}

function handleProgressEvent(data) {
  const progressBar = document.getElementById('swal-progress-bar');
  const progressText = document.getElementById('swal-progress-text');
  const currentGame = document.getElementById('swal-current-game');
  const importedEl = document.getElementById('swal-imported');
  const updatedEl = document.getElementById('swal-updated');
  const errorsEl = document.getElementById('swal-errors');

  if (!progressBar) return;

  if (data.type === 'status') {
    currentGame.textContent = data.message;
  } else if (data.type === 'start') {
    currentGame.textContent = data.message;
  } else if (data.type === 'progress') {
    progressBar.style.width = data.percent + '%';
    progressText.textContent = data.percent + '%';
    currentGame.innerHTML = `<i class="bi bi-controller"></i> ${escapeHtml(data.game || '')}`;
    importedEl.textContent = data.imported || 0;
    updatedEl.textContent = data.updated || 0;
    errorsEl.textContent = data.errors || 0;
  } else if (data.type === 'complete') {
    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    currentGame.textContent = 'Import termine !';
  }
}

function showResults(results) {
  const summaryDiv = document.getElementById('resultsSummary');

  summaryDiv.innerHTML = `
    <div class="result-card success">
      <div class="number">${results.imported}</div>
      <div class="label">Jeux crees</div>
    </div>
    <div class="result-card info">
      <div class="number">${results.updated || 0}</div>
      <div class="label">Jeux mis a jour</div>
    </div>
    <div class="result-card purple">
      <div class="number">${results.themesCreated || 0}</div>
      <div class="label">Thematiques creees</div>
    </div>
    <div class="result-card warning">
      <div class="number">${results.themesLinked || 0}</div>
      <div class="label">Liens crees</div>
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
        <td class="text-danger">${escapeHtml(err.error)}</td>
        <td class="small">${err.data ? escapeHtml(JSON.stringify(err.data).substring(0, 100)) : '-'}</td>
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
    fileInput.value = '';
    updateDropZoneUI();
    btnAnalyze.disabled = true;
  }
}

// ==================== UTILITIES ====================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
