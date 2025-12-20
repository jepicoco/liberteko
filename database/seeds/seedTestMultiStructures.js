/**
 * Seed de donnees de test pour le systeme multi-structures
 * Cree des organisations, structures et utilisateurs de differents niveaux
 *
 * Usage: node database/seeds/seedTestMultiStructures.js
 */

const bcrypt = require('bcryptjs');
const { sequelize, Organisation, Structure, Utilisateur, UtilisateurStructure, GroupeFrontend, GroupeFrontendStructure } = require('../../backend/models');

// Mot de passe commun pour tous les comptes de test
const COMMON_PASSWORD = 'Test123!';

// Donnees de test
const ORGANISATIONS = [
  {
    nom: 'Association Ludo & Lire',
    nom_court: 'L&L',
    type_organisation: 'association',
    siret: '12345678901234',
    adresse: '15 rue des Jeux',
    code_postal: '75001',
    ville: 'Paris',
    email: 'contact@ludolire.org',
    telephone: '0142424242',
    couleur_primaire: '#6f42c1',
    structures: [
      {
        code: 'ludo-paris',
        nom: 'Ludotheque Paris Centre',
        type_structure: 'ludotheque',
        modules_actifs: ['jeux'],
        couleur: '#6f42c1',
        icone: 'dice-6'
      },
      {
        code: 'biblio-paris',
        nom: 'Bibliotheque Paris Est',
        type_structure: 'bibliotheque',
        modules_actifs: ['livres'],
        couleur: '#20c997',
        icone: 'book'
      },
      {
        code: 'media-paris',
        nom: 'Mediatheque Paris Sud',
        type_structure: 'mediatheque',
        modules_actifs: ['jeux', 'livres', 'films', 'disques'],
        couleur: '#fd7e14',
        icone: 'collection'
      }
    ]
  },
  {
    nom: 'Commune de Villejeux',
    nom_court: 'Villejeux',
    type_organisation: 'collectivite',
    siret: '21350058700012',
    code_insee: '35058',
    adresse: '1 place de la Mairie',
    code_postal: '35000',
    ville: 'Villejeux',
    email: 'culture@villejeux.fr',
    telephone: '0299999999',
    couleur_primaire: '#007bff',
    structures: [
      {
        code: 'ludo-villejeux',
        nom: 'Ludotheque Municipale',
        type_structure: 'ludotheque',
        modules_actifs: ['jeux'],
        couleur: '#e83e8c',
        icone: 'dice-6'
      },
      {
        code: 'rpe-villejeux',
        nom: 'Relais Petite Enfance',
        type_structure: 'relais_petite_enfance',
        modules_actifs: ['jeux', 'livres'],
        couleur: '#17a2b8',
        icone: 'people-fill'
      }
    ]
  }
];

// Utilisateurs de test par structure
// Format: { email_prefix, nom, prenom, role_global, structures: [{ code, role_structure }] }
const UTILISATEURS = [
  // Super admin global (acces a tout)
  {
    email: 'admin@test.local',
    nom: 'Admin',
    prenom: 'Super',
    role: 'administrateur',
    structures: [] // Admin global n'a pas besoin d'acces specifiques
  },

  // Gestionnaire Organisation 1 (L&L)
  {
    email: 'gestionnaire.ll@test.local',
    nom: 'Dupont',
    prenom: 'Marie',
    role: 'gestionnaire',
    structures: [
      { code: 'ludo-paris', role_structure: null }, // Utilise role global
      { code: 'biblio-paris', role_structure: null },
      { code: 'media-paris', role_structure: null }
    ]
  },

  // Benevole Ludotheque Paris (role global benevole, acces uniquement ludo)
  {
    email: 'benevole.ludo@test.local',
    nom: 'Martin',
    prenom: 'Pierre',
    role: 'benevole',
    structures: [
      { code: 'ludo-paris', role_structure: null }
    ]
  },

  // Agent multi-structures (benevole global, mais gestionnaire sur biblio)
  {
    email: 'agent.multi@test.local',
    nom: 'Bernard',
    prenom: 'Sophie',
    role: 'benevole',
    structures: [
      { code: 'ludo-paris', role_structure: null }, // benevole
      { code: 'biblio-paris', role_structure: 'gestionnaire' } // Override: gestionnaire ici
    ]
  },

  // Comptable Organisation 1
  {
    email: 'comptable.ll@test.local',
    nom: 'Petit',
    prenom: 'Jean',
    role: 'comptable',
    structures: [
      { code: 'ludo-paris', role_structure: null },
      { code: 'biblio-paris', role_structure: null },
      { code: 'media-paris', role_structure: null }
    ]
  },

  // Gestionnaire Organisation 2 (Villejeux)
  {
    email: 'gestionnaire.vj@test.local',
    nom: 'Leroy',
    prenom: 'Claire',
    role: 'gestionnaire',
    structures: [
      { code: 'ludo-villejeux', role_structure: null },
      { code: 'rpe-villejeux', role_structure: null }
    ]
  },

  // Benevole RPE uniquement
  {
    email: 'benevole.rpe@test.local',
    nom: 'Moreau',
    prenom: 'Lucas',
    role: 'benevole',
    structures: [
      { code: 'rpe-villejeux', role_structure: null }
    ]
  },

  // Usager simple (adhesion)
  {
    email: 'usager1@test.local',
    nom: 'Dubois',
    prenom: 'Emma',
    role: 'usager',
    structures: [
      { code: 'ludo-paris', role_structure: null },
      { code: 'media-paris', role_structure: null }
    ]
  },

  // Usager multi-orga (rare mais possible)
  {
    email: 'usager.multi@test.local',
    nom: 'Roux',
    prenom: 'Antoine',
    role: 'usager',
    structures: [
      { code: 'ludo-paris', role_structure: null },
      { code: 'ludo-villejeux', role_structure: null }
    ]
  }
];

