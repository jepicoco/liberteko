/**
 * Scanner Validation Components
 * Composants UI pour la validation des emprunts avec affichage des limites
 */

// ==================== API HELPERS ====================

/**
 * Recupere le statut complet de l'utilisateur pour le scanner
 */
async function fetchUserStatus(utilisateurId, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/scanner/user-status/${utilisateurId}?structure_id=${structureId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur fetchUserStatus:', error);
    return null;
  }
}

/**
 * Valide un emprunt avant creation
 */
async function validateLoan(utilisateurId, articleId, articleType, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/validate-loan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        utilisateur_id: utilisateurId,
        article_id: articleId,
        article_type: articleType,
        structure_id: structureId
      })
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur validateLoan:', error);
    return { canProceed: false, blocking: [{ type: 'erreur_api', message: error.message }] };
  }
}

/**
 * Envoie un rappel cotisation/adhesion
 */
async function sendReminder(utilisateurId, type, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/send-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        utilisateur_id: utilisateurId,
        type,
        structure_id: structureId
      })
    });
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur sendReminder:', error);
    return { success: false, message: error.message };
  }
}

// ==================== UI COMPONENTS ====================

/**
 * Genere le HTML pour une jauge de limite
 */
function renderLimitGauge(current, max, label, isBlocking = true) {
  if (max === null || max === undefined) return '';

  const percentage = Math.min((current / max) * 100, 100);
  let colorClass = 'bg-success';
  let textClass = '';

  if (percentage >= 100) {
    colorClass = 'bg-danger';
    textClass = 'text-danger fw-bold';
  } else if (percentage >= 80) {
    colorClass = 'bg-warning';
    textClass = 'text-warning';
  } else if (percentage >= 60) {
    colorClass = 'bg-info';
  }

  const lockIcon = isBlocking ? '<i class="bi bi-lock-fill ms-1" style="font-size: 0.7rem;"></i>' : '';

  return `
    <div class="limit-gauge mb-2">
      <div class="d-flex justify-content-between align-items-center mb-1" style="font-size: 0.8rem;">
        <span class="${textClass}">${label}</span>
        <span class="${textClass}">${current}/${max}${lockIcon}</span>
      </div>
      <div class="progress" style="height: 6px;">
        <div class="progress-bar ${colorClass}" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

/**
 * Genere le badge de cotisation
 */
function renderCotisationBadge(cotisation) {
  if (!cotisation) return '';

  if (!cotisation.required) {
    return `<span class="badge bg-secondary"><i class="bi bi-credit-card"></i> Non requise</span>`;
  }

  if (cotisation.valide) {
    const dateExp = cotisation.dateExpiration ? new Date(cotisation.dateExpiration).toLocaleDateString('fr-FR') : '';
    const daysLeft = cotisation.joursRestants;

    if (daysLeft <= 7) {
      return `
        <span class="badge bg-warning text-dark">
          <i class="bi bi-exclamation-triangle"></i> Cotisation expire dans ${daysLeft}j (${dateExp})
        </span>
      `;
    }
    return `
      <span class="badge bg-success">
        <i class="bi bi-check-circle"></i> Cotisation valide jusqu'au ${dateExp}
      </span>
    `;
  } else {
    const dateExp = cotisation.dateExpiration ? new Date(cotisation.dateExpiration).toLocaleDateString('fr-FR') : '';
    return `
      <span class="badge bg-danger">
        <i class="bi bi-x-circle"></i> Cotisation expiree${dateExp ? ' le ' + dateExp : ''}
      </span>
    `;
  }
}

/**
 * Genere le badge d'adhesion
 */
function renderAdhesionBadge(adhesion) {
  if (!adhesion) return '';

  if (!adhesion.required) {
    return ''; // Ne pas afficher si non requis
  }

  if (adhesion.valide) {
    return `<span class="badge bg-success"><i class="bi bi-building-check"></i> Adhesion OK</span>`;
  } else {
    return `<span class="badge bg-danger"><i class="bi bi-building-x"></i> Adhesion expiree</span>`;
  }
}

/**
 * Affiche les jauges de limite pour un adherent
 */
function renderLimitsPanel(limites) {
  if (!limites || !limites.modules) return '';

  let html = '<div class="limits-panel mt-3" style="font-size: 0.85rem;">';

  for (const [module, data] of Object.entries(limites.modules)) {
    const isAtLimit = data.generale.current >= data.generale.max;
    const cardClass = isAtLimit ? 'border-danger' : 'border-0';

    html += `
      <div class="card ${cardClass} bg-transparent mb-2">
        <div class="card-body py-2 px-3">
          <div class="fw-bold mb-2" style="color: var(--scanner-text);">
            ${getModuleIcon(module)} ${data.label}
          </div>
          ${renderLimitGauge(data.generale.current, data.generale.max, 'Emprunts', data.generale.bloquante)}
          ${renderLimitGauge(data.nouveautes.current, data.nouveautes.max, 'Nouveautes', data.generale.bloquante)}
          ${data.genres.map(g => renderLimitGauge(g.current, g.max, g.nom, data.generale.bloquante)).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

function getModuleIcon(module) {
  const icons = {
    ludotheque: '<i class="bi bi-dice-5 text-success"></i>',
    bibliotheque: '<i class="bi bi-book text-primary"></i>',
    filmotheque: '<i class="bi bi-film text-danger"></i>',
    discotheque: '<i class="bi bi-disc text-warning"></i>'
  };
  return icons[module] || '<i class="bi bi-collection"></i>';
}

/**
 * Affiche un adherent avec ses limites et statuts
 */
async function displayAdherentWithStatus(adherent, structureId) {
  const container = document.getElementById('adherent-display');
  const initials = (adherent.prenom[0] + adherent.nom[0]).toUpperCase();
  const badgeClass = `badge-${adherent.statut}`;

  // Afficher d'abord les infos de base
  container.innerHTML = `
    <div class="adherent-info">
      <div class="adherent-avatar">${initials}</div>
      <div class="adherent-details" style="flex: 1;">
        <h4>${adherent.prenom} ${adherent.nom}</h4>
        <p>${adherent.email || 'Pas d\'email'}</p>
        <span class="badge-statut ${badgeClass}">${adherent.statut}</span>
        <div id="adherent-status-badges" class="mt-2"></div>
      </div>
      <button class="btn-clear-adherent" onclick="clearAdherent()">
        <i class="bi bi-x-lg"></i> Terminer
      </button>
    </div>
    <div id="adherent-limits-panel">
      <div class="text-center py-2" style="color: #888;">
        <i class="bi bi-hourglass-split"></i> Chargement des limites...
      </div>
    </div>
  `;

  // Charger le statut complet en arriere-plan
  const status = await fetchUserStatus(adherent.id, structureId);

  if (status) {
    // Mettre a jour les badges
    const badgesContainer = document.getElementById('adherent-status-badges');
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        ${renderCotisationBadge(status.cotisation)}
        ${renderAdhesionBadge(status.adhesion)}
      `;
    }

    // Mettre a jour les limites
    const limitsContainer = document.getElementById('adherent-limits-panel');
    if (limitsContainer) {
      limitsContainer.innerHTML = renderLimitsPanel(status.limites);
    }
  }
}

// ==================== VALIDATION MODAL ====================

/**
 * Affiche une modal de validation avec les avertissements/blocages
 * @returns {Promise<{proceed: boolean, sendReminders: {cotisation: boolean, adhesion: boolean}, overrideReservation: boolean}>}
 */
function showValidationModal(validation) {
  return new Promise((resolve) => {
    // Determiner le type de modal
    const hasBlocking = validation.blocking && validation.blocking.length > 0;
    const hasWarnings = validation.warnings && validation.warnings.length > 0;
    const hasInfo = validation.info;

    // Si tout va bien, pas de modal
    if (!hasBlocking && !hasWarnings && !hasInfo) {
      resolve({ proceed: true, sendReminders: {}, overrideReservation: false });
      return;
    }

    // Construire le contenu
    let title, iconClass, headerClass;
    if (hasBlocking) {
      title = 'Emprunt impossible';
      iconClass = 'bi-x-circle-fill text-danger';
      headerClass = 'bg-danger text-white';
    } else if (hasWarnings) {
      title = 'Attention';
      iconClass = 'bi-exclamation-triangle-fill text-warning';
      headerClass = 'bg-warning';
    } else {
      title = 'Information';
      iconClass = 'bi-info-circle-fill text-info';
      headerClass = 'bg-info text-white';
    }

    let bodyHtml = '';

    // Article info
    if (validation.article) {
      bodyHtml += `
        <div class="alert alert-secondary py-2 mb-3">
          <strong>${validation.article.titre}</strong>
          ${validation.article.estNouveaute ? '<span class="badge bg-warning text-dark ms-2">Nouveaute</span>' : ''}
        </div>
      `;
    }

    // Blocages
    if (hasBlocking) {
      bodyHtml += '<div class="mb-3"><strong class="text-danger">Blocages :</strong><ul class="mb-0">';
      for (const b of validation.blocking) {
        bodyHtml += `<li class="text-danger"><i class="bi bi-x-circle me-1"></i>${b.message}</li>`;
      }
      bodyHtml += '</ul></div>';
    }

    // Avertissements
    if (hasWarnings) {
      bodyHtml += '<div class="mb-3"><strong class="text-warning">Avertissements :</strong><ul class="mb-0">';
      for (const w of validation.warnings) {
        const canOverride = w.canOverride ? '' : ' (non contournable)';
        bodyHtml += `<li class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>${w.message}${canOverride}</li>`;
      }
      bodyHtml += '</ul></div>';
    }

    // Info
    if (hasInfo) {
      bodyHtml += `<div class="alert alert-info py-2"><i class="bi bi-info-circle me-2"></i>${validation.info}</div>`;
    }

    // Options (rappels)
    const hasRemindableWarnings = validation.warnings?.some(w => w.canSendReminder);
    if (hasRemindableWarnings) {
      bodyHtml += `
        <div class="form-check mt-3">
          <input class="form-check-input" type="checkbox" id="sendReminderCheck">
          <label class="form-check-label" for="sendReminderCheck">
            <i class="bi bi-envelope"></i> Envoyer un rappel par email
          </label>
        </div>
      `;
    }

    // Creer ou recuperer la modal
    let modal = document.getElementById('validationModal');
    if (!modal) {
      const modalHtml = `
        <div class="modal fade" id="validationModal" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header" id="validationModalHeader">
                <h5 class="modal-title" id="validationModalTitle"></h5>
              </div>
              <div class="modal-body" id="validationModalBody"></div>
              <div class="modal-footer" id="validationModalFooter"></div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('validationModal');
    }

    // Mettre a jour le contenu
    document.getElementById('validationModalHeader').className = `modal-header ${headerClass}`;
    document.getElementById('validationModalTitle').innerHTML = `<i class="bi ${iconClass} me-2"></i>${title}`;
    document.getElementById('validationModalBody').innerHTML = bodyHtml;

    // Boutons
    let footerHtml = '';
    if (hasBlocking) {
      // Blocage : seulement fermer
      footerHtml = `<button type="button" class="btn btn-secondary" id="btnValidationClose">Fermer</button>`;
    } else {
      // Avertissements : annuler ou confirmer
      footerHtml = `
        <button type="button" class="btn btn-secondary" id="btnValidationCancel">Annuler</button>
        <button type="button" class="btn btn-warning" id="btnValidationProceed">
          <i class="bi bi-exclamation-triangle me-1"></i>Confirmer quand meme
        </button>
      `;
    }
    document.getElementById('validationModalFooter').innerHTML = footerHtml;

    // Afficher la modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Event listeners
    const closeBtn = document.getElementById('btnValidationClose');
    const cancelBtn = document.getElementById('btnValidationCancel');
    const proceedBtn = document.getElementById('btnValidationProceed');

    function cleanup() {
      bsModal.hide();
      if (closeBtn) closeBtn.removeEventListener('click', handleClose);
      if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
      if (proceedBtn) proceedBtn.removeEventListener('click', handleProceed);
    }

    function handleClose() {
      cleanup();
      resolve({ proceed: false });
    }

    function handleCancel() {
      cleanup();
      resolve({ proceed: false });
    }

    function handleProceed() {
      const sendReminder = document.getElementById('sendReminderCheck')?.checked || false;

      // Determiner quel type de rappel envoyer
      const sendReminders = {
        cotisation: sendReminder && validation.warnings?.some(w => w.type === 'cotisation_expiree'),
        adhesion: sendReminder && validation.warnings?.some(w => w.type === 'adhesion_expiree')
      };

      // Verifier s'il y a une reservation a outrepasser
      const overrideReservation = validation.warnings?.some(w => w.type === 'reserve_autre');

      cleanup();
      resolve({
        proceed: true,
        sendReminders,
        overrideReservation,
        reservationId: validation.reservation?.reservationId
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (proceedBtn) proceedBtn.addEventListener('click', handleProceed);
  });
}

// ==================== INTEGRATION ====================

/**
 * Valide et cree un emprunt avec gestion des avertissements
 * Remplace la fonction createEmprunt originale
 */
async function createEmpruntWithValidation(article, articleType, currentAdherent, structureId) {
  // 1. Valider l'emprunt
  const validation = await validateLoan(currentAdherent.id, article.id, articleType, structureId);

  // 2. Si tout va bien, creer directement
  if (validation.canProceed && !validation.warnings?.length && !validation.info) {
    return { validated: true, proceed: true };
  }

  // 3. Sinon, afficher la modal de validation
  const result = await showValidationModal(validation);

  if (!result.proceed) {
    return { validated: true, proceed: false };
  }

  // 4. Envoyer les rappels si demande
  if (result.sendReminders?.cotisation) {
    await sendReminder(currentAdherent.id, 'cotisation', structureId);
  }
  if (result.sendReminders?.adhesion) {
    await sendReminder(currentAdherent.id, 'adhesion', structureId);
  }

  return {
    validated: true,
    proceed: true,
    overrideReservation: result.overrideReservation,
    reservationId: result.reservationId
  };
}

// Export pour utilisation globale
window.fetchUserStatus = fetchUserStatus;
window.validateLoan = validateLoan;
window.sendReminder = sendReminder;
window.displayAdherentWithStatus = displayAdherentWithStatus;
window.showValidationModal = showValidationModal;
window.createEmpruntWithValidation = createEmpruntWithValidation;
