/**
 * Plan Editor - Logique principale
 * Gestion du canvas SVG, chargement/sauvegarde, interactions
 */

// État global de l'editeur
const PlanEditor = {
  // Données
  plan: null,
  currentEtage: null,
  elements: [],
  sites: [],
  templates: [],

  // État
  selectedElement: null,
  currentTool: 'select',
  isDrawing: false,
  drawingPoints: [],
  hasUnsavedChanges: false,

  // Redimensionnement/deplacement
  resizing: null,
  movingPoint: null,
  dragging: null,

  // Historique (undo/redo)
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  // Vue
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  lastPanPoint: null,

  // Grille
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,

  // DOM references
  svg: null,
  elementsGroup: null,
  selectionGroup: null,
  drawingGroup: null
};

/**
 * Initialisation de l'editeur
 */
async function initPlanEditor() {
  // Recuperer les references DOM
  PlanEditor.svg = document.getElementById('planCanvas');
  PlanEditor.elementsGroup = document.getElementById('elementsGroup');
  PlanEditor.selectionGroup = document.getElementById('selectionGroup');
  PlanEditor.drawingGroup = document.getElementById('drawingGroup');

  // Charger les sites
  await loadSites();

  // Charger les templates
  await loadTemplates();

  // Configurer les events
  setupEventListeners();
  setupKeyboardShortcuts();

  // Event changement de site
  document.getElementById('siteSelect').addEventListener('change', onSiteChange);

  // Event creation plan
  document.getElementById('btnCreerPlan').addEventListener('click', createPlan);
}

/**
 * Charge la liste des sites
 */
async function loadSites() {
  try {
    const sites = await apiRequest('/sites');
    PlanEditor.sites = sites.filter(s => s.actif);

    const select = document.getElementById('siteSelect');
    select.innerHTML = '<option value="">-- Choisir un site --</option>';

    PlanEditor.sites.forEach(site => {
      const option = document.createElement('option');
      option.value = site.id;
      option.textContent = `${site.nom} (${site.type})`;
      select.appendChild(option);
    });

    // Si un seul site, le selectionner automatiquement
    if (PlanEditor.sites.length === 1) {
      select.value = PlanEditor.sites[0].id;
      onSiteChange();
    }
  } catch (error) {
    console.error('Erreur chargement sites:', error);
    showToast('Erreur lors du chargement des sites', 'danger');
  }
}

/**
 * Charge les templates
 */
async function loadTemplates() {
  try {
    const templates = await apiRequest('/plans/refs/templates');
    PlanEditor.templates = templates;
    renderTemplates();
  } catch (error) {
    console.error('Erreur chargement templates:', error);
  }
}

/**
 * Event changement de site
 */
