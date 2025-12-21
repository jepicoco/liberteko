// ============================================
// Logique du formulaire usager amélioré
// ============================================

// Rôles qui peuvent avoir des restrictions de modules
const ROLES_AVEC_MODULES = ['agent', 'benevole', 'gestionnaire', 'comptable'];

// Cache des tags disponibles
let tagsDisponibles = [];

/**
 * Charge les tags disponibles depuis l'API
 */
async function loadTagsDisponibles() {
  try {
    const response = await apiAdmin.get('/parametres/tags-utilisateur/actifs');
    tagsDisponibles = response || [];
    renderTagsCheckboxes();
  } catch (error) {
    console.error('Erreur chargement tags:', error);
    tagsDisponibles = [];
    document.getElementById('tagsContainer').innerHTML =
      '<span class="text-muted small">Aucun tag disponible</span>';
  }
}

/**
 * Affiche les checkboxes de tags avec bouton d'ajout
 */
function renderTagsCheckboxes() {
  const container = document.getElementById('tagsContainer');
  if (!container) return;

  let html = '';

  if (tagsDisponibles.length === 0) {
    html = '<span class="text-muted small">Aucun tag disponible</span>';
  } else {
    html = tagsDisponibles.map(tag => `
      <div>
        <input type="checkbox" class="tag-checkbox" id="tag_${tag.id}" value="${tag.id}">
        <label for="tag_${tag.id}" class="tag-label" style="--tag-color: ${tag.couleur};">
          <i class="bi ${tag.icone || 'bi-tag'}"></i>
          ${escapeHtml(tag.libelle)}
        </label>
      </div>
    `).join('');
  }

  // Ajouter le bouton "+" pour creer un nouveau tag
  html += `
    <div>
      <button type="button" class="btn btn-outline-secondary btn-sm add-tag-btn" onclick="ouvrirModalNouveauTag()" title="Ajouter un tag">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Ouvre un modal pour creer rapidement un nouveau tag
 */
function ouvrirModalNouveauTag() {
  // Verifier si le modal existe deja
  let modal = document.getElementById('modalNouveauTagRapide');

  if (!modal) {
    // Creer le modal
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'modalNouveauTagRapide';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title"><i class="bi bi-tag-fill"></i> Nouveau tag</h6>
            <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="nouveauTagLibelle" class="form-label">Libelle <span class="text-danger">*</span></label>
              <input type="text" class="form-control form-control-sm" id="nouveauTagLibelle" placeholder="Ex: Etudiant" required>
            </div>
            <div class="row">
              <div class="col-6">
                <label for="nouveauTagCouleur" class="form-label">Couleur</label>
                <input type="color" class="form-control form-control-sm form-control-color" id="nouveauTagCouleur" value="#6c757d">
              </div>
              <div class="col-6">
                <label for="nouveauTagIcone" class="form-label">Icone</label>
                <select class="form-select form-select-sm" id="nouveauTagIcone">
                  <option value="bi-tag">Tag</option>
                  <option value="bi-person">Personne</option>
                  <option value="bi-star">Etoile</option>
                  <option value="bi-heart">Coeur</option>
                  <option value="bi-award">Badge</option>
                  <option value="bi-briefcase">Travail</option>
                  <option value="bi-mortarboard">Etudiant</option>
                  <option value="bi-cash-stack">Argent</option>
                  <option value="bi-universal-access">Accessibilite</option>
                  <option value="bi-people">Famille</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Annuler</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="creerNouveauTagRapide()">
              <i class="bi bi-check"></i> Creer
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Reset le formulaire
  document.getElementById('nouveauTagLibelle').value = '';
  document.getElementById('nouveauTagCouleur').value = '#6c757d';
  document.getElementById('nouveauTagIcone').value = 'bi-tag';

  // Ouvrir le modal
  new bootstrap.Modal(modal).show();
}

/**
 * Cree un nouveau tag rapidement
 */
async function creerNouveauTagRapide() {
  const libelle = document.getElementById('nouveauTagLibelle').value.trim();
  const couleur = document.getElementById('nouveauTagCouleur').value;
  const icone = document.getElementById('nouveauTagIcone').value;

  if (!libelle) {
    showToast('Le libelle est obligatoire', 'warning');
    return;
  }

  // Generer un code a partir du libelle
  const code = libelle.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^A-Z0-9]/g, '_')
    .substring(0, 20);

  try {
    const response = await apiAdmin.post('/parametres/tags-utilisateur', {
      code: code,
      libelle: libelle,
      couleur: couleur,
      icone: icone,
      actif: true
    });

    // Fermer le modal
    bootstrap.Modal.getInstance(document.getElementById('modalNouveauTagRapide')).hide();

    showToast('Tag cree avec succes', 'success');

    // Recharger les tags et cocher le nouveau
    await loadTagsDisponibles();

    // Cocher le nouveau tag
    if (response && response.id) {
      const checkbox = document.getElementById(`tag_${response.id}`);
      if (checkbox) checkbox.checked = true;
    }

  } catch (error) {
    console.error('Erreur creation tag:', error);
    showToast('Erreur: ' + (error.message || 'Impossible de creer le tag'), 'error');
  }
}

/**
 * Escape HTML pour eviter XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Recupere les IDs des tags selectionnes
 * @returns {Array} - Tableau des IDs de tags
 */
function getSelectedTags() {
  const selected = [];
  document.querySelectorAll('.tag-checkbox:checked').forEach(cb => {
    selected.push(parseInt(cb.value));
  });
  return selected;
}

/**
 * Definit les tags selectionnes dans le formulaire
 * @param {Array} tags - Tableau des tags (objets avec id)
 */
function setSelectedTags(tags) {
  // D'abord decocher tous
  document.querySelectorAll('.tag-checkbox').forEach(cb => {
    cb.checked = false;
  });

  // Cocher les tags de l'usager
  if (tags && Array.isArray(tags)) {
    tags.forEach(tag => {
      const tagId = tag.id || tag;
      const checkbox = document.getElementById(`tag_${tagId}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }
}

