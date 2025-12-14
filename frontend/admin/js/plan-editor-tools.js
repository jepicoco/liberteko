/**
 * Plan Editor - Outils de dessin et interactions canvas
 */

/**
 * Configure les event listeners
 */
function setupEventListeners() {
  const svg = PlanEditor.svg;
  const container = document.getElementById('canvasContainer');

  // Events canvas
  svg.addEventListener('mousedown', onCanvasMouseDown);
  svg.addEventListener('mousemove', onCanvasMouseMove);
  svg.addEventListener('mouseup', onCanvasMouseUp);
  svg.addEventListener('mouseleave', onCanvasMouseLeave);
  svg.addEventListener('dblclick', onCanvasDoubleClick);
  svg.addEventListener('wheel', onCanvasWheel);

  // Click sur fond = deselection
  svg.addEventListener('click', (e) => {
    if (e.target === svg || e.target.id === 'gridBackground') {
      if (PlanEditor.currentTool === 'select' && !PlanEditor.isDrawing) {
        selectElement(null);
      }
    }
  });

  // Boutons toolbar
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectTool(btn.dataset.tool);
    });
  });

  // Zoom buttons
  document.getElementById('btnZoomIn').addEventListener('click', () => zoomCanvas(1.2));
  document.getElementById('btnZoomOut').addEventListener('click', () => zoomCanvas(0.8));
  document.getElementById('btnZoomFit').addEventListener('click', zoomFit);

  // Grille et magnetisme
  document.getElementById('btnToggleGrid').addEventListener('click', toggleGrid);
  document.getElementById('btnToggleSnap').addEventListener('click', toggleSnap);

  // Undo/Redo
  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnRedo').addEventListener('click', redo);

  // Sauvegarde
  document.getElementById('btnSave').addEventListener('click', saveElements);

  // Exports
  document.getElementById('exportPNG').addEventListener('click', exportPNG);
  document.getElementById('exportSVG').addEventListener('click', exportSVG);
  document.getElementById('exportPDF').addEventListener('click', exportPDF);
  document.getElementById('printPlan').addEventListener('click', printPlan);

  // Proprietes element
  document.getElementById('btnApplyProps').addEventListener('click', applyElementProps);
  document.getElementById('btnDeleteElement').addEventListener('click', deleteSelectedElement);

  // Emplacements
  document.getElementById('typeEmplacement').addEventListener('change', onTypeEmplacementChange);
  document.getElementById('btnAddEmplacement').addEventListener('click', addEmplacementToElement);
  document.getElementById('btnCreateEmplacement').addEventListener('click', openCreateEmplacementModal);
  document.getElementById('btnSaveNewEmplacement').addEventListener('click', saveNewEmplacement);
  document.getElementById('newEmplacementIcone').addEventListener('input', (e) => {
    document.getElementById('newEmplacementIconePreview').innerHTML = `<i class="bi bi-${e.target.value || 'geo-alt'}"></i>`;
  });

  // Parametres plan
  document.getElementById('planTailleGrille').addEventListener('input', (e) => {
    document.getElementById('tailleGrilleValue').textContent = e.target.value;
  });
  document.getElementById('btnSavePlanSettings').addEventListener('click', savePlanSettings);

  // Etages
  document.getElementById('btnAddEtage').addEventListener('click', () => openEtageModal());
  document.getElementById('btnEditEtage').addEventListener('click', () => openEtageModal(PlanEditor.currentEtage));
  document.getElementById('btnDeleteEtage').addEventListener('click', deleteCurrentEtage);
  document.getElementById('btnSaveEtage').addEventListener('click', saveEtage);

  // Modal etage - changement type
  document.getElementById('etageType').addEventListener('change', (e) => {
    const isEtage = e.target.value === 'etage';
    document.getElementById('etageNumeroGroup').style.display = isEtage ? 'block' : 'none';
    document.getElementById('etageAdresseGroup').style.display = isEtage ? 'none' : 'block';
  });
}

// ============================================
// EVENEMENTS CANVAS
// ============================================

