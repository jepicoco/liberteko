/**
 * Script de configuration des communications pour la validation de charte usager
 * Cree les EventTriggers et les TemplateMessage necessaires
 *
 * Execution: npm run setup-charte-communications
 * ou: node database/seeds/seedCharteCommunications.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { EventTrigger, TemplateMessage } = require('../../backend/models');

// Templates de messages pour la validation de charte
const CHARTE_TEMPLATES = [
  {
    code: 'CHARTE_VALIDATION_DEMANDEE',
    libelle: 'Validation de charte requise',
    description: 'Email envoye pour demander la validation de la charte usager',
    type_message: 'email',
    categorie: 'charte',
    email_objet: 'Validation de charte requise - {{structure_nom}}',
    email_corps: `<p>Bonjour {{prenom}},</p>

<p>Suite a votre adhesion/renouvellement, nous vous demandons de valider la charte d'utilisation de notre structure.</p>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{charte_titre}}</h4>
  <p style="margin-bottom: 0;"><strong>Version :</strong> {{charte_version}}</p>
</div>

<p><strong>Pourquoi cette validation ?</strong><br>
Cette charte definit les regles d'utilisation et les engagements reciproques entre notre structure et vous.</p>

<p><strong>Date limite :</strong> {{date_fin_grace}}</p>
<p>Passe cette date, vous ne pourrez plus effectuer d'emprunts tant que la charte ne sera pas validee.</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{lien_validation}}" style="display: inline-block; background: #0d6efd; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600;">Valider la charte</a>
</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    sms_corps: 'Bonjour {{prenom}}, merci de valider votre charte d\'utilisation avant le {{date_fin_grace}}. {{structure_nom}}',
    actif: true,
    icone: 'bi-file-earmark-check',
    couleur: 'primary'
  },
  {
    code: 'CHARTE_OTP_EMAIL',
    libelle: 'Code OTP validation charte - Email',
    description: 'Email contenant le code OTP pour valider la charte',
    type_message: 'email',
    categorie: 'charte',
    email_objet: 'Votre code de validation - {{structure_nom}}',
    email_corps: `<p>Bonjour {{prenom}},</p>

<p>Voici votre code de validation pour la charte d'utilisation :</p>

<div style="background: #0d6efd; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0;">{{code_otp}}</p>
</div>

<p><strong>Ce code est valide pendant 15 minutes.</strong></p>

<p>Si vous n'avez pas demande ce code, vous pouvez ignorer cet email.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    sms_corps: null,
    actif: true,
    icone: 'bi-envelope-check',
    couleur: 'info'
  },
  {
    code: 'CHARTE_OTP_SMS',
    libelle: 'Code OTP validation charte - SMS',
    description: 'SMS contenant le code OTP pour valider la charte',
    type_message: 'sms',
    categorie: 'charte',
    email_objet: null,
    email_corps: null,
    sms_corps: 'Code validation charte: {{code_otp}} (valide 15 min). {{structure_nom}}',
    actif: true,
    icone: 'bi-phone',
    couleur: 'info'
  },
  {
    code: 'CHARTE_VALIDEE',
    libelle: 'Charte validee avec succes',
    description: 'Email de confirmation apres validation de la charte',
    type_message: 'email',
    categorie: 'charte',
    email_objet: 'Charte validee avec succes - {{structure_nom}}',
    email_corps: `<p>Bonjour {{prenom}},</p>

<p>Nous vous confirmons que vous avez valide avec succes la charte d'utilisation de notre structure.</p>

<div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0; color: #155724;">Charte validee</h4>
  <p style="margin-bottom: 0;"><strong>Titre :</strong> {{charte_titre}}</p>
  <p style="margin-bottom: 0;"><strong>Version :</strong> {{charte_version}}</p>
  <p style="margin-bottom: 0;"><strong>Date de validation :</strong> {{date_validation}}</p>
</div>

<p>Vous pouvez maintenant profiter pleinement de nos services.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    sms_corps: 'Votre charte a ete validee avec succes. Merci ! {{structure_nom}}',
    actif: true,
    icone: 'bi-check-circle',
    couleur: 'success'
  }
];

// Event triggers pour la validation de charte
const CHARTE_TRIGGERS = [
  {
    code: 'CHARTE_VALIDATION_REQUESTED',
    libelle: 'Validation de charte demandee',
    description: 'Envoye quand une validation de charte est requise (apres cotisation)',
    categorie: 'charte',
    template_email_code: 'CHARTE_VALIDATION_DEMANDEE',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 300,
    icone: 'bi-file-earmark-check',
    couleur: 'primary'
  },
  {
    code: 'CHARTE_OTP_EMAIL',
    libelle: 'Code OTP charte par email',
    description: 'Envoie le code OTP par email pour valider la charte',
    categorie: 'charte',
    template_email_code: 'CHARTE_OTP_EMAIL',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 310,
    icone: 'bi-envelope-check',
    couleur: 'info'
  },
  {
    code: 'CHARTE_OTP_SMS',
    libelle: 'Code OTP charte par SMS',
    description: 'Envoie le code OTP par SMS pour valider la charte',
    categorie: 'charte',
    template_email_code: null,
    template_sms_code: 'CHARTE_OTP_SMS',
    email_actif: false,
    sms_actif: true,
    delai_envoi: 0,
    ordre_affichage: 320,
    icone: 'bi-phone',
    couleur: 'info'
  },
  {
    code: 'CHARTE_VALIDATED',
    libelle: 'Charte validee',
    description: 'Confirmation envoyee apres validation de la charte',
    categorie: 'charte',
    template_email_code: 'CHARTE_VALIDEE',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 330,
    icone: 'bi-check-circle',
    couleur: 'success'
  }
];

async function seedTemplates() {
  console.log('📝 Insertion des templates de charte...');

  for (const template of CHARTE_TEMPLATES) {
    const [record, created] = await TemplateMessage.findOrCreate({
      where: { code: template.code },
      defaults: template
    });

    if (created) {
      console.log(`  ✅ Template ${template.code} cree`);
    } else {
      console.log(`  ⏭️  Template ${template.code} existe deja`);
    }
  }
}

async function seedTriggers() {
  console.log('\n🎯 Insertion des event triggers de charte...');

  for (const trigger of CHARTE_TRIGGERS) {
    const [record, created] = await EventTrigger.findOrCreate({
      where: { code: trigger.code },
      defaults: trigger
    });

    if (created) {
      console.log(`  ✅ Trigger ${trigger.code} cree`);
    } else {
      console.log(`  ⏭️  Trigger ${trigger.code} existe deja`);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Configuration des communications pour la validation de charte\n');

    await seedTemplates();
    await seedTriggers();

    console.log('\n✅ Configuration terminee !');
    console.log('\n📌 Rappel: Activez le systeme de charte dans Parametres > Site web > Modules');
    console.log('📌 Creez une charte dans Parametres > Charte usager et activez-la');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
