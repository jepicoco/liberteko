const logger = require('./logger');

/**
 * Audit Logger - Fonctions de logging pour les actions importantes du système
 */

/**
 * Log une connexion utilisateur
 * @param {Object} data - { userId, email, ip, userAgent, success }
 */
const login = (data) => {
  const { userId, email, ip, userAgent, success } = data;

  logger.info(`[AUTH_LOGIN] User login ${success ? 'successful' : 'failed'}`, {
    tag: 'AUTH_LOGIN',
    userId,
    email,
    ip,
    userAgent,
    success,
    action: 'login'
  });
};

/**
 * Log une déconnexion utilisateur
 * @param {Object} data - { userId, email, ip }
 */
const logout = (data) => {
  const { userId, email, ip } = data;

  logger.info('[AUTH_LOGOUT] User logout', {
    tag: 'AUTH_LOGOUT',
    userId,
    email,
    ip,
    action: 'logout'
  });
};

/**
 * Log une réinitialisation de mot de passe
 * @param {Object} data - { userId, email, ip, method }
 */
const passwordReset = (data) => {
  const { userId, email, ip, method } = data;

  logger.info('[AUTH_PASSWORD_RESET] Password reset', {
    tag: 'AUTH_PASSWORD_RESET',
    userId,
    email,
    ip,
    method: method || 'email',
    action: 'password_reset'
  });
};

/**
 * Log la création d'une cotisation
 * @param {Object} data - { cotisationId, adherentId, montant, userId, modePaiement }
 */
const cotisationCreated = (data) => {
  const { cotisationId, adherentId, montant, userId, modePaiement } = data;

  logger.info('[COTISATION_CREATED] New cotisation created', {
    tag: 'COTISATION_CREATED',
    cotisationId,
    adherentId,
    montant,
    userId,
    modePaiement,
    action: 'cotisation_created'
  });
};

/**
 * Log l'annulation d'une cotisation
 * @param {Object} data - { cotisationId, adherentId, montant, userId, raison }
 */
const cotisationAnnulee = (data) => {
  const { cotisationId, adherentId, montant, userId, raison } = data;

  logger.warn('[COTISATION_ANNULEE] Cotisation cancelled', {
    tag: 'COTISATION_ANNULEE',
    cotisationId,
    adherentId,
    montant,
    userId,
    raison,
    action: 'cotisation_cancelled'
  });
};

/**
 * Log l'archivage d'un adhérent
 * @param {Object} data - { adherentId, nom, prenom, userId, raison }
 */
const adherentArchived = (data) => {
  const { adherentId, nom, prenom, userId, raison } = data;

  logger.info('[ADHERENT_ARCHIVED] Member archived', {
    tag: 'ADHERENT_ARCHIVED',
    adherentId,
    nom,
    prenom,
    userId,
    raison,
    action: 'adherent_archived'
  });
};

/**
 * Log un changement de configuration
 * @param {Object} data - { configKey, oldValue, newValue, userId, module }
 */
const configChanged = (data) => {
  const { configKey, oldValue, newValue, userId, module } = data;

  logger.info('[CONFIG_CHANGED] Configuration updated', {
    tag: 'CONFIG_CHANGED',
    configKey,
    oldValue,
    newValue,
    userId,
    module: module || 'system',
    action: 'config_changed'
  });
};

/**
 * Log la création d'un emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, itemId, userId }
 */
const empruntCreated = (data) => {
  const { empruntId, adherentId, itemType, itemId, userId } = data;

  logger.info('[EMPRUNT_CREATED] New loan created', {
    tag: 'EMPRUNT_CREATED',
    empruntId,
    adherentId,
    itemType,
    itemId,
    userId,
    action: 'emprunt_created'
  });
};

/**
 * Log le retour d'un emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, itemId, userId, enRetard }
 */
const empruntReturned = (data) => {
  const { empruntId, adherentId, itemType, itemId, userId, enRetard } = data;

  logger.info('[EMPRUNT_RETURNED] Loan returned', {
    tag: 'EMPRUNT_RETURNED',
    empruntId,
    adherentId,
    itemType,
    itemId,
    userId,
    enRetard,
    action: 'emprunt_returned'
  });
};

/**
 * Log une prolongation d'emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, userId, nouvelleDateRetour }
 */
const empruntProlonged = (data) => {
  const { empruntId, adherentId, itemType, userId, nouvelleDateRetour } = data;

  logger.info('[EMPRUNT_PROLONGED] Loan extended', {
    tag: 'EMPRUNT_PROLONGED',
    empruntId,
    adherentId,
    itemType,
    userId,
    nouvelleDateRetour,
    action: 'emprunt_prolonged'
  });
};

/**
 * Log un accès non autorisé
 * @param {Object} data - { userId, resource, ip, action }
 */
const unauthorizedAccess = (data) => {
  const { userId, resource, ip, action } = data;

  logger.warn('[UNAUTHORIZED_ACCESS] Unauthorized access attempt', {
    tag: 'UNAUTHORIZED_ACCESS',
    userId,
    resource,
    ip,
    action: action || 'access_denied'
  });
};

// ============================================
// CAISSE - Sessions et Mouvements
// ============================================

