/**
 * Seed: Génère des logs de communications (emails + SMS) pour tests
 * Environ 500 messages répartis sur différentes structures et utilisateurs
 *
 * Usage: node database/seeds/seedTestCommunications.js
 */

const { sequelize, EmailLog, SmsLog, Utilisateur, Structure } = require('../../backend/models');

// Templates disponibles
const EMAIL_TEMPLATES = [
  'UTILISATEUR_CREATION',
  'EMPRUNT_CONFIRMATION',
  'EMPRUNT_RAPPEL_AVANT',
  'EMPRUNT_RAPPEL_ECHEANCE',
  'EMPRUNT_RELANCE_RETARD',
  'COTISATION_CONFIRMATION',
  'COTISATION_RAPPEL',
  'RESERVATION_CONFIRMATION',
  'RESERVATION_DISPONIBLE'
];

const SMS_TEMPLATES = [
  'SMS_EMPRUNT_RAPPEL',
  'SMS_RETARD_RELANCE',
  'SMS_COTISATION_RAPPEL',
  'SMS_RESERVATION_DISPO',
  'SMS_BIENVENUE'
];

const SMS_PROVIDERS = ['smsfactor', 'brevo', 'twilio', 'ovh'];

const STATUTS_EMAIL = ['envoye', 'envoye', 'envoye', 'envoye', 'erreur', 'en_attente'];
const STATUTS_SMS = ['envoye', 'envoye', 'delivre', 'delivre', 'erreur', 'echec_livraison', 'en_attente'];

const PRENOMS = ['Marie', 'Jean', 'Pierre', 'Sophie', 'Lucas', 'Emma', 'Louis', 'Léa', 'Hugo', 'Chloé', 'Thomas', 'Camille', 'Nicolas', 'Julie', 'Antoine'];
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'];

const ERREURS_EMAIL = [
  'Connection timeout',
  'Invalid recipient address',
  'Mailbox full',
  'SMTP server unavailable',
  'Authentication failed'
];

const ERREURS_SMS = [
  'Invalid phone number',
  'Insufficient credits',
  'Network error',
  'Carrier rejected',
  'Phone unreachable'
];

/**
 * Génère une date aléatoire dans les X derniers jours
 */