async function onSiteChange() {
  const siteId = document.getElementById('siteSelect').value;

  if (!siteId) {
    showMessage('selectSiteMessage');
    return;
  }

  // Verifier les changements non sauvegardes
  if (PlanEditor.hasUnsavedChanges) {
    const result = await Swal.fire({
      title: 'Modifications non sauvegardees',
      text: 'Vous avez des modifications non sauvegardees. Continuer sans sauvegarder ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, continuer',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) {
      return;
    }
  }

  try {
    const plan = await apiRequest(`/plans/site/${siteId}`);
    loadPlan(plan);
  } catch (error) {
    // Verifier si c'est une erreur 404 (pas de plan pour ce site)
    const isNotFound = error.message.includes('404') ||
                       error.message.includes('Aucun plan') ||
                       error.message.includes('not found') ||
                       error.message.includes('API request failed');

    if (isNotFound) {
      // Pas de plan pour ce site - afficher le bouton de creation
      showMessage('noPlanMessage');
      document.getElementById('btnCreerPlan').classList.remove('d-none');
    } else {
      console.error('Erreur chargement plan:', error);
      showToast('Erreur lors du chargement du plan', 'danger');
    }
  }
}

/**
 * Affiche un message (cache les autres)
 */
function showMessage(messageId) {
  ['selectSiteMessage', 'noPlanMessage', 'editorContainer'].forEach(id => {
    document.getElementById(id).classList.add('d-none');
  });
  document.getElementById(messageId).classList.remove('d-none');
  document.getElementById('btnCreerPlan').classList.add('d-none');
}

/**
 * Charge un plan dans l'editeur
 */
function loadPlan(plan) {
  PlanEditor.plan = plan;
  PlanEditor.hasUnsavedChanges = false;

  // Afficher l'editeur
  showMessage('editorContainer');

  // Mettre a jour les parametres
  document.getElementById('planNom').value = plan.nom || '';
  document.getElementById('planLargeur').value = plan.largeur_defaut || 1200;
  document.getElementById('planHauteur').value = plan.hauteur_defaut || 800;
  document.getElementById('planTailleGrille').value = plan.taille_grille || 20;
  document.getElementById('tailleGrilleValue').textContent = plan.taille_grille || 20;
  document.getElementById('planAfficherGrille').checked = plan.afficher_grille !== false;
  document.getElementById('planMagnetisme').checked = plan.magnetisme_grille !== false;

  PlanEditor.gridSize = plan.taille_grille || 20;
  PlanEditor.showGrid = plan.afficher_grille !== false;
  PlanEditor.snapToGrid = plan.magnetisme_grille !== false;

  // Configurer la taille du canvas
  resizeCanvas(plan.largeur_defaut || 1200, plan.hauteur_defaut || 800);

  // Generer les onglets etages
  renderEtagesTabs(plan.etages || []);

  // Charger le premier etage
  if (plan.etages && plan.etages.length > 0) {
    loadEtage(plan.etages[0]);
  }

  // Reset historique
  PlanEditor.history = [];
  PlanEditor.historyIndex = -1;
  updateUndoRedoButtons();
}

/**
 * Cree un nouveau plan pour le site selectionne
 */
async function createPlan() {
  const siteId = document.getElementById('siteSelect').value;
  if (!siteId) return;

  try {
    const site = PlanEditor.sites.find(s => s.id == siteId);
    const plan = await apiRequest('/plans', {
      method: 'POST',
      body: JSON.stringify({
        site_id: parseInt(siteId),
        nom: `Plan ${site.nom}`
      })
    });

    showToast('Plan cree avec succes', 'success');
    loadPlan(plan);
  } catch (error) {
    console.error('Erreur creation plan:', error);
    showToast('Erreur lors de la creation du plan', 'danger');
  }
}

/**
 * Redimensionne le canvas
 */
function resizeCanvas(width, height) {
  PlanEditor.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Mettre a jour le pattern de grille
  const gridPattern = document.getElementById('gridPattern');
  gridPattern.setAttribute('width', PlanEditor.gridSize);
  gridPattern.setAttribute('height', PlanEditor.gridSize);
  gridPattern.querySelector('path').setAttribute('d',
    `M ${PlanEditor.gridSize} 0 L 0 0 0 ${PlanEditor.gridSize}`
  );
}

/**
 * Genere les onglets des etages
 */
function renderEtagesTabs(etages) {
  const tabsContainer = document.getElementById('etagesTabs');
  tabsContainer.innerHTML = '';

  etages.sort((a, b) => a.ordre_affichage - b.ordre_affichage).forEach((etage, index) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <button class="nav-link ${index === 0 ? 'active' : ''}"
              data-etage-id="${etage.id}"
              type="button">
        ${getEtageIcon(etage.type)} ${etage.nom}
      </button>
    `;

    li.querySelector('button').addEventListener('click', () => {
      // Changer l'onglet actif
      tabsContainer.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
      li.querySelector('button').classList.add('active');
      // Charger l'etage
      loadEtage(etage);
    });

    tabsContainer.appendChild(li);
  });
}

/**
 * Retourne l'icone pour un type d'etage
 */
function getEtageIcon(type) {
  const icons = {
    'etage': '<i class="bi bi-layers"></i>',
    'annexe': '<i class="bi bi-building"></i>',
    'exterieur': '<i class="bi bi-tree"></i>'
  };
  return icons[type] || icons.etage;
}

/**
 * Charge un etage
 */
function loadEtage(etage) {
  PlanEditor.currentEtage = etage;
  PlanEditor.elements = etage.elements || [];
  PlanEditor.selectedElement = null;

  // Appliquer la couleur de fond
  if (etage.couleur_fond) {
    document.getElementById('canvasContainer').style.backgroundColor = etage.couleur_fond;
  }

  // Vider et redessiner les elements
  clearCanvas();
  renderElements();

  // Deselectionner
  updatePropertiesPanel(null);
}

/**
 * Vide le canvas
 */
function clearCanvas() {
  PlanEditor.elementsGroup.innerHTML = '';
  PlanEditor.selectionGroup.innerHTML = '';
  PlanEditor.drawingGroup.innerHTML = '';
}

/**
 * Dessine tous les elements
 */
function renderElements() {
  // Trier par calque puis ordre
  const sortedElements = [...PlanEditor.elements]
    .filter(e => e.actif !== false)
    .sort((a, b) => {
      if (a.calque !== b.calque) return a.calque - b.calque;
      return a.ordre_affichage - b.ordre_affichage;
    });

  sortedElements.forEach(element => {
    renderElement(element);
  });
}

/**
 * Dessine un element
 */
function renderElement(element) {
  const svgElement = createSVGElement(element);
  if (svgElement) {
    svgElement.dataset.elementId = element.id;
    svgElement.classList.add('plan-element');
    svgElement.style.cursor = 'move';

    // Ajouter les events
    svgElement.addEventListener('mousedown', (e) => {
      if (PlanEditor.currentTool === 'select') {
        e.stopPropagation();
        selectElement(element);
        startDragging(e, element);
      }
    });

    PlanEditor.elementsGroup.appendChild(svgElement);
  }
}

/**
 * Cree l'element SVG correspondant
 */
function createSVGElement(element) {
  const { type_element, points, style, libelle, rotation } = element;
  let svgEl;

  switch (type_element) {
    case 'mur':
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      if (points.length >= 2) {
        svgEl.setAttribute('x1', points[0].x);
        svgEl.setAttribute('y1', points[0].y);
        svgEl.setAttribute('x2', points[1].x);
        svgEl.setAttribute('y2', points[1].y);
      }
      svgEl.classList.add('element-mur');
      break;

    case 'etagere':
    case 'meuble':
    case 'table':
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      if (points.length >= 2) {
        const minX = Math.min(points[0].x, points[1].x);
        const minY = Math.min(points[0].y, points[1].y);
        const width = Math.abs(points[1].x - points[0].x);
        const height = Math.abs(points[1].y - points[0].y);
        svgEl.setAttribute('x', minX);
        svgEl.setAttribute('y', minY);
        svgEl.setAttribute('width', width);
        svgEl.setAttribute('height', height);
      }
      svgEl.classList.add(`element-${type_element}`);
      break;

    case 'zone':
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
      svgEl.setAttribute('points', pointsStr);
      svgEl.classList.add('element-zone');
      break;

    default:
      return null;
  }

  // Appliquer le style
  if (style) {
    if (style.couleur) svgEl.style.stroke = style.couleur;
    if (style.epaisseur) svgEl.style.strokeWidth = style.epaisseur;
    if (style.remplissage) svgEl.style.fill = style.remplissage;
    if (style.opacite !== undefined) {
      if (type_element === 'mur') {
        svgEl.style.strokeOpacity = style.opacite;
      } else {
        svgEl.style.fillOpacity = style.opacite;
      }
    }
    if (style.dashArray) svgEl.style.strokeDasharray = style.dashArray;
  }

  // Rotation
  if (rotation) {
    const bbox = getBoundingBox(points);
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    svgEl.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`);
  }

  // Ajouter le libelle
  if (libelle) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.appendChild(svgEl);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const bbox = getBoundingBox(points);
    text.setAttribute('x', bbox.x + bbox.width / 2);
    text.setAttribute('y', bbox.y + bbox.height / 2);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#333');
    text.setAttribute('pointer-events', 'none');
    text.textContent = libelle;
    group.appendChild(text);

    return group;
  }

  return svgEl;
}

