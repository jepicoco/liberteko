/**
 * Arbre Tarif Renderer
 * Gere le rendu visuel de l'arbre de decision avec connexions LeaderLine
 */

class ArbreTarifRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.lines = [];
    this.startNode = null;
    this.endNode = null;
    this.resizeObserver = null;
    this.resizeTimeout = null;

    this.setupResizeObserver();
  }

  // ============================================================
  // CONFIGURATION
  // ============================================================

  static get LINE_OPTIONS() {
    return {
      color: '#6c757d',
      size: 2,
      path: 'fluid',
      startSocket: 'right',
      endSocket: 'left',
      startSocketGravity: 50,
      endSocketGravity: 50,
      dash: false
    };
  }

  static get COLORS() {
    return {
      flow: '#6c757d',
      active: '#28a745',
      reduction: '#17a2b8',
      parallel: '#ffc107'
    };
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  setupResizeObserver() {
    // Redessiner les lignes quand le container change de taille
    this.resizeObserver = new ResizeObserver(() => {
      // Debounce pour eviter trop de redraws
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.updateLines(), 100);
    });

    if (this.container) {
      this.resizeObserver.observe(this.container);
    }
  }

  destroy() {
    this.clearLines();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.startNode) {
      this.startNode.remove();
      this.startNode = null;
    }
    if (this.endNode) {
      this.endNode.remove();
      this.endNode = null;
    }
  }

  // ============================================================
  // RENDU DES NOEUDS SPECIAUX
  // ============================================================

  createStartNode(montantBase) {
    if (this.startNode) {
      this.startNode.remove();
    }

    const node = document.createElement('div');
    node.className = 'arbre-node-special arbre-node-start';
    node.id = 'arbre-start-node';
    node.innerHTML = `
      <div class="node-icon">
        <i class="bi bi-play-circle-fill"></i>
      </div>
      <div class="node-label">Depart</div>
      <div class="node-value">${montantBase} EUR</div>
    `;

    this.container.insertBefore(node, this.container.firstChild);
    this.startNode = node;
    return node;
  }

  createEndNode(bornesMin, bornesMax, modeAffichage) {
    if (this.endNode) {
      this.endNode.remove();
    }

    const node = document.createElement('div');
    node.className = 'arbre-node-special arbre-node-end';
    node.id = 'arbre-end-node';

    let displayValue;
    if (modeAffichage === 'minimum') {
      displayValue = `A partir de ${bornesMin} EUR`;
    } else {
      displayValue = `${bornesMax} EUR*`;
    }

    node.innerHTML = `
      <div class="node-icon">
        <i class="bi bi-check-circle-fill"></i>
      </div>
      <div class="node-label">Resultat</div>
      <div class="node-value">${displayValue}</div>
    `;

    this.container.appendChild(node);
    this.endNode = node;
    return node;
  }

  // ============================================================
  // CONNEXIONS
  // ============================================================

  clearLines() {
    this.lines.forEach(line => {
      try {
        line.remove();
      } catch (e) {
        // Ignore errors if line was already removed
      }
    });
    this.lines = [];
  }

  updateLines() {
    this.clearLines();
    this.drawConnections();
  }

  drawConnections() {
    // Verifier que LeaderLine est disponible
    if (typeof LeaderLine === 'undefined') {
      console.warn('LeaderLine not loaded');
      return;
    }

    const cards = this.container.querySelectorAll('.noeud-card');
    if (cards.length === 0) return;

    const cardsArray = Array.from(cards);

    // Connexion Start -> Premier noeud
    if (this.startNode && cardsArray[0]) {
      this.drawLine(this.startNode, cardsArray[0], {
        color: ArbreTarifRenderer.COLORS.flow,
        startSocket: 'right',
        endSocket: 'left'
      });
    }

    // Connexions entre noeuds (evaluation cumulative = tous en sequence)
    for (let i = 0; i < cardsArray.length - 1; i++) {
      this.drawLine(cardsArray[i], cardsArray[i + 1], {
        color: ArbreTarifRenderer.COLORS.flow,
        startSocket: 'right',
        endSocket: 'left'
      });
    }

    // Connexion Dernier noeud -> End
    if (this.endNode && cardsArray.length > 0) {
      this.drawLine(cardsArray[cardsArray.length - 1], this.endNode, {
        color: ArbreTarifRenderer.COLORS.flow,
        startSocket: 'right',
        endSocket: 'left'
      });
    }

    // Ajouter des indicateurs visuels de cumul
    this.addCumulativeIndicators(cardsArray);
  }

  drawLine(startElement, endElement, options = {}) {
    try {
      const lineOptions = {
        ...ArbreTarifRenderer.LINE_OPTIONS,
        ...options
      };

      const line = new LeaderLine(startElement, endElement, lineOptions);
      this.lines.push(line);
      return line;
    } catch (e) {
      console.error('Error drawing line:', e);
      return null;
    }
  }

  addCumulativeIndicators(cards) {
    // Ajouter un badge "+" entre les noeuds pour indiquer le cumul
    cards.forEach((card, index) => {
      // Supprimer les indicateurs existants
      const existing = card.querySelector('.cumulative-indicator');
      if (existing) existing.remove();

      if (index < cards.length - 1) {
        const indicator = document.createElement('div');
        indicator.className = 'cumulative-indicator';
        indicator.innerHTML = '<i class="bi bi-plus-circle-fill"></i>';
        indicator.title = 'Reductions cumulees';
        card.appendChild(indicator);
      }
    });
  }

  // ============================================================
  // ANIMATION
  // ============================================================

  highlightPath(noeudIds) {
    // Mettre en surbrillance le chemin parcouru
    const cards = this.container.querySelectorAll('.noeud-card');

    cards.forEach(card => {
      const noeudId = card.dataset.noeudId;
      if (noeudIds.includes(noeudId)) {
        card.classList.add('highlight');
      } else {
        card.classList.remove('highlight');
      }
    });

    // Colorer les lignes du chemin
    this.lines.forEach((line, index) => {
      if (index < noeudIds.length) {
        line.setOptions({ color: ArbreTarifRenderer.COLORS.active });
      } else {
        line.setOptions({ color: ArbreTarifRenderer.COLORS.flow });
      }
    });
  }

  resetHighlight() {
    const cards = this.container.querySelectorAll('.noeud-card');
    cards.forEach(card => card.classList.remove('highlight'));

    this.lines.forEach(line => {
      line.setOptions({ color: ArbreTarifRenderer.COLORS.flow });
    });
  }

  animateEvaluation(chemin, callback) {
    // Animation sequentielle du chemin d'evaluation
    if (!chemin || chemin.length === 0) {
      if (callback) callback();
      return;
    }

    let currentIndex = 0;
    const noeudIds = chemin.map(c => c.noeud_id);

    const animateNext = () => {
      if (currentIndex >= noeudIds.length) {
        if (callback) callback();
        return;
      }

      const highlightIds = noeudIds.slice(0, currentIndex + 1);
      this.highlightPath(highlightIds);

      currentIndex++;
      setTimeout(animateNext, 500);
    };

    animateNext();
  }

  // ============================================================
  // LAYOUT HELPERS
  // ============================================================

  arrangeCards(mode = 'horizontal') {
    const cards = this.container.querySelectorAll('.noeud-card');

    if (mode === 'horizontal') {
      // Disposition horizontale (par defaut)
      this.container.style.display = 'flex';
      this.container.style.flexWrap = 'nowrap';
      this.container.style.overflowX = 'auto';
      this.container.style.gap = '80px'; // Espace pour les lignes
    } else if (mode === 'grid') {
      // Disposition en grille
      this.container.style.display = 'grid';
      this.container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
      this.container.style.gap = '40px';
    }

    // Mettre a jour les lignes apres le layout
    setTimeout(() => this.updateLines(), 50);
  }

  // ============================================================
  // RENDU COMPLET
  // ============================================================

  render(arbre, typesCondition, montantBase) {
    if (!arbre || !arbre.arbre_json) return;

    const noeuds = arbre.arbre_json.noeuds || [];

    // Calculer les bornes
    let reductionMax = 0;
    for (const noeud of noeuds) {
      let maxNoeud = 0;
      for (const branche of noeud.branches || []) {
        if (branche.reduction) {
          const val = branche.reduction.valeur || 0;
          if (branche.reduction.type_calcul === 'pourcentage') {
            maxNoeud = Math.max(maxNoeud, montantBase * val / 100);
          } else {
            maxNoeud = Math.max(maxNoeud, val);
          }
        }
      }
      reductionMax += maxNoeud;
    }

    const bornesMin = Math.max(0, montantBase - reductionMax);
    const bornesMax = montantBase;

    // Creer les noeuds speciaux
    if (noeuds.length > 0) {
      this.createStartNode(montantBase);
      this.createEndNode(bornesMin, bornesMax, arbre.mode_affichage);
    }

    // Dessiner les connexions apres que le DOM soit mis a jour
    requestAnimationFrame(() => {
      setTimeout(() => this.drawConnections(), 100);
    });
  }

  // ============================================================
  // POSITION LINES (for scroll handling)
  // ============================================================

  repositionLines() {
    this.lines.forEach(line => {
      try {
        line.position();
      } catch (e) {
        // Ignore
      }
    });
  }
}

// Export pour utilisation globale
window.ArbreTarifRenderer = ArbreTarifRenderer;