function onCanvasMouseDown(e) {
  const point = getCanvasPoint(e);

  switch (PlanEditor.currentTool) {
    case 'pan':
      PlanEditor.isPanning = true;
      PlanEditor.lastPanPoint = { x: e.clientX, y: e.clientY };
      break;

    case 'mur':
    case 'etagere':
    case 'meuble':
    case 'table':
      startDrawing(point);
      break;

    case 'zone':
      if (PlanEditor.isDrawing) {
        addDrawingPoint(point);
      } else {
        startDrawingPolygon(point);
      }
      break;
  }
}

function onCanvasMouseMove(e) {
  const point = getCanvasPoint(e);

  if (PlanEditor.isPanning && PlanEditor.lastPanPoint) {
    const dx = e.clientX - PlanEditor.lastPanPoint.x;
    const dy = e.clientY - PlanEditor.lastPanPoint.y;
    panCanvas(dx, dy);
    PlanEditor.lastPanPoint = { x: e.clientX, y: e.clientY };
    return;
  }

  if (PlanEditor.isDrawing) {
    updateDrawingPreview(point);
  }
}

function onCanvasMouseUp(e) {
  if (PlanEditor.isPanning) {
    PlanEditor.isPanning = false;
    PlanEditor.lastPanPoint = null;
    return;
  }

  if (PlanEditor.isDrawing && PlanEditor.currentTool !== 'zone') {
    finishDrawing(getCanvasPoint(e));
  }
}

function onCanvasMouseLeave(e) {
  if (PlanEditor.isPanning) {
    PlanEditor.isPanning = false;
    PlanEditor.lastPanPoint = null;
  }
}

function onCanvasDoubleClick(e) {
  if (PlanEditor.currentTool === 'zone' && PlanEditor.isDrawing) {
    finishDrawingPolygon();
  }
}

function onCanvasWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  zoomCanvas(factor);
}

// ============================================
// COORDONNEES ET GRILLE
// ============================================

/**
 * Convertit les coordonnees ecran en coordonnees canvas SVG
 * Utilise la matrice de transformation inverse du SVG
 */
function getCanvasPoint(e, applySnap = true) {
  const svg = PlanEditor.svg;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;

  // Utiliser la matrice de transformation inverse pour convertir
  const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

  let x = svgPoint.x;
  let y = svgPoint.y;

  // Appliquer le magnetisme
  if (applySnap && PlanEditor.snapToGrid) {
    x = Math.round(x / PlanEditor.gridSize) * PlanEditor.gridSize;
    y = Math.round(y / PlanEditor.gridSize) * PlanEditor.gridSize;
  }

  return { x, y };
}

// ============================================
// DESSIN
// ============================================

/**
 * Commence un dessin (ligne ou rectangle)
 */
function startDrawing(point) {
  PlanEditor.isDrawing = true;
  PlanEditor.drawingPoints = [point];

  // Creer l'apercu
  const preview = createDrawingPreview();
  PlanEditor.drawingGroup.appendChild(preview);
}

/**
 * Commence un dessin polygone (zone)
 */
function startDrawingPolygon(point) {
  PlanEditor.isDrawing = true;
  PlanEditor.drawingPoints = [point];

  // Creer l'apercu
  updatePolygonPreview();

  // Ajouter un point visible
  addDrawingPointMarker(point);
}

/**
 * Ajoute un point au polygone
 */
function addDrawingPoint(point) {
  PlanEditor.drawingPoints.push(point);
  updatePolygonPreview();
  addDrawingPointMarker(point);
}

/**
 * Ajoute un marqueur de point
 */
function addDrawingPointMarker(point) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 4);
  circle.classList.add('drawing-point');
  PlanEditor.drawingGroup.appendChild(circle);
}

/**
 * Cree l'apercu du dessin
 */
function createDrawingPreview() {
  const tool = PlanEditor.currentTool;

  if (tool === 'mur') {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('drawing-preview');
    line.id = 'drawingPreview';
    return line;
  } else {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.classList.add('drawing-preview');
    rect.id = 'drawingPreview';
    return rect;
  }
}