/**
 * Calcule la bounding box d'un ensemble de points
 */
function getBoundingBox(points) {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Selectionne un element
 */
function selectElement(element) {
  // Deselectionner l'ancien
  if (PlanEditor.selectedElement) {
    const oldEl = PlanEditor.elementsGroup.querySelector(`[data-element-id="${PlanEditor.selectedElement.id}"]`);
    if (oldEl) oldEl.classList.remove('element-selected');
  }

  PlanEditor.selectedElement = element;

  if (element) {
    const svgEl = PlanEditor.elementsGroup.querySelector(`[data-element-id="${element.id}"]`);
    if (svgEl) svgEl.classList.add('element-selected');

    // Afficher les poignees de selection
    renderSelectionHandles(element);
  } else {
    PlanEditor.selectionGroup.innerHTML = '';
  }

  updatePropertiesPanel(element);
}

/**
 * Dessine les poignees de selection
 */
function renderSelectionHandles(element) {
  PlanEditor.selectionGroup.innerHTML = '';

  if (!element) return;

  // Ne pas afficher les poignees pour les murs (lignes)
  if (element.type_element === 'mur') {
    renderLineHandles(element);
    return;
  }

  const bbox = getBoundingBox(element.points);

  // Rectangle de selection
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', bbox.x - 5);
  rect.setAttribute('y', bbox.y - 5);
  rect.setAttribute('width', bbox.width + 10);
  rect.setAttribute('height', bbox.height + 10);
  rect.classList.add('selection-box');
  PlanEditor.selectionGroup.appendChild(rect);

  // Poignees aux coins (dans l'ordre: NW, NE, SE, SW)
  const handlePositions = [
    { x: bbox.x, y: bbox.y, cursor: 'nw-resize', corner: 'nw' },
    { x: bbox.x + bbox.width, y: bbox.y, cursor: 'ne-resize', corner: 'ne' },
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height, cursor: 'se-resize', corner: 'se' },
    { x: bbox.x, y: bbox.y + bbox.height, cursor: 'sw-resize', corner: 'sw' }
  ];

  handlePositions.forEach((pos, i) => {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle.setAttribute('x', pos.x - 5);
    handle.setAttribute('y', pos.y - 5);
    handle.setAttribute('width', 10);
    handle.setAttribute('height', 10);
    handle.classList.add('selection-handle');
    handle.style.cursor = pos.cursor;
    handle.dataset.handleIndex = i;
    handle.dataset.corner = pos.corner;

    // Ajouter les evenements de redimensionnement
    handle.addEventListener('mousedown', (e) => startResize(e, element, pos.corner));

    PlanEditor.selectionGroup.appendChild(handle);
  });
}