/**
 * Log l'ouverture d'une session de caisse
 * @param {Object} data - { caisseId, sessionId, userId, soldeOuverture, ip }
 */
const sessionOuverte = (data) => {
  const { caisseId, sessionId, userId, soldeOuverture, ip } = data;

  logger.info('[CAISSE_SESSION_OUVERTE] Cash register session opened', {
    tag: 'CAISSE_SESSION_OUVERTE',
    caisseId,
    sessionId,
    userId,
    soldeOuverture,
    ip,
    action: 'session_ouverte'
  });
};

/**
 * Log la clôture d'une session de caisse
 * @param {Object} data - { caisseId, sessionId, userId, soldeTheorique, soldeReel, ecart, ip }
 */
const sessionCloturee = (data) => {
  const { caisseId, sessionId, userId, soldeTheorique, soldeReel, ecart, ip } = data;

  logger.info('[CAISSE_SESSION_CLOTUREE] Cash register session closed', {
    tag: 'CAISSE_SESSION_CLOTUREE',
    caisseId,
    sessionId,
    userId,
    soldeTheorique,
    soldeReel,
    ecart,
    ip,
    action: 'session_cloturee'
  });
};

/**
 * Log un mouvement de caisse
 * @param {Object} data - { sessionId, mouvementId, type, categorie, montant, modePaiement, operateurId, ip }
 */
const mouvementEnregistre = (data) => {
  const { sessionId, mouvementId, type, categorie, montant, modePaiement, operateurId, ip } = data;

  logger.info(`[CAISSE_MOUVEMENT] Cash movement registered: ${type}`, {
    tag: 'CAISSE_MOUVEMENT',
    sessionId,
    mouvementId,
    type,
    categorie,
    montant,
    modePaiement,
    operateurId,
    ip,
    action: 'mouvement_enregistre'
  });
};

/**
 * Log l'annulation d'un mouvement de caisse
 * @param {Object} data - { mouvementId, operateurId, motif, ip }
 */
const mouvementAnnule = (data) => {
  const { mouvementId, operateurId, motif, ip } = data;

  logger.info('[CAISSE_MOUVEMENT_ANNULE] Cash movement cancelled', {
    tag: 'CAISSE_MOUVEMENT_ANNULE',
    mouvementId,
    operateurId,
    motif,
    ip,
    action: 'mouvement_annule'
  });
};

// ============================================
// CAISSE - Remises en banque
// ============================================

/**
 * Log la création d'une remise en banque
 * @param {Object} data - { remiseId, numeroRemise, montant, nbMouvements, operateurId, ip }
 */
const remiseCreee = (data) => {
  const { remiseId, numeroRemise, montant, nbMouvements, operateurId, ip } = data;

  logger.info(`[CAISSE_REMISE_CREEE] Bank deposit created: ${numeroRemise}`, {
    tag: 'CAISSE_REMISE_CREEE',
    remiseId,
    numeroRemise,
    montant,
    nbMouvements,
    operateurId,
    ip,
    action: 'remise_creee'
  });
};

/**
 * Log le dépôt d'une remise en banque
 * @param {Object} data - { remiseId, numeroRemise, operateurId, ip }
 */
const remiseDeposee = (data) => {
  const { remiseId, numeroRemise, operateurId, ip } = data;

  logger.info(`[CAISSE_REMISE_DEPOSEE] Bank deposit marked as deposited: ${numeroRemise}`, {
    tag: 'CAISSE_REMISE_DEPOSEE',
    remiseId,
    numeroRemise,
    operateurId,
    ip,
    action: 'remise_deposee'
  });
};

/**
 * Log la validation d'une remise en banque
 * @param {Object} data - { remiseId, numeroRemise, valideurId, bordereauRef, ip }
 */
const remiseValidee = (data) => {
  const { remiseId, numeroRemise, valideurId, bordereauRef, ip } = data;

  logger.info(`[CAISSE_REMISE_VALIDEE] Bank deposit validated: ${numeroRemise}`, {
    tag: 'CAISSE_REMISE_VALIDEE',
    remiseId,
    numeroRemise,
    valideurId,
    bordereauRef,
    ip,
    action: 'remise_validee'
  });
};

/**
 * Log l'annulation d'une remise en banque
 * @param {Object} data - { remiseId, numeroRemise, operateurId, motif, ip }
 */
const remiseAnnulee = (data) => {
  const { remiseId, numeroRemise, operateurId, motif, ip } = data;

  logger.info(`[CAISSE_REMISE_ANNULEE] Bank deposit cancelled: ${numeroRemise}`, {
    tag: 'CAISSE_REMISE_ANNULEE',
    remiseId,
    numeroRemise,
    operateurId,
    motif,
    ip,
    action: 'remise_annulee'
  });
};

module.exports = {
  login,
  logout,
  passwordReset,
  cotisationCreated,
  cotisationAnnulee,
  adherentArchived,
  configChanged,
  empruntCreated,
  empruntReturned,
  empruntProlonged,
  unauthorizedAccess,
  // Caisse
  sessionOuverte,
  sessionCloturee,
  mouvementEnregistre,
  mouvementAnnule,
  remiseCreee,
  remiseDeposee,
  remiseValidee,
  remiseAnnulee
};