/**
 * Met a jour l'apercu pendant le dessin
 */
function updateDrawingPreview(point) {
  const preview = document.getElementById('drawingPreview');
  if (!preview) return;

  const start = PlanEditor.drawingPoints[0];
  const tool = PlanEditor.currentTool;

  if (tool === 'mur') {
    preview.setAttribute('x1', start.x);
    preview.setAttribute('y1', start.y);
    preview.setAttribute('x2', point.x);
    preview.setAttribute('y2', point.y);
  } else if (tool === 'zone') {
    updatePolygonPreview(point);
  } else {
    const minX = Math.min(start.x, point.x);
    const minY = Math.min(start.y, point.y);
    const width = Math.abs(point.x - start.x);
    const height = Math.abs(point.y - start.y);
    preview.setAttribute('x', minX);
    preview.setAttribute('y', minY);
    preview.setAttribute('width', width);
    preview.setAttribute('height', height);
  }
}

/**
 * Met a jour l'apercu du polygone
 */
function updatePolygonPreview(currentPoint) {
  // Supprimer l'ancien polygone
  const oldPolygon = document.getElementById('drawingPreview');
  if (oldPolygon) oldPolygon.remove();

  if (PlanEditor.drawingPoints.length === 0) return;

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.classList.add('drawing-preview');
  polygon.id = 'drawingPreview';

  let points = [...PlanEditor.drawingPoints];
  if (currentPoint) {
    points.push(currentPoint);
  }

  polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
  PlanEditor.drawingGroup.appendChild(polygon);
}

/**
 * Termine le dessin
 */
async function finishDrawing(endPoint) {
  if (!PlanEditor.isDrawing) return;

  const startPoint = PlanEditor.drawingPoints[0];

  // Verifier une taille minimum
  const minSize = PlanEditor.gridSize / 2;
  const dx = Math.abs(endPoint.x - startPoint.x);
  const dy = Math.abs(endPoint.y - startPoint.y);

  if (dx < minSize && dy < minSize) {
    cancelDrawing();
    return;
  }

  pushHistory();

  const points = [startPoint, endPoint];
  const style = getDefaultStyle(PlanEditor.currentTool);

  try {
    const element = await apiRequest(`/plans/etages/${PlanEditor.currentEtage.id}/elements`, {
      method: 'POST',
      body: JSON.stringify({
        type_element: PlanEditor.currentTool,
        points,
        style
      })
    });

    PlanEditor.elements.push(element);
    clearCanvas();
    renderElements();
    selectElement(element);
  } catch (error) {
    console.error('Erreur creation element:', error);
    showToast('Erreur lors de la creation', 'danger');
  }

  PlanEditor.isDrawing = false;
  PlanEditor.drawingPoints = [];
  PlanEditor.drawingGroup.innerHTML = '';
}

/**
 * Termine le dessin du polygone
 */
async function finishDrawingPolygon() {
  if (!PlanEditor.isDrawing || PlanEditor.drawingPoints.length < 3) {
    cancelDrawing();
    return;
  }

  pushHistory();

  const style = getDefaultStyle('zone');

  try {
    const element = await apiRequest(`/plans/etages/${PlanEditor.currentEtage.id}/elements`, {
      method: 'POST',
      body: JSON.stringify({
        type_element: 'zone',
        points: PlanEditor.drawingPoints,
        style,
        chevauchable: true
      })
    });

    PlanEditor.elements.push(element);
    clearCanvas();
    renderElements();
    selectElement(element);
  } catch (error) {
    console.error('Erreur creation zone:', error);
    showToast('Erreur lors de la creation', 'danger');
  }

  PlanEditor.isDrawing = false;
  PlanEditor.drawingPoints = [];
  PlanEditor.drawingGroup.innerHTML = '';
}

/**
 * Retourne le style par defaut pour un type d'element
 */