/**
 * Dessine les poignees pour les lignes (murs)
 */
function renderLineHandles(element) {
  if (!element.points || element.points.length < 2) return;

  element.points.forEach((point, i) => {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', point.x);
    handle.setAttribute('cy', point.y);
    handle.setAttribute('r', 6);
    handle.classList.add('selection-handle');
    handle.style.cursor = 'move';
    handle.dataset.pointIndex = i;

    handle.addEventListener('mousedown', (e) => startMovePoint(e, element, i));

    PlanEditor.selectionGroup.appendChild(handle);
  });
}

/**
 * Demarre le redimensionnement d'un element
 */
function startResize(e, element, corner) {
  e.stopPropagation();
  e.preventDefault();

  const startPoint = getCanvasPointFromEvent(e);
  const startBbox = getBoundingBox(element.points);

  PlanEditor.resizing = {
    element,
    corner,
    startPoint,
    startBbox,
    startPoints: JSON.parse(JSON.stringify(element.points))
  };

  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
}

/**
 * Pendant le redimensionnement
 */
function onResizeMove(e) {
  if (!PlanEditor.resizing) return;

  const { element, corner, startPoint, startBbox, startPoints } = PlanEditor.resizing;
  const currentPoint = getCanvasPointFromEvent(e);

  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;

  let newPoints = [];

  // Calculer les nouvelles positions selon le coin
  switch (corner) {
    case 'nw':
      newPoints = [
        { x: startPoints[0].x + dx, y: startPoints[0].y + dy },
        { x: startPoints[1].x, y: startPoints[1].y }
      ];
      break;
    case 'ne':
      newPoints = [
        { x: startPoints[0].x, y: startPoints[0].y + dy },
        { x: startPoints[1].x + dx, y: startPoints[1].y }
      ];
      break;
    case 'se':
      newPoints = [
        { x: startPoints[0].x, y: startPoints[0].y },
        { x: startPoints[1].x + dx, y: startPoints[1].y + dy }
      ];
      break;
    case 'sw':
      newPoints = [
        { x: startPoints[0].x + dx, y: startPoints[0].y },
        { x: startPoints[1].x, y: startPoints[1].y + dy }
      ];
      break;
  }

  // Appliquer le magnetisme
  if (PlanEditor.snapToGrid) {
    newPoints = newPoints.map(p => ({
      x: Math.round(p.x / PlanEditor.gridSize) * PlanEditor.gridSize,
      y: Math.round(p.y / PlanEditor.gridSize) * PlanEditor.gridSize
    }));
  }

  // Mettre a jour l'element
  element.points = newPoints;

  // Re-render l'element
  rerenderElement(element);
  renderSelectionHandles(element);
}