/**
 * Affiche ou masque les champs de commune de prise en charge
 */
function toggleCommunePriseEnCharge() {
  const checkbox = document.getElementById('commune_prise_en_charge_differente');
  const fieldsContainer = document.getElementById('communePriseEnChargeFields');

  if (checkbox && fieldsContainer) {
    fieldsContainer.style.display = checkbox.checked ? 'flex' : 'none';

    // Vider les champs si on décoche
    if (!checkbox.checked) {
      document.getElementById('code_postal_prise_en_charge').value = '';
      document.getElementById('ville_prise_en_charge').value = '';
    }
  }
}

/**
 * Affiche ou masque la section des modules selon le rôle sélectionné
 */
function toggleModulesSection() {
  const role = document.getElementById('role').value;
  const modulesSection = document.getElementById('modulesSection');

  if (ROLES_AVEC_MODULES.includes(role)) {
    modulesSection.style.display = 'block';
  } else {
    modulesSection.style.display = 'none';
    // Décocher toutes les cases si on cache la section
    document.querySelectorAll('#modulesSection input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  }
}

/**
 * Récupère les modules autorisés sélectionnés
 * @returns {Array|null} - Tableau des modules ou null si aucun sélectionné
 */
function getSelectedModules() {
  const role = document.getElementById('role').value;

  // Administrateur n'a pas de restriction de modules
  if (role === 'administrateur') {
    return null;
  }

  // Usager n'a pas besoin de modules
  if (role === 'usager') {
    return null;
  }

  const modules = [];
  document.querySelectorAll('#modulesSection input[type="checkbox"]:checked').forEach(cb => {
    modules.push(cb.value);
  });

  // Si aucun module sélectionné, retourner null (accès à tous)
  return modules.length > 0 ? modules : null;
}

/**
 * Définit les modules autorisés dans le formulaire
 * @param {Array|null} modules - Tableau des modules ou null
 */
function setSelectedModules(modules) {
  // D'abord décocher tous
  document.querySelectorAll('#modulesSection input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  // Si modules est un tableau non vide, cocher les bons
  if (modules && Array.isArray(modules) && modules.length > 0) {
    modules.forEach(mod => {
      const checkbox = document.getElementById(`module_${mod}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }
}

/**
 * Recherche et charge un usager depuis l'API externe
 */
async function rechercherEtChargerAdherent() {
  const numero = document.getElementById('numeroAdherentExterne').value.trim();

  if (!numero) {
    showToast('Veuillez entrer un numéro d\'usager', 'warning');
    return;
  }

  const btn = document.getElementById('btnRechercheExterne');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Recherche...';

  try {
    const adherent = await rechercherAdherentExterne(numero);

    if (adherent) {
      // Pré-remplir le formulaire
      document.getElementById('nom').value = adherent.nom || '';
      document.getElementById('prenom').value = adherent.prenom || '';
      document.getElementById('email').value = adherent.email || '';
      document.getElementById('telephone').value = adherent.telephone || '';
      document.getElementById('adresse').value = adherent.adresse || '';
      document.getElementById('code_postal').value = adherent.code_postal || '';
      document.getElementById('ville').value = adherent.ville || '';
      document.getElementById('date_naissance').value = adherent.date_naissance || '';

      if (adherent.photo_url) {
        document.getElementById('photo_url').value = adherent.photo_url;
        updatePhotoPreview();
      }

      if (adherent.adhesion_association !== undefined) {
        document.getElementById('adhesion_association').checked = adherent.adhesion_association;
      }

      // Déclencher les validations
      document.getElementById('email').dispatchEvent(new Event('blur'));
      document.getElementById('telephone').dispatchEvent(new Event('input'));

      // Calculer l'âge si date de naissance
      if (adherent.date_naissance) {
        updateAgeDisplay();
      }

      showToast('Usager trouve et formulaire pre-rempli', 'success');
    } else {
      showToast('Aucun usager trouve avec ce numero', 'warning');
    }
  } catch (error) {
    console.error('Erreur recherche usager:', error);
    showToast('Erreur lors de la recherche', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

/**
 * Initialise les validations en temps réel
 */
function initFormValidation() {
  // Validation email
  const emailInput = document.getElementById('email');
  emailInput.addEventListener('blur', async () => {
    const email = emailInput.value.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      showFieldValidation('email', false, 'Format email invalide');
      return;
    }

    // Vérifier unicité (optionnel - peut être fait côté serveur)
    showFieldValidation('email', true, 'Email valide');
  });

  emailInput.addEventListener('input', () => {
    showFieldValidation('email', null); // Reset pendant la saisie
  });

  // Validation et formatage téléphone
  setupPhoneFormatting('telephone');

  // Validation mot de passe avec indicateur de force
  const passwordInput = document.getElementById('password');
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);

    const bar = document.getElementById('passwordStrength');
    const label = document.getElementById('passwordStrengthLabel');

    bar.className = 'progress-bar ' + strength.class;
    bar.style.width = (strength.score * 25) + '%';
    label.textContent = 'Force: ' + strength.label;

    if (password && strength.score < 2) {
      showFieldValidation('password', false, 'Mot de passe trop faible');
    } else if (password) {
      showFieldValidation('password', true);
    }
  });

  // Calcul âge automatique
  const dateNaissanceInput = document.getElementById('date_naissance');
  dateNaissanceInput.addEventListener('change', updateAgeDisplay);

  // Prévisualisation photo
  const photoUrlInput = document.getElementById('photo_url');
  photoUrlInput.addEventListener('input', updatePhotoPreview);
  photoUrlInput.addEventListener('change', updatePhotoPreview);
}

/**
 * Met à jour l'affichage de l'âge
 */
function updateAgeDisplay() {
  const dateNaissance = document.getElementById('date_naissance').value;
  const ageDisplay = document.getElementById('ageDisplay');

  if (dateNaissance) {
    const age = calculateAge(dateNaissance);
    if (age !== null) {
      ageDisplay.textContent = `${age} ans`;
      ageDisplay.className = 'text-muted';

      if (age < 18) {
        ageDisplay.textContent += ' (mineur)';
        ageDisplay.className = 'text-warning';
      }
    }
  } else {
    ageDisplay.textContent = '';
  }
}

/**
 * Met à jour la prévisualisation de la photo
 */
function updatePhotoPreview() {
  const photoUrl = document.getElementById('photo_url').value.trim();
  const preview = document.getElementById('photoPreview');
  const previewImg = document.getElementById('photoPreviewImg');

  if (photoUrl) {
    previewImg.src = photoUrl;
    previewImg.onerror = () => {
      preview.style.display = 'none';
      showFieldValidation('photo_url', false, 'URL de photo invalide');
    };
    previewImg.onload = () => {
      preview.style.display = 'block';
      showFieldValidation('photo_url', true);
    };
  } else {
    preview.style.display = 'none';
  }
}

/**
 * Ouvre le modal de création avec réinitialisation
 */
function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Nouvel usager';
  document.getElementById('adherentForm').reset();
  document.getElementById('adherentId').value = '';

  // Afficher la recherche externe et le mot de passe
  document.getElementById('searchExternalCard').style.display = 'block';
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('password').required = true;

  // Réinitialiser validations
  document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.valid-feedback, .invalid-feedback').forEach(el => {
    el.remove();
  });

  // Réinitialiser indicateur mot de passe
  document.getElementById('passwordStrength').style.width = '0%';
  document.getElementById('passwordStrengthLabel').textContent = '';

  // Cacher prévisualisation photo
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('ageDisplay').textContent = '';

  // Date d'adhésion par défaut = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date_adhesion').value = today;

  // Réinitialiser les modules et masquer la section
  setSelectedModules(null);
  toggleModulesSection();

  // Reinitialiser civilite, tags et commune prise en charge
  document.getElementById('civilite').value = 'N';
  setSelectedTags([]);
  document.getElementById('commune_prise_en_charge_differente').checked = false;
  document.getElementById('code_postal_prise_en_charge').value = '';
  document.getElementById('ville_prise_en_charge').value = '';
  toggleCommunePriseEnCharge();

  // Revenir au premier onglet
  const firstTab = new bootstrap.Tab(document.getElementById('tab-infos-btn'));
  firstTab.show();

  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(document.getElementById('adherentModal'));
  }
  modalInstance.show();
}

/**
 * Charge les données d'un usager pour édition
 */
async function editAdherent(id) {
  try {
    const data = await adherentsAPI.getById(id);
    const adherent = data.adherent;

    document.getElementById('modalTitle').textContent = 'Modifier l\'usager';
    document.getElementById('adherentId').value = adherent.id;

    // Masquer recherche externe en mode édition
    document.getElementById('searchExternalCard').style.display = 'none';

    // Remplir les champs
    document.getElementById('nom').value = adherent.nom || '';
    document.getElementById('prenom').value = adherent.prenom || '';
    document.getElementById('email').value = adherent.email || '';
    document.getElementById('telephone').value = adherent.telephone || '';
    document.getElementById('adresse').value = adherent.adresse || '';
    document.getElementById('ville').value = adherent.ville || '';
    document.getElementById('code_postal').value = adherent.code_postal || '';
    document.getElementById('date_naissance').value = adherent.date_naissance || '';
    document.getElementById('statut').value = adherent.statut || 'actif';
    document.getElementById('role').value = adherent.role || 'usager';
    document.getElementById('notes').value = adherent.notes || '';

    // Champs supplémentaires
    document.getElementById('photo_url').value = adherent.photo || '';
    document.getElementById('adhesion_association').checked = adherent.adhesion_association || false;
    document.getElementById('date_adhesion').value = adherent.date_adhesion || '';
    document.getElementById('date_fin_adhesion').value = adherent.date_fin_adhesion || '';

    // Charger civilite et tags
    document.getElementById('civilite').value = adherent.sexe || 'N';
    setSelectedTags(adherent.tags || []);

    // Charger commune de prise en charge
    const cpPriseEnCharge = adherent.code_postal_prise_en_charge || '';
    const villePriseEnCharge = adherent.ville_prise_en_charge || '';
    document.getElementById('code_postal_prise_en_charge').value = cpPriseEnCharge;
    document.getElementById('ville_prise_en_charge').value = villePriseEnCharge;
    // Si des valeurs existent, cocher la checkbox et afficher les champs
    if (cpPriseEnCharge || villePriseEnCharge) {
      document.getElementById('commune_prise_en_charge_differente').checked = true;
      toggleCommunePriseEnCharge();
    } else {
      document.getElementById('commune_prise_en_charge_differente').checked = false;
      toggleCommunePriseEnCharge();
    }

    // Charger les modules autorisés
    setSelectedModules(adherent.modules_autorises);
    toggleModulesSection();

    // Mot de passe optionnel en édition
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = false;
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Laisser vide pour ne pas changer';

    // Déclencher mises à jour
    if (adherent.date_naissance) {
      updateAgeDisplay();
    }
    if (adherent.photo) {
      updatePhotoPreview();
    }
    if (adherent.telephone) {
      document.getElementById('telephone').dispatchEvent(new Event('input'));
    }

    // Revenir au premier onglet
    const firstTab = new bootstrap.Tab(document.getElementById('tab-infos-btn'));
    firstTab.show();

    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(document.getElementById('adherentModal'));
    }
    modalInstance.show();
  } catch (error) {
    console.error('Erreur chargement usager:', error);
    showToast('Erreur lors du chargement de l\'usager: ' + error.message, 'error');
  }
}

/**
 * Soumet le formulaire (création ou modification)
 */
async function submitAdherentForm(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enregistrement...';

  try {
    const id = document.getElementById('adherentId').value;
    const formData = {
      nom: document.getElementById('nom').value,
      prenom: document.getElementById('prenom').value,
      email: document.getElementById('email').value,
      telephone: document.getElementById('telephone').value || null,
      adresse: document.getElementById('adresse').value || null,
      ville: document.getElementById('ville').value || null,
      code_postal: document.getElementById('code_postal').value || null,
      code_postal_prise_en_charge: document.getElementById('code_postal_prise_en_charge').value || null,
      ville_prise_en_charge: document.getElementById('ville_prise_en_charge').value || null,
      date_naissance: document.getElementById('date_naissance').value || null,
      statut: document.getElementById('statut').value,
      role: document.getElementById('role').value,
      notes: document.getElementById('notes').value || null,
      photo: document.getElementById('photo_url').value || null,
      adhesion_association: document.getElementById('adhesion_association').checked,
      date_adhesion: document.getElementById('date_adhesion').value || null,
      date_fin_adhesion: document.getElementById('date_fin_adhesion').value || null,
      modules_autorises: getSelectedModules(),
      sexe: document.getElementById('civilite').value,
      tags: getSelectedTags()
    };

    // Mot de passe uniquement si renseigné
    const password = document.getElementById('password').value;
    if (password) {
      formData.password = password;
    }

    if (!id) {
      // Création
      if (!formData.password) {
        showToast('Le mot de passe est requis pour un nouvel usager', 'error');
        return;
      }
      await adherentsAPI.create(formData);
      showToast('Usager cree avec succes !', 'success');
    } else {
      // Modification
      await adherentsAPI.update(id, formData);
      showToast('Usager modifie avec succes !', 'success');
    }

    closeModal();
    loadAdherents();
  } catch (error) {
    console.error('Erreur sauvegarde usager:', error);
    showToast('Erreur: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-save"></i> Enregistrer';
  }
}

/**
 * Initialisation du formulaire
 */
function initAdherentForm() {
  // Événements validation
  initFormValidation();

  // Générateur mot de passe
  setupPasswordGenerator('password', 'generatePassword');

  // Toggle affichage mot de passe
  setupPasswordToggle('password', 'togglePassword');

  // Soumission formulaire
  document.getElementById('adherentForm').addEventListener('submit', submitAdherentForm);

  // Touche Entrée sur le champ de recherche externe
  document.getElementById('numeroAdherentExterne')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      rechercherEtChargerAdherent();
    }
  });

  // Charger les tags disponibles
  loadTagsDisponibles();
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  initAdherentForm();
});