// Portails publics (GroupeFrontend)
// Differentes combinaisons de structures pour le site public
const PORTAILS = [
  // Portail principal L&L : toutes les structures de l'association
  {
    code: 'ludo-lire',
    nom: 'Association Ludo & Lire',
    slug: 'ludo-lire',
    theme_code: 'pixel-geek',
    nom_affiche: 'Ludo & Lire - Paris',
    meta_description: 'Bibliotheque et ludotheque associative a Paris',
    email_contact: 'contact@ludolire.org',
    telephone_contact: '0142424242',
    structures: ['ludo-paris', 'biblio-paris', 'media-paris']
  },

  // Portail ludotheque seule
  {
    code: 'ludo-paris-solo',
    nom: 'Ludotheque Paris Centre',
    slug: 'ludotheque-paris',
    theme_code: 'default',
    nom_affiche: 'La Ludo de Paris',
    meta_description: 'Ludotheque associative au coeur de Paris - Jeux de societe pour tous',
    email_contact: 'ludo@ludolire.org',
    structures: ['ludo-paris']
  },

  // Portail bibliotheque seule
  {
    code: 'biblio-paris-solo',
    nom: 'Bibliotheque Paris Est',
    slug: 'bibliotheque-paris',
    theme_code: 'ocean-blue',
    nom_affiche: 'Bibliotheque Paris Est',
    meta_description: 'Bibliotheque de quartier - Livres et BD pour tous les ages',
    email_contact: 'biblio@ludolire.org',
    structures: ['biblio-paris']
  },

  // Portail Villejeux : toutes les structures municipales
  {
    code: 'villejeux',
    nom: 'Culture Villejeux',
    slug: 'villejeux',
    theme_code: 'forest-green',
    nom_affiche: 'Culture & Loisirs - Villejeux',
    meta_description: 'Ludotheque municipale et relais petite enfance de Villejeux',
    email_contact: 'culture@villejeux.fr',
    telephone_contact: '0299999999',
    structures: ['ludo-villejeux', 'rpe-villejeux']
  },

  // Portail petite enfance seul
  {
    code: 'rpe-villejeux-solo',
    nom: 'RPE Les Petits Joueurs',
    slug: 'rpe-villejeux',
    theme_code: 'spring-blossom',
    nom_affiche: 'Les Petits Joueurs',
    meta_description: 'Relais Petite Enfance - Jeux et livres pour les tout-petits',
    email_contact: 'rpe@villejeux.fr',
    structures: ['rpe-villejeux']
  },

  // Portail multi-organisations (cas rare mais possible)
  {
    code: 'reseau-ludos-idf',
    nom: 'Reseau Ludotheques IDF',
    slug: 'reseau-ludos',
    theme_code: 'elegant-dark',
    nom_affiche: 'Reseau des Ludotheques d\'Ile-de-France',
    meta_description: 'Catalogue commun des ludotheques partenaires',
    structures: ['ludo-paris', 'ludo-villejeux']
  },

  // Portail "tout" - federation de tout
  {
    code: 'federation-complete',
    nom: 'Federation des Mediatheques',
    slug: 'federation',
    theme_code: 'default',
    nom_affiche: 'Federation des Mediatheques',
    meta_description: 'Catalogue federe de toutes les structures partenaires',
    structures: ['ludo-paris', 'biblio-paris', 'media-paris', 'ludo-villejeux', 'rpe-villejeux']
  }
];