/**
 * Fin du redimensionnement
 */
function onResizeEnd(e) {
  if (PlanEditor.resizing) {
    PlanEditor.hasUnsavedChanges = true;
    saveHistory();
  }

  PlanEditor.resizing = null;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
}

/**
 * Demarre le deplacement d'un point (pour les lignes)
 */
function startMovePoint(e, element, pointIndex) {
  e.stopPropagation();
  e.preventDefault();

  PlanEditor.movingPoint = {
    element,
    pointIndex,
    startPoint: getCanvasPointFromEvent(e)
  };

  document.addEventListener('mousemove', onMovePointMove);
  document.addEventListener('mouseup', onMovePointEnd);
}

/**
 * Pendant le deplacement d'un point
 */
function onMovePointMove(e) {
  if (!PlanEditor.movingPoint) return;

  const { element, pointIndex } = PlanEditor.movingPoint;
  let newPoint = getCanvasPointFromEvent(e);

  // Le magnetisme est deja applique dans getCanvasPointFromEvent

  element.points[pointIndex] = newPoint;

  rerenderElement(element);
  renderSelectionHandles(element);
}

/**
 * Fin du deplacement d'un point
 */
function onMovePointEnd(e) {
  if (PlanEditor.movingPoint) {
    PlanEditor.hasUnsavedChanges = true;
    saveHistory();
  }

  PlanEditor.movingPoint = null;
  document.removeEventListener('mousemove', onMovePointMove);
  document.removeEventListener('mouseup', onMovePointEnd);
}

/**
 * Demarre le drag d'un element complet
 */