function randomDate(daysBack = 90) {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

/**
 * Choisit un élément aléatoire dans un tableau
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Génère un email aléatoire
 */
function generateEmail(prenom, nom) {
  const domains = ['gmail.com', 'yahoo.fr', 'hotmail.com', 'outlook.fr', 'free.fr', 'orange.fr'];
  return `${prenom.toLowerCase()}.${nom.toLowerCase()}@${randomChoice(domains)}`;
}

/**
 * Génère un numéro de téléphone français
 */
function generatePhone() {
  const prefixes = ['06', '07'];
  const prefix = randomChoice(prefixes);
  let number = prefix;
  for (let i = 0; i < 8; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return `+33${number.substring(1)}`;
}

/**
 * Génère un objet d'email aléatoire
 */
function generateEmailSubject(templateCode) {
  const subjects = {
    'UTILISATEUR_CREATION': 'Bienvenue à la ludothèque !',
    'EMPRUNT_CONFIRMATION': 'Confirmation de votre emprunt',
    'EMPRUNT_RAPPEL_AVANT': 'Rappel : Retour de votre emprunt dans 3 jours',
    'EMPRUNT_RAPPEL_ECHEANCE': 'Rappel : Votre emprunt arrive à échéance aujourd\'hui',
    'EMPRUNT_RELANCE_RETARD': 'Relance : Emprunt en retard',
    'COTISATION_CONFIRMATION': 'Confirmation de votre cotisation',
    'COTISATION_RAPPEL': 'Rappel : Renouvellement de cotisation',
    'RESERVATION_CONFIRMATION': 'Confirmation de votre réservation',
    'RESERVATION_DISPONIBLE': 'Votre réservation est disponible !'
  };
  return subjects[templateCode] || 'Communication de la ludothèque';
}

/**
 * Génère un corps d'email HTML aléatoire
 */
function generateEmailBody(prenom, templateCode) {
  return `
    <html>
      <body>
        <h2>Bonjour ${prenom},</h2>
        <p>Ceci est un message automatique de test généré pour le template ${templateCode}.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p>Cordialement,<br>L'équipe de la ludothèque</p>
      </body>
    </html>
  `;
}

/**
 * Génère un message SMS aléatoire
 */
function generateSmsMessage(prenom, templateCode) {
  const messages = {
    'SMS_EMPRUNT_RAPPEL': `${prenom}, rappel: votre emprunt doit être retourné dans 3 jours. Ludothèque`,
    'SMS_RETARD_RELANCE': `${prenom}, votre emprunt est en retard. Merci de le retourner rapidement. Ludothèque`,
    'SMS_COTISATION_RAPPEL': `${prenom}, votre cotisation expire bientôt. Pensez à la renouveler. Ludothèque`,
    'SMS_RESERVATION_DISPO': `${prenom}, votre réservation est disponible! Venez la récupérer. Ludothèque`,
    'SMS_BIENVENUE': `Bienvenue ${prenom}! Votre inscription à la ludothèque est confirmée.`
  };
  return messages[templateCode] || `${prenom}, message de test de la ludothèque.`;
}

/**
 * Calcule le nombre de segments SMS
 */
function calculateSegments(text) {
  if (!text) return 1;
  const length = text.length;
  if (length <= 160) return 1;
  return Math.ceil(length / 153);
}

async function seed() {
  try {
    console.log('=== Seed Communications Test ===\n');

    // Récupérer les structures existantes
    const structures = await Structure.findAll({ attributes: ['id', 'nom'] });
    if (structures.length === 0) {
      console.log('Aucune structure trouvée. Création de structures fictives...');
      // Créer quelques structures de test si aucune n'existe
      const defaultStructures = [
        { nom: 'Ludothèque Centrale', code: 'LUDO-CENTRAL' },
        { nom: 'Bibliothèque Municipale', code: 'BIBLIO-MUN' },
        { nom: 'Médiathèque Est', code: 'MEDIA-EST' }
      ];
      for (const s of defaultStructures) {
        const [struct] = await Structure.findOrCreate({
          where: { code: s.code },
          defaults: { nom: s.nom, actif: true }
        });
        structures.push(struct);
      }
    }
    console.log(`${structures.length} structure(s) disponible(s)`);

    // Récupérer quelques utilisateurs existants
    const utilisateurs = await Utilisateur.findAll({
      attributes: ['id', 'nom', 'prenom', 'email', 'telephone'],
      limit: 50
    });
    console.log(`${utilisateurs.length} utilisateur(s) disponible(s)`);

    const structureIds = structures.map(s => s.id);
    const utilisateurIds = utilisateurs.map(u => u.id);

    // Générer les logs
    const NB_EMAILS = 300;
    const NB_SMS = 200;

    console.log(`\nGénération de ${NB_EMAILS} emails...`);
    const emailLogs = [];
    for (let i = 0; i < NB_EMAILS; i++) {
      const prenom = randomChoice(PRENOMS);
      const nom = randomChoice(NOMS);
      const templateCode = randomChoice(EMAIL_TEMPLATES);
      const statut = randomChoice(STATUTS_EMAIL);
      const dateEnvoi = randomDate(90);
      const structureId = randomChoice(structureIds);
      const utilisateurId = utilisateurIds.length > 0 ? randomChoice([...utilisateurIds, null, null]) : null;

      const log = {
        template_code: templateCode,
        destinataire: generateEmail(prenom, nom),
        destinataire_nom: `${prenom} ${nom}`,
        objet: generateEmailSubject(templateCode),
        corps: generateEmailBody(prenom, templateCode),
        statut: statut,
        date_envoi: dateEnvoi,
        message_id: statut === 'envoye' ? `<${Date.now()}-${i}@ludotheque.local>` : null,
        erreur_message: statut === 'erreur' ? randomChoice(ERREURS_EMAIL) : null,
        utilisateur_id: utilisateurId,
        structure_id: structureId,
        metadata: { source: 'seed', index: i }
      };
      emailLogs.push(log);

      if ((i + 1) % 100 === 0) {
        process.stdout.write(`  ${i + 1}/${NB_EMAILS}\r`);
      }
    }

    // Insertion par lots de 50 pour éviter les erreurs de taille
    const BATCH_SIZE = 50;
    for (let i = 0; i < emailLogs.length; i += BATCH_SIZE) {
      const batch = emailLogs.slice(i, i + BATCH_SIZE);
      await EmailLog.bulkCreate(batch);
    }
    console.log(`  ${NB_EMAILS} emails créés`);

    console.log(`\nGénération de ${NB_SMS} SMS...`);
    const smsLogs = [];
    for (let i = 0; i < NB_SMS; i++) {
      const prenom = randomChoice(PRENOMS);
      const nom = randomChoice(NOMS);
      const templateCode = randomChoice(SMS_TEMPLATES);
      const statut = randomChoice(STATUTS_SMS);
      const dateEnvoi = randomDate(90);
      const structureId = randomChoice(structureIds);
      const utilisateurId = utilisateurIds.length > 0 ? randomChoice([...utilisateurIds, null, null]) : null;
      const provider = randomChoice(SMS_PROVIDERS);
      const message = generateSmsMessage(prenom, templateCode);

      const log = {
        template_code: templateCode,
        destinataire: generatePhone(),
        destinataire_nom: `${prenom} ${nom}`,
        message: message,
        nb_segments: calculateSegments(message),
        statut: statut,
        date_envoi: dateEnvoi,
        date_livraison: statut === 'delivre' ? new Date(dateEnvoi.getTime() + Math.random() * 60000) : null,
        message_id: ['envoye', 'delivre'].includes(statut) ? `sms_${Date.now()}_${i}` : null,
        provider: provider,
        cout: ['envoye', 'delivre'].includes(statut) ? (Math.random() * 0.05 + 0.03).toFixed(4) : null,
        erreur_code: statut === 'erreur' ? `ERR_${Math.floor(Math.random() * 100)}` : null,
        erreur_message: ['erreur', 'echec_livraison'].includes(statut) ? randomChoice(ERREURS_SMS) : null,
        utilisateur_id: utilisateurId,
        structure_id: structureId,
        metadata: { source: 'seed', index: i }
      };
      smsLogs.push(log);

      if ((i + 1) % 100 === 0) {
        process.stdout.write(`  ${i + 1}/${NB_SMS}\r`);
      }
    }

    // Insertion par lots de 50 pour éviter les erreurs de taille
    for (let i = 0; i < smsLogs.length; i += BATCH_SIZE) {
      const batch = smsLogs.slice(i, i + BATCH_SIZE);
      await SmsLog.bulkCreate(batch);
    }
    console.log(`  ${NB_SMS} SMS créés`);

    // Statistiques par structure
    console.log('\n=== Répartition par structure ===');
    for (const structure of structures) {
      const emailCount = emailLogs.filter(l => l.structure_id === structure.id).length;
      const smsCount = smsLogs.filter(l => l.structure_id === structure.id).length;
      console.log(`  ${structure.nom}: ${emailCount} emails, ${smsCount} SMS`);
    }

    console.log('\n✓ Seed terminé avec succès!');
    console.log(`  Total: ${NB_EMAILS + NB_SMS} messages générés`);

  } catch (error) {
    console.error('Erreur lors du seed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Exécution
seed().catch(err => {
  console.error(err);
  process.exit(1);
});