async function seed() {
  console.log('='.repeat(60));
  console.log('Seed Multi-Structures - Donnees de test');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Hash du mot de passe commun
    const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 10);
    console.log(`Mot de passe commun: ${COMMON_PASSWORD}`);
    console.log('');

    // Map pour stocker les IDs des structures creees
    const structureMap = new Map();

    // 1. Creer les organisations et leurs structures
    console.log('1. Creation des organisations et structures...');
    console.log('-'.repeat(40));

    for (const orgData of ORGANISATIONS) {
      const { structures, ...orgFields } = orgData;

      // Creer ou recuperer l'organisation
      const [org, orgCreated] = await Organisation.findOrCreate({
        where: { siret: orgFields.siret },
        defaults: orgFields
      });

      console.log(`  Organisation: ${org.nom} (${orgCreated ? 'CREEE' : 'existante'})`);

      // Creer les structures de cette organisation
      for (const structData of structures) {
        const [struct, structCreated] = await Structure.findOrCreate({
          where: { code: structData.code },
          defaults: {
            ...structData,
            organisation_id: org.id
          }
        });

        // Mettre a jour si existante
        if (!structCreated) {
          await struct.update({
            ...structData,
            organisation_id: org.id
          });
        }

        structureMap.set(structData.code, struct.id);
        console.log(`    - Structure: ${struct.nom} [${structData.modules_actifs.join(', ')}] (${structCreated ? 'CREEE' : 'maj'})`);
      }
    }

    console.log('');
    console.log('2. Creation des utilisateurs...');
    console.log('-'.repeat(40));

    // 2. Creer les utilisateurs
    for (const userData of UTILISATEURS) {
      const { structures, ...userFields } = userData;

      // Creer ou recuperer l'utilisateur
      // Note: hooks: false pour eviter le hook afterCreate qui cause des locks
      const [user, userCreated] = await Utilisateur.findOrCreate({
        where: { email: userFields.email },
        defaults: {
          ...userFields,
          password: hashedPassword,
          statut: 'actif',
          date_adhesion: new Date(),
          code_barre: `TST${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`
        },
        hooks: false
      });

      // Si existant, mettre a jour le mot de passe (avec hooks: false pour eviter le re-hash)
      if (!userCreated) {
        await user.update({
          password: hashedPassword,
          role: userFields.role,
          statut: 'actif'
        }, { hooks: false });
      }

      console.log(`  ${user.email} (${user.role}) - ${userCreated ? 'CREE' : 'maj'}`);

      // 3. Creer les acces aux structures
      for (const access of structures) {
        const structureId = structureMap.get(access.code);
        if (!structureId) {
          console.log(`    ! Structure ${access.code} non trouvee, acces ignore`);
          continue;
        }

        const [userStruct, accessCreated] = await UtilisateurStructure.findOrCreate({
          where: {
            utilisateur_id: user.id,
            structure_id: structureId
          },
          defaults: {
            role_structure: access.role_structure,
            actif: true
          }
        });

        if (!accessCreated) {
          await userStruct.update({
            role_structure: access.role_structure,
            actif: true
          });
        }

        const roleDisplay = access.role_structure || `(${userFields.role})`;
        console.log(`    -> ${access.code}: ${roleDisplay}`);
      }
    }

    console.log('');
    console.log('3. Creation des portails publics...');
    console.log('-'.repeat(40));

    // 4. Creer les portails publics (GroupeFrontend)
    for (const portailData of PORTAILS) {
      const { structures: structureCodes, ...portailFields } = portailData;

      // Creer ou recuperer le portail
      const [portail, portailCreated] = await GroupeFrontend.findOrCreate({
        where: { code: portailFields.code },
        defaults: {
          ...portailFields,
          actif: true
        }
      });

      // Mettre a jour si existant
      if (!portailCreated) {
        await portail.update(portailFields);
      }

      console.log(`  ${portail.nom} [/${portail.slug}] (${portailCreated ? 'CREE' : 'maj'})`);

      // Creer les liens vers les structures
      for (let ordre = 0; ordre < structureCodes.length; ordre++) {
        const structureCode = structureCodes[ordre];
        const structureId = structureMap.get(structureCode);

        if (!structureId) {
          console.log(`    ! Structure ${structureCode} non trouvee`);
          continue;
        }

        const [lien, lienCreated] = await GroupeFrontendStructure.findOrCreate({
          where: {
            groupe_frontend_id: portail.id,
            structure_id: structureId
          },
          defaults: {
            ordre_affichage: ordre
          }
        });

        if (!lienCreated) {
          await lien.update({ ordre_affichage: ordre });
        }

        console.log(`    -> ${structureCode} (ordre: ${ordre})`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('SEED TERMINE AVEC SUCCES');
    console.log('='.repeat(60));
    console.log('');
    console.log('Comptes de test disponibles:');
    console.log('-'.repeat(40));
    for (const u of UTILISATEURS) {
      console.log(`  ${u.email.padEnd(30)} | ${u.role.padEnd(15)} | ${u.structures.length || 'GLOBAL'} struct.`);
    }
    console.log('');
    console.log(`Mot de passe pour tous: ${COMMON_PASSWORD}`);
    console.log('');
    console.log('Portails publics disponibles:');
    console.log('-'.repeat(40));
    for (const p of PORTAILS) {
      console.log(`  /${p.slug.padEnd(20)} | ${p.nom.padEnd(30)} | ${p.structures.length} struct.`);
    }
    console.log('');

  } catch (error) {
    console.error('Erreur lors du seed:', error);
    throw error;
  }
}

// Execution
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