function startDragging(e, element) {
  if (element.verrouille) return;

  e.preventDefault();

  const startPoint = getCanvasPointFromEvent(e, false);

  PlanEditor.dragging = {
    element,
    startPoint,
    startPoints: JSON.parse(JSON.stringify(element.points))
  };

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

/**
 * Pendant le drag
 */
function onDragMove(e) {
  if (!PlanEditor.dragging) return;

  const { element, startPoint, startPoints } = PlanEditor.dragging;
  const currentPoint = getCanvasPointFromEvent(e, false);

  // Calculer le delta
  let dx = currentPoint.x - startPoint.x;
  let dy = currentPoint.y - startPoint.y;

  // Appliquer le snap au delta
  if (PlanEditor.snapToGrid) {
    dx = Math.round(dx / PlanEditor.gridSize) * PlanEditor.gridSize;
    dy = Math.round(dy / PlanEditor.gridSize) * PlanEditor.gridSize;
  }

  // Deplacer tous les points
  element.points = startPoints.map(p => ({
    x: p.x + dx,
    y: p.y + dy
  }));

  // Re-render
  rerenderElement(element);
  renderSelectionHandles(element);
}

/**
 * Fin du drag
 */
function onDragEnd(e) {
  if (PlanEditor.dragging) {
    PlanEditor.hasUnsavedChanges = true;
    saveHistory();
  }

  PlanEditor.dragging = null;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

/**
 * Obtient les coordonnees canvas depuis un evenement (global)
 * Utilise la matrice de transformation inverse du SVG
 */
function getCanvasPointFromEvent(e, applySnap = true) {
  const svg = PlanEditor.svg;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;

  // Utiliser la matrice de transformation inverse pour convertir
  const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

  let x = svgPoint.x;
  let y = svgPoint.y;

  if (applySnap && PlanEditor.snapToGrid) {
    x = Math.round(x / PlanEditor.gridSize) * PlanEditor.gridSize;
    y = Math.round(y / PlanEditor.gridSize) * PlanEditor.gridSize;
  }

  return { x, y };
}

/**
 * Re-render un element specifique
 */
function rerenderElement(element) {
  const oldEl = PlanEditor.elementsGroup.querySelector(`[data-element-id="${element.id}"]`);
  if (oldEl) {
    const newEl = createSVGElement(element);
    if (newEl) {
      newEl.dataset.elementId = element.id;
      newEl.classList.add('plan-element');
      newEl.style.cursor = 'move';

      newEl.addEventListener('mousedown', (e) => {
        if (PlanEditor.currentTool === 'select') {
          e.stopPropagation();
          selectElement(element);
          startDragging(e, element);
        }
      });

      oldEl.replaceWith(newEl);

      if (PlanEditor.selectedElement?.id === element.id) {
        newEl.classList.add('element-selected');
      }
    }
  }
}

/**
 * Met a jour le panneau de proprietes
 */
function updatePropertiesPanel(element) {
  const noSelection = document.getElementById('noSelection');
  const elementProps = document.getElementById('elementProps');
  const noElementForEmplacement = document.getElementById('noElementForEmplacement');
  const elementEmplacements = document.getElementById('elementEmplacements');

  if (!element) {
    noSelection.classList.remove('d-none');
    elementProps.classList.add('d-none');
    noElementForEmplacement.classList.remove('d-none');
    elementEmplacements.classList.add('d-none');
    return;
  }

  noSelection.classList.add('d-none');
  elementProps.classList.remove('d-none');
  noElementForEmplacement.classList.add('d-none');
  elementEmplacements.classList.remove('d-none');

  // Remplir les champs
  document.getElementById('propType').value = element.type_element;
  document.getElementById('propLibelle').value = element.libelle || '';
  document.getElementById('propDescription').value = element.description || '';
  document.getElementById('propCouleur').value = element.style?.couleur || '#333333';
  document.getElementById('propRemplissage').value = element.style?.remplissage || '#ffffff';
  document.getElementById('propEpaisseur').value = element.style?.epaisseur || 2;
  document.getElementById('propOpacite').value = (element.style?.opacite || 1) * 100;
  document.getElementById('propCalque').value = element.calque || 0;
  document.getElementById('propVisible').checked = element.visible_public !== false;
  document.getElementById('propVerrouille').checked = element.verrouille === true;

  // Charger les emplacements lies
  renderEmplacementsLies(element);
}

/**
 * Affiche les emplacements lies a l'element
 */
function renderEmplacementsLies(element) {
  const container = document.getElementById('listeEmplacements');
  container.innerHTML = '';

  if (!element.emplacements || element.emplacements.length === 0) {
    container.innerHTML = '<div class="text-muted small">Aucun emplacement lie</div>';
    return;
  }

  element.emplacements.forEach(emp => {
    let nom = emp.libelle_override;
    let type = emp.type_collection;
    let couleur = '#6c757d';
    let icone = 'geo-alt';
    let badgeClass = 'bg-secondary';

    // Recuperer les infos de l'emplacement selon le type
    let emplacementData = null;
    switch (type) {
      case 'jeu':
        emplacementData = emp.emplacementJeu;
        badgeClass = 'bg-warning text-dark';
        break;
      case 'livre':
        emplacementData = emp.emplacementLivre;
        badgeClass = 'bg-primary';
        break;
      case 'film':
        emplacementData = emp.emplacementFilm;
        badgeClass = 'bg-danger';
        break;
      case 'disque':
        emplacementData = emp.emplacementDisque;
        badgeClass = 'bg-success';
        break;
    }

    if (emplacementData) {
      nom = nom || emplacementData.libelle;
      couleur = emplacementData.couleur || '#6c757d';
      icone = emplacementData.icone || 'geo-alt';
    }

    const div = document.createElement('div');
    div.className = 'emplacement-item';
    div.innerHTML = `
      <span class="d-flex align-items-center gap-2">
        <span class="color-dot" style="background-color: ${couleur}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.2);"></span>
        <i class="bi bi-${icone}" style="color: ${couleur};"></i>
        <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${type}</span>
        <span class="text-truncate" style="max-width: 120px;">${nom || 'Sans nom'}</span>
      </span>
      <button class="btn btn-link btn-sm btn-remove p-0" data-emp-id="${emp.id}" title="Retirer">
        <i class="bi bi-x-lg text-danger"></i>
      </button>
    `;

    div.querySelector('.btn-remove').addEventListener('click', () => removeEmplacement(emp.id));
    container.appendChild(div);
  });
}

/**
 * Supprime une liaison emplacement
 */
async function removeEmplacement(emplacementId) {
  const result = await Swal.fire({
    title: 'Retirer cette liaison ?',
    text: 'L\'emplacement ne sera plus associe a cet element.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Oui, retirer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiRequest(`/plans/emplacements/${emplacementId}`, { method: 'DELETE' });

    // Mettre a jour localement
    if (PlanEditor.selectedElement) {
      PlanEditor.selectedElement.emplacements =
        PlanEditor.selectedElement.emplacements.filter(e => e.id !== emplacementId);
      renderEmplacementsLies(PlanEditor.selectedElement);
    }

    showToast('Liaison supprimee', 'success');
  } catch (error) {
    console.error('Erreur suppression emplacement:', error);
    showToast('Erreur lors de la suppression', 'danger');
  }
}

/**
 * Affiche les templates
 */
function renderTemplates() {
  const container = document.getElementById('templatesList');
  container.innerHTML = '';

  PlanEditor.templates.forEach(template => {
    const div = document.createElement('div');
    div.className = 'template-card';
    div.innerHTML = `
      <div class="template-name">${template.nom}</div>
      <div class="template-desc">${template.description}</div>
    `;
    div.addEventListener('click', () => applyTemplate(template.id));
    container.appendChild(div);
  });
}

/**
 * Applique un template
 */
async function applyTemplate(templateId) {
  if (!PlanEditor.currentEtage) {
    showToast('Selectionnez d\'abord un etage', 'warning');
    return;
  }

  const result = await Swal.fire({
    title: 'Appliquer le template ?',
    text: 'Voulez-vous effacer les elements existants ?',
    icon: 'question',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Oui, tout remplacer',
    denyButtonText: 'Non, ajouter',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#d33',
    denyButtonColor: '#3085d6'
  });

  if (result.isDismissed) return;

  const clearExisting = result.isConfirmed;

  try {
    const apiResult = await apiRequest(`/plans/etages/${PlanEditor.currentEtage.id}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId, clearExisting })
    });

    showToast(apiResult.message, 'success');

    // Recharger l'etage
    await reloadCurrentEtage();
  } catch (error) {
    console.error('Erreur application template:', error);
    showToast('Erreur lors de l\'application du template', 'danger');
  }
}

/**
 * Recharge l'etage courant
 */
async function reloadCurrentEtage() {
  if (!PlanEditor.plan) return;

  try {
    const plan = await apiRequest(`/plans/${PlanEditor.plan.id}`);
    PlanEditor.plan = plan;

    const etage = plan.etages.find(e => e.id === PlanEditor.currentEtage.id);
    if (etage) {
      loadEtage(etage);
    }
  } catch (error) {
    console.error('Erreur rechargement:', error);
  }
}

/**
 * Sauvegarde les elements
 */
async function saveElements() {
  if (!PlanEditor.currentEtage) return;

  try {
    await apiRequest(`/plans/etages/${PlanEditor.currentEtage.id}/elements/batch`, {
      method: 'POST',
      body: JSON.stringify({ elements: PlanEditor.elements })
    });

    PlanEditor.hasUnsavedChanges = false;
    showToast('Sauvegarde effectuee', 'success');
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

/**
 * Met a jour les boutons undo/redo
 */
function updateUndoRedoButtons() {
  document.getElementById('btnUndo').disabled = PlanEditor.historyIndex <= 0;
  document.getElementById('btnRedo').disabled = PlanEditor.historyIndex >= PlanEditor.history.length - 1;
}

/**
 * Ajoute un etat a l'historique
 */
function pushHistory() {
  // Supprimer les etats apres l'index courant
  PlanEditor.history = PlanEditor.history.slice(0, PlanEditor.historyIndex + 1);

  // Ajouter l'etat courant
  PlanEditor.history.push(JSON.stringify(PlanEditor.elements));

  // Limiter la taille
  if (PlanEditor.history.length > PlanEditor.maxHistory) {
    PlanEditor.history.shift();
  } else {
    PlanEditor.historyIndex++;
  }

  updateUndoRedoButtons();
  PlanEditor.hasUnsavedChanges = true;
}

/**
 * Sauvegarde l'etat actuel dans l'historique
 */
function saveHistory() {
  // Supprimer les etats apres l'index actuel (on refait une branche)
  if (PlanEditor.historyIndex < PlanEditor.history.length - 1) {
    PlanEditor.history = PlanEditor.history.slice(0, PlanEditor.historyIndex + 1);
  }

  // Ajouter l'etat actuel
  const state = JSON.stringify(PlanEditor.elements);
  PlanEditor.history.push(state);

  // Limiter la taille de l'historique
  if (PlanEditor.history.length > PlanEditor.maxHistory) {
    PlanEditor.history.shift();
  } else {
    PlanEditor.historyIndex++;
  }

  updateUndoRedoButtons();
}

/**
 * Undo
 */
function undo() {
  if (PlanEditor.historyIndex > 0) {
    PlanEditor.historyIndex--;
    PlanEditor.elements = JSON.parse(PlanEditor.history[PlanEditor.historyIndex]);
    clearCanvas();
    renderElements();
    selectElement(null);
    updateUndoRedoButtons();
  }
}

/**
 * Redo
 */
function redo() {
  if (PlanEditor.historyIndex < PlanEditor.history.length - 1) {
    PlanEditor.historyIndex++;
    PlanEditor.elements = JSON.parse(PlanEditor.history[PlanEditor.historyIndex]);
    clearCanvas();
    renderElements();
    selectElement(null);
    updateUndoRedoButtons();
  }
}

/**
 * Affiche un toast
 */
function showToast(message, type = 'info') {
  // Utiliser la fonction globale si disponible
  if (typeof showNotification === 'function') {
    showNotification(message, type);
  } else {
    console.log(`[${type}] ${message}`);
    alert(message);
  }
}

/**
 * Configure les raccourcis clavier
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignorer si dans un champ de saisie
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    // Ctrl+S : Sauvegarder
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveElements();
    }

    // Ctrl+Z : Undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }

    // Ctrl+Y : Redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }

    // V : Selection
    if (e.key === 'v') selectTool('select');

    // H : Pan
    if (e.key === 'h') selectTool('pan');

    // W : Mur
    if (e.key === 'w') selectTool('mur');

    // E : Etagere
    if (e.key === 'e') selectTool('etagere');

    // M : Meuble
    if (e.key === 'm') selectTool('meuble');

    // T : Table
    if (e.key === 't') selectTool('table');

    // Z : Zone
    if (e.key === 'z' && !e.ctrlKey) selectTool('zone');

    // Delete/Backspace : Supprimer element selectionne
    if ((e.key === 'Delete' || e.key === 'Backspace') && PlanEditor.selectedElement) {
      e.preventDefault();
      deleteSelectedElement();
    }

    // Escape : Deselectionner / Annuler dessin
    if (e.key === 'Escape') {
      if (PlanEditor.isDrawing) {
        cancelDrawing();
      } else {
        selectElement(null);
      }
    }
  });
}

/**
 * Selectionne un outil
 */
function selectTool(tool) {
  PlanEditor.currentTool = tool;

  // Mettre a jour l'UI
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Changer le curseur
  PlanEditor.svg.classList.remove('tool-select', 'tool-pan');
  if (tool === 'select') PlanEditor.svg.classList.add('tool-select');
  if (tool === 'pan') PlanEditor.svg.classList.add('tool-pan');

  // Annuler le dessin en cours
  if (PlanEditor.isDrawing) {
    cancelDrawing();
  }
}

/**
 * Supprime l'element selectionne
 */
async function deleteSelectedElement() {
  if (!PlanEditor.selectedElement) return;

  if (PlanEditor.selectedElement.verrouille) {
    showToast('Cet element est verrouille', 'warning');
    return;
  }

  pushHistory();

  // Supprimer localement
  PlanEditor.elements = PlanEditor.elements.filter(e => e.id !== PlanEditor.selectedElement.id);

  // Supprimer sur le serveur
  try {
    await apiRequest(`/plans/elements/${PlanEditor.selectedElement.id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Erreur suppression:', error);
  }

  // Redessiner
  clearCanvas();
  renderElements();
  selectElement(null);
}

/**
 * Annule le dessin en cours
 */
function cancelDrawing() {
  PlanEditor.isDrawing = false;
  PlanEditor.drawingPoints = [];
  PlanEditor.drawingGroup.innerHTML = '';
}