function getDefaultStyle(type) {
  const styles = {
    mur: { couleur: '#333333', epaisseur: 6, opacite: 1 },
    etagere: { couleur: '#8B4513', epaisseur: 2, remplissage: '#DEB887', opacite: 0.8 },
    meuble: { couleur: '#4a4a4a', epaisseur: 2, remplissage: '#a0a0a0', opacite: 0.7 },
    table: { couleur: '#2c3e50', epaisseur: 2, remplissage: '#bdc3c7', opacite: 0.6 },
    zone: { couleur: '#3498db', epaisseur: 2, remplissage: '#3498db', opacite: 0.3, dashArray: '5,5' }
  };
  return styles[type] || styles.mur;
}

// ============================================
// ZOOM ET PAN
// ============================================

function zoomCanvas(factor) {
  PlanEditor.zoom *= factor;
  PlanEditor.zoom = Math.max(0.25, Math.min(4, PlanEditor.zoom));

  document.getElementById('zoomLevel').textContent = Math.round(PlanEditor.zoom * 100) + '%';

  // Appliquer le zoom via transform sur le groupe d'elements
  // Pour l'instant, on utilise le viewBox
  const svg = PlanEditor.svg;
  const viewBox = svg.viewBox.baseVal;
  const newWidth = (PlanEditor.plan?.largeur_defaut || 1200) / PlanEditor.zoom;
  const newHeight = (PlanEditor.plan?.hauteur_defaut || 800) / PlanEditor.zoom;

  svg.setAttribute('viewBox', `${PlanEditor.panX} ${PlanEditor.panY} ${newWidth} ${newHeight}`);
}

function zoomFit() {
  PlanEditor.zoom = 1;
  PlanEditor.panX = 0;
  PlanEditor.panY = 0;

  document.getElementById('zoomLevel').textContent = '100%';
  resizeCanvas(PlanEditor.plan?.largeur_defaut || 1200, PlanEditor.plan?.hauteur_defaut || 800);
}

function panCanvas(dx, dy) {
  const viewBox = PlanEditor.svg.viewBox.baseVal;
  const scale = viewBox.width / PlanEditor.svg.getBoundingClientRect().width;

  PlanEditor.panX -= dx * scale;
  PlanEditor.panY -= dy * scale;

  PlanEditor.svg.setAttribute('viewBox',
    `${PlanEditor.panX} ${PlanEditor.panY} ${viewBox.width} ${viewBox.height}`
  );
}

// ============================================
// GRILLE ET MAGNETISME
// ============================================

function toggleGrid() {
  PlanEditor.showGrid = !PlanEditor.showGrid;
  const gridBg = document.getElementById('gridBackground');
  gridBg.style.display = PlanEditor.showGrid ? 'block' : 'none';

  const btn = document.getElementById('btnToggleGrid');
  btn.classList.toggle('active', PlanEditor.showGrid);
}

function toggleSnap() {
  PlanEditor.snapToGrid = !PlanEditor.snapToGrid;
  const btn = document.getElementById('btnToggleSnap');
  btn.classList.toggle('active', PlanEditor.snapToGrid);
}

// ============================================
// PROPRIETES ELEMENT
// ============================================

async function applyElementProps() {
  if (!PlanEditor.selectedElement) return;

  const element = PlanEditor.selectedElement;

  pushHistory();

  element.libelle = document.getElementById('propLibelle').value;
  element.description = document.getElementById('propDescription').value;
  element.style = element.style || {};
  element.style.couleur = document.getElementById('propCouleur').value;
  element.style.remplissage = document.getElementById('propRemplissage').value;
  element.style.epaisseur = parseInt(document.getElementById('propEpaisseur').value);
  element.style.opacite = parseInt(document.getElementById('propOpacite').value) / 100;
  element.calque = parseInt(document.getElementById('propCalque').value);
  element.visible_public = document.getElementById('propVisible').checked;
  element.verrouille = document.getElementById('propVerrouille').checked;

  try {
    await apiRequest(`/plans/elements/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify(element)
    });

    clearCanvas();
    renderElements();
    selectElement(element);
    showToast('Proprietes mises a jour', 'success');
  } catch (error) {
    console.error('Erreur MAJ proprietes:', error);
    showToast('Erreur lors de la mise a jour', 'danger');
  }
}

// ============================================
// EMPLACEMENTS
// ============================================

// Cache des emplacements charges
let loadedEmplacements = [];

async function onTypeEmplacementChange() {
  const type = document.getElementById('typeEmplacement').value;
  const selectEmpl = document.getElementById('selectEmplacement');
  const btnAdd = document.getElementById('btnAddEmplacement');
  const btnCreate = document.getElementById('btnCreateEmplacement');

  if (!type) {
    selectEmpl.innerHTML = '<option value="">Choisir un emplacement...</option>';
    selectEmpl.disabled = true;
    btnAdd.disabled = true;
    btnCreate.disabled = true;
    loadedEmplacements = [];
    return;
  }

  btnCreate.disabled = false;

  try {
    const siteId = PlanEditor.plan?.site_id;
    loadedEmplacements = await apiRequest(`/plans/refs/emplacements/${type}?siteId=${siteId || ''}`);

    selectEmpl.innerHTML = '<option value="">Choisir un emplacement...</option>';
    loadedEmplacements.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.dataset.couleur = emp.couleur || '#6c757d';
      option.dataset.icone = emp.icone || 'geo-alt';
      // Affichage avec couleur dot
      const codeText = emp.code ? `[${emp.code}] ` : '';
      option.textContent = `${codeText}${emp.libelle}`;
      option.style.color = emp.couleur || '#333';
      selectEmpl.appendChild(option);
    });

    selectEmpl.disabled = false;
    selectEmpl.addEventListener('change', () => {
      btnAdd.disabled = !selectEmpl.value;
    });
  } catch (error) {
    console.error('Erreur chargement emplacements:', error);
    loadedEmplacements = [];
  }
}

async function addEmplacementToElement() {
  if (!PlanEditor.selectedElement) return;

  const type = document.getElementById('typeEmplacement').value;
  const emplacementId = document.getElementById('selectEmplacement').value;

  if (!type || !emplacementId) return;

  try {
    const liaison = await apiRequest(`/plans/elements/${PlanEditor.selectedElement.id}/emplacements`, {
      method: 'POST',
      body: JSON.stringify({
        type_collection: type,
        emplacement_id: parseInt(emplacementId)
      })
    });

    // Ajouter localement
    if (!PlanEditor.selectedElement.emplacements) {
      PlanEditor.selectedElement.emplacements = [];
    }
    PlanEditor.selectedElement.emplacements.push(liaison);

    renderEmplacementsLies(PlanEditor.selectedElement);

    // Reset les selects
    document.getElementById('typeEmplacement').value = '';
    document.getElementById('selectEmplacement').innerHTML = '<option value="">Choisir un emplacement...</option>';
    document.getElementById('selectEmplacement').disabled = true;
    document.getElementById('btnAddEmplacement').disabled = true;

    showToast('Emplacement lie', 'success');
  } catch (error) {
    console.error('Erreur ajout emplacement:', error);
    showToast('Erreur lors de l\'ajout', 'danger');
  }
}

/**
 * Ouvre la modale de creation d'emplacement
 */
function openCreateEmplacementModal() {
  const type = document.getElementById('typeEmplacement').value;
  if (!type) {
    showToast('Selectionnez d\'abord un type de collection', 'warning');
    return;
  }

  // Reset le formulaire
  document.getElementById('newEmplacementLibelle').value = '';
  document.getElementById('newEmplacementCode').value = '';
  document.getElementById('newEmplacementCouleur').value = '#6c757d';
  document.getElementById('newEmplacementIcone').value = 'geo-alt';
  document.getElementById('newEmplacementIconePreview').innerHTML = '<i class="bi bi-geo-alt"></i>';
  document.getElementById('newEmplacementDescription').value = '';

  const modal = new bootstrap.Modal(document.getElementById('modalCreateEmplacement'));
  modal.show();
}

/**
 * Sauvegarde le nouvel emplacement et le lie a l'element
 */
async function saveNewEmplacement() {
  const type = document.getElementById('typeEmplacement').value;
  const libelle = document.getElementById('newEmplacementLibelle').value.trim();

  if (!libelle) {
    showToast('Le libelle est requis', 'warning');
    return;
  }

  try {
    const data = {
      libelle,
      code: document.getElementById('newEmplacementCode').value.trim() || null,
      couleur: document.getElementById('newEmplacementCouleur').value,
      icone: document.getElementById('newEmplacementIcone').value || 'geo-alt',
      description: document.getElementById('newEmplacementDescription').value.trim() || null,
      site_id: PlanEditor.plan?.site_id || null
    };

    // Creer l'emplacement
    const emplacement = await apiRequest(`/plans/refs/emplacements/${type}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    // Fermer la modale
    bootstrap.Modal.getInstance(document.getElementById('modalCreateEmplacement')).hide();

    // Si un element est selectionne, lier automatiquement
    if (PlanEditor.selectedElement) {
      const liaison = await apiRequest(`/plans/elements/${PlanEditor.selectedElement.id}/emplacements`, {
        method: 'POST',
        body: JSON.stringify({
          type_collection: type,
          emplacement_id: emplacement.id
        })
      });

      // Enrichir la liaison avec les infos de l'emplacement
      liaison[`emplacement${type.charAt(0).toUpperCase() + type.slice(1)}`] = emplacement;

      if (!PlanEditor.selectedElement.emplacements) {
        PlanEditor.selectedElement.emplacements = [];
      }
      PlanEditor.selectedElement.emplacements.push(liaison);

      renderEmplacementsLies(PlanEditor.selectedElement);
      showToast('Emplacement cree et lie', 'success');
    } else {
      showToast('Emplacement cree', 'success');
    }

    // Recharger la liste des emplacements
    await onTypeEmplacementChange();

    // Reset les selects
    document.getElementById('typeEmplacement').value = '';
    document.getElementById('selectEmplacement').innerHTML = '<option value="">Choisir un emplacement...</option>';
    document.getElementById('selectEmplacement').disabled = true;
    document.getElementById('btnAddEmplacement').disabled = true;
    document.getElementById('btnCreateEmplacement').disabled = true;

  } catch (error) {
    console.error('Erreur creation emplacement:', error);
    showToast(error.message || 'Erreur lors de la creation', 'danger');
  }
}

// ============================================
// PARAMETRES PLAN
// ============================================

async function savePlanSettings() {
  if (!PlanEditor.plan) return;

  try {
    await apiRequest(`/plans/${PlanEditor.plan.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nom: document.getElementById('planNom').value,
        largeur_defaut: parseInt(document.getElementById('planLargeur').value),
        hauteur_defaut: parseInt(document.getElementById('planHauteur').value),
        taille_grille: parseInt(document.getElementById('planTailleGrille').value),
        afficher_grille: document.getElementById('planAfficherGrille').checked,
        magnetisme_grille: document.getElementById('planMagnetisme').checked
      })
    });

    // Appliquer les changements
    PlanEditor.gridSize = parseInt(document.getElementById('planTailleGrille').value);
    PlanEditor.showGrid = document.getElementById('planAfficherGrille').checked;
    PlanEditor.snapToGrid = document.getElementById('planMagnetisme').checked;

    resizeCanvas(
      parseInt(document.getElementById('planLargeur').value),
      parseInt(document.getElementById('planHauteur').value)
    );

    showToast('Parametres sauvegardes', 'success');
  } catch (error) {
    console.error('Erreur sauvegarde parametres:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

// ============================================
// GESTION ETAGES
// ============================================

function openEtageModal(etage = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalEtage'));

  document.getElementById('modalEtageTitle').textContent = etage ? 'Modifier l\'etage' : 'Nouvel etage';
  document.getElementById('etageId').value = etage?.id || '';
  document.getElementById('etageType').value = etage?.type || 'etage';
  document.getElementById('etageNumero').value = etage?.numero ?? '';
  document.getElementById('etageNom').value = etage?.nom || '';
  document.getElementById('etageCouleurFond').value = etage?.couleur_fond || '#ffffff';
  document.getElementById('etageAdresse').value = etage?.adresse || '';

  // Afficher/masquer les champs selon le type
  const isEtage = (etage?.type || 'etage') === 'etage';
  document.getElementById('etageNumeroGroup').style.display = isEtage ? 'block' : 'none';
  document.getElementById('etageAdresseGroup').style.display = isEtage ? 'none' : 'block';

  modal.show();
}

async function saveEtage() {
  const id = document.getElementById('etageId').value;
  const data = {
    type: document.getElementById('etageType').value,
    numero: document.getElementById('etageNumero').value ? parseInt(document.getElementById('etageNumero').value) : null,
    nom: document.getElementById('etageNom').value,
    couleur_fond: document.getElementById('etageCouleurFond').value,
    adresse: document.getElementById('etageAdresse').value
  };

  try {
    if (id) {
      await apiRequest(`/plans/etages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } else {
      await apiRequest(`/plans/${PlanEditor.plan.id}/etages`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }

    bootstrap.Modal.getInstance(document.getElementById('modalEtage')).hide();
    showToast('Etage sauvegarde', 'success');

    // Recharger le plan
    await reloadPlan();
  } catch (error) {
    console.error('Erreur sauvegarde etage:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

async function deleteCurrentEtage() {
  if (!PlanEditor.currentEtage) return;

  const result = await Swal.fire({
    title: 'Supprimer cet etage ?',
    html: `L'etage <strong>"${PlanEditor.currentEtage.nom}"</strong> et tous ses elements seront supprimes.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiRequest(`/plans/etages/${PlanEditor.currentEtage.id}`, { method: 'DELETE' });
    showToast('Etage supprime', 'success');
    await reloadPlan();
  } catch (error) {
    console.error('Erreur suppression etage:', error);
    showToast('Erreur lors de la suppression', 'danger');
  }
}

async function reloadPlan() {
  if (!PlanEditor.plan) return;

  try {
    const plan = await apiRequest(`/plans/${PlanEditor.plan.id}`);
    loadPlan(plan);
  } catch (error) {
    console.error('Erreur rechargement plan:', error);
  }
}

// ============================================
// EXPORTS
// ============================================

function exportPNG() {
  // Cloner le SVG pour l'export
  const svg = PlanEditor.svg.cloneNode(true);

  // Supprimer les groupes de selection et dessin
  svg.querySelector('#selectionGroup').innerHTML = '';
  svg.querySelector('#drawingGroup').innerHTML = '';

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  canvas.width = PlanEditor.plan?.largeur_defaut || 1200;
  canvas.height = PlanEditor.plan?.hauteur_defaut || 800;

  img.onload = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const link = document.createElement('a');
    link.download = `plan_${PlanEditor.plan?.nom || 'export'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function exportSVG() {
  const svg = PlanEditor.svg.cloneNode(true);

  // Supprimer les groupes de selection et dessin
  svg.querySelector('#selectionGroup').innerHTML = '';
  svg.querySelector('#drawingGroup').innerHTML = '';

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `plan_${PlanEditor.plan?.nom || 'export'}.svg`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

function exportPDF() {
  // Pour le PDF, on utilise une librairie comme jsPDF ou on genere via le serveur
  showToast('Export PDF en cours de developpement', 'info');
}

function printPlan() {
  const svg = PlanEditor.svg.cloneNode(true);
  svg.querySelector('#selectionGroup').innerHTML = '';
  svg.querySelector('#drawingGroup').innerHTML = '';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Plan - ${PlanEditor.plan?.nom || 'Impression'}</title>
      <style>
        body { margin: 0; padding: 20px; }
        svg { max-width: 100%; height: auto; }
        h1 { font-family: Arial, sans-serif; font-size: 18px; margin-bottom: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${PlanEditor.plan?.nom || 'Plan'} - ${PlanEditor.currentEtage?.nom || ''}</h1>
      ${svg.outerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
