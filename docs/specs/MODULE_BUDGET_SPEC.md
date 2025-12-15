# Module Gestion Budgetaire - Specification Technique Complete

**Version:** 2.0
**Date:** 14/12/2024
**Statut:** Valide pour developpement

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture Multi-Perimetres](#2-architecture-multi-perimetres)
3. [Modeles de Donnees](#3-modeles-de-donnees)
4. [Gestion du Benevolat](#4-gestion-du-benevolat)
5. [Gestion des Dons](#5-gestion-des-dons)
6. [Gestion des Subventions](#6-gestion-des-subventions)
7. [Budget Previsionnel et Suivi](#7-budget-previsionnel-et-suivi)
8. [Depenses et Recettes](#8-depenses-et-recettes)
9. [Tresorerie](#9-tresorerie)
10. [Workflow de Validation](#10-workflow-de-validation)
11. [Integrations Automatiques](#11-integrations-automatiques)
12. [API Routes](#12-api-routes)
13. [Interface Utilisateur](#13-interface-utilisateur)
14. [Exports et CERFA](#14-exports-et-cerfa)
15. [Configuration](#15-configuration)
16. [Planning de Developpement](#16-planning-de-developpement)

---

## 1. Vue d'ensemble

### 1.1 Objectif

Permettre aux associations utilisant Assotheque de gerer leur budget de maniere complete :
- Budget previsionnel multi-perimetres
- Suivi des depenses/recettes avec workflow de validation
- Gestion des subventions avec generation CERFA
- Comptage et valorisation du benevolat
- Gestion des dons avec recus fiscaux
- Projection de tresorerie
- Reporting multi-exercices

### 1.2 Contexte reglementaire (France - Loi 1901)

| Seuil | Obligations |
|-------|-------------|
| < 23 000 EUR | Comptabilite simple (livre recettes/depenses) |
| >= 23 000 EUR de subventions | Comptes annuels obligatoires |
| >= 153 000 EUR de subventions/dons | Comptabilite partie double, commissaire aux comptes, export FEC |

### 1.3 Decisions de conception validees

| Aspect | Choix |
|--------|-------|
| **Perimetre global** | Complet (Budget + Tresorerie + Multi-exercices + Multi-sites) |
| **Structure budgetaire** | Perimetres libres (combinaison de modules au choix) |
| **Droits** | Par perimetre avec heritage (Global -> sous-perimetres) |
| **Consolidation** | Manuelle (rapport a la demande) |
| **Validation depenses** | Multi-niveaux (Gestionnaire -> Comptable -> President) |
| **Visibilite benevoles** | Aucun acces (gestionnaire+ uniquement) |
| **Justificatifs** | Obligatoires pour toutes les depenses |
| **Exports** | PDF + Excel |
| **Integrations** | Cotisations, Achats collections, Amendes, Import bancaire |
| **Subventions** | Complet + CERFA 12156/15059 + Conventions avec clauses |
| **Fonds dedies** | Tracabilite stricte |
| **Benevolat** | Comptage + Valorisation (taux configurables) + Compte 87 |
| **Dons** | Complet + Recus fiscaux CERFA 11580 |

### 1.4 Integration avec l'existant

Le module s'appuie sur l'infrastructure comptable deja en place :
- **EcritureComptable** : ecritures debit/credit conformes FEC
- **SectionAnalytique** : 5 axes (activite, site, projet, financeur, autre)
- **RepartitionAnalytique** : ventilation multi-sections en pourcentage
- **RegroupementAnalytique** : modeles de ventilation reutilisables
- **ParametrageComptableOperation** : regles comptables par type d'operation
- **CompteBancaire** / **ModePaiement** : encaissements
- **TauxTVA** : gestion TVA
- **Utilisateur** : utilisateurs et roles existants

---

## 2. Architecture Multi-Perimetres

### 2.1 Concept

L'association peut creer librement des **perimetres budgetaires** en combinant un ou plusieurs modules de collection. Chaque perimetre a son propre budget, ses propres droits d'acces, et peut etre consolide avec d'autres a la demande.

```
PERIMETRES BUDGETAIRES (crees librement par l'admin)
+-- "Ludotheque"           -> modules: [ludotheque]
+-- "Mediatheque"          -> modules: [bibliotheque, filmotheque, discotheque]
+-- "Global Association"   -> modules: [tous] ou [] (transversal)
+-- "Projet Festival 2025" -> modules: [] (projet specifique)
```

### 2.2 Modele PerimetreBudgetaire

```javascript
{
  id: INTEGER PRIMARY KEY,
  code: STRING(20) UNIQUE NOT NULL,        // "LUDO", "MEDIA", "GLOBAL"
  nom: STRING(100) NOT NULL,               // "Ludotheque", "Mediatheque"
  description: TEXT,

  // Modules associes (JSON array)
  modules: JSON,                           // ["ludotheque"] ou ["bibliotheque","filmotheque","discotheque"]

  // Si tous les modules ou transversal
  est_global: BOOLEAN DEFAULT false,       // true = acces a tout

  // Site associe (si multi-sites)
  site_id: INTEGER,                        // FK Site (optionnel)

  // Hierarchie
  parent_id: INTEGER,                      // FK PerimetreBudgetaire (pour heritage)

  // Section analytique par defaut
  section_analytique_id: INTEGER,          // FK SectionAnalytique

  couleur: STRING(7),                      // "#FF5733" pour UI
  icone: STRING(50),                       // "bi-dice-6" Bootstrap icon
  ordre_affichage: INTEGER,
  actif: BOOLEAN DEFAULT true,

  created_at, updated_at
}
```

### 2.3 Droits par perimetre avec heritage

```javascript
// Modele DroitBudgetPerimetre
{
  id: INTEGER PRIMARY KEY,
  utilisateur_id: INTEGER NOT NULL,        // FK Utilisateur
  perimetre_id: INTEGER NOT NULL,          // FK PerimetreBudgetaire

  role_budget: ENUM('lecteur', 'gestionnaire', 'comptable', 'administrateur'),

  // Droits granulaires (optionnel, sinon herite du role)
  peut_saisir_depenses: BOOLEAN,
  peut_valider_depenses: BOOLEAN,
  peut_valider_final: BOOLEAN,             // Validation president
  peut_gerer_budget: BOOLEAN,
  peut_gerer_subventions: BOOLEAN,
  peut_exporter: BOOLEAN,

  created_at, updated_at,

  UNIQUE(utilisateur_id, perimetre_id)
}
```

### 2.4 Logique d'heritage des droits

```
Regle: Un droit sur un perimetre parent s'applique automatiquement aux enfants.

Exemple:
- Marie a role "comptable" sur "Global"
  -> Marie a automatiquement acces comptable a "Ludotheque" et "Mediatheque"

- Jean a role "gestionnaire" sur "Ludotheque" uniquement
  -> Jean ne voit que le perimetre Ludotheque

- Pierre a role "lecteur" sur "Global" mais "comptable" sur "Ludotheque"
  -> Le role le plus eleve s'applique (comptable sur Ludo, lecteur sur le reste)
```

### 2.5 Consolidation manuelle

La consolidation n'est pas automatique. Un rapport de consolidation peut etre genere a la demande en selectionnant les perimetres a agreger.

```javascript
// Endpoint de consolidation
GET /api/budget/consolidation?perimetres=1,2,3&exercice=2025

// Retourne un rapport agrege des budgets selectionnes
// avec indication des doublons potentiels (charges transversales)
```

---

## 3. Modeles de Donnees

### 3.1 Budget (budget previsionnel)

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,          // FK PerimetreBudgetaire
  exercice: INTEGER NOT NULL,              // Annee fiscale (2024, 2025...)

  type: ENUM('fonctionnement', 'investissement', 'projet'),
  projet_id: INTEGER,                      // FK ProjetBudgetaire si type='projet'

  nom: STRING(100) NOT NULL,               // "Budget Fonctionnement 2025"

  statut: ENUM('brouillon', 'propose', 'valide', 'cloture'),

  // Totaux (calcules)
  total_charges_previsionnel: DECIMAL(12,2),
  total_produits_previsionnel: DECIMAL(12,2),
  total_charges_realise: DECIMAL(12,2),
  total_produits_realise: DECIMAL(12,2),

  // Provision imprevu
  taux_provision_imprevu: DECIMAL(5,2) DEFAULT 5.00,

  // Validation
  date_creation: DATE,
  cree_par: INTEGER,                       // FK Utilisateur
  date_proposition: DATE,
  propose_par: INTEGER,
  date_validation: DATE,
  valide_par: INTEGER,
  date_cloture: DATE,
  cloture_par: INTEGER,

  commentaire: TEXT,
  version: INTEGER DEFAULT 1,

  created_at, updated_at,

  UNIQUE(perimetre_id, exercice, type, projet_id)
}
```

### 3.2 LigneBudgetaire

```javascript
{
  id: INTEGER PRIMARY KEY,
  budget_id: INTEGER NOT NULL,             // FK Budget

  // Classification comptable
  compte_comptable_id: INTEGER,            // FK CompteComptable (classe 6 ou 7)
  section_analytique_id: INTEGER,          // FK SectionAnalytique

  // Identification
  code: STRING(20),                        // "ACH_JEUX", "SUB_MAIRIE"
  libelle: STRING(255) NOT NULL,           // "Achats de jeux", "Subvention Mairie"
  type: ENUM('charge', 'produit'),

  // Sous-categorie
  categorie: STRING(50),                   // "achats_collection", "personnel", etc.

  // Montants previsionnels (3 scenarios)
  montant_pessimiste: DECIMAL(12,2),
  montant_realiste: DECIMAL(12,2) NOT NULL,
  montant_optimiste: DECIMAL(12,2),

  // Montant realise (mis a jour automatiquement)
  montant_realise: DECIMAL(12,2) DEFAULT 0,

  // Repartition temporelle
  periodicite: ENUM('annuel', 'mensuel', 'trimestriel', 'ponctuel'),
  repartition_mensuelle: JSON,             // {1: 1000, 2: 1000, ...} si mensuel
  mois_prevu: INTEGER,                     // 1-12 si ponctuel

  // Fonds dedies
  est_fonds_dedie: BOOLEAN DEFAULT false,
  source_fonds_dedie: STRING(100),         // "Subvention Mairie projet X"

  notes: TEXT,
  ordre_affichage: INTEGER,

  created_at, updated_at
}
```

### 3.3 ProjetBudgetaire

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,          // FK PerimetreBudgetaire

  code: STRING(20) UNIQUE NOT NULL,        // "FEST_2025", "RENO_LOCAL"
  nom: STRING(100) NOT NULL,
  description: TEXT,

  responsable_id: INTEGER,                 // FK Utilisateur

  date_debut: DATE,
  date_fin: DATE,

  statut: ENUM('planifie', 'en_cours', 'termine', 'annule', 'reporte'),

  // Budget
  budget_prevu: DECIMAL(12,2),
  budget_consomme: DECIMAL(12,2) DEFAULT 0,

  // Financement
  autofinancement: DECIMAL(12,2),
  subventions_attendues: DECIMAL(12,2),
  dons_attendus: DECIMAL(12,2),

  // Analytique
  section_analytique_id: INTEGER,

  // Documents
  dossier_projet: STRING(255),             // Chemin dossier documents

  notes: TEXT,

  created_at, updated_at
}
```

### 3.4 Depense

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,          // FK PerimetreBudgetaire
  exercice: INTEGER NOT NULL,

  // Identification
  numero_piece: STRING(20) UNIQUE,         // "DEP-2025-00001"
  date_piece: DATE NOT NULL,               // Date facture/ticket
  date_comptable: DATE,                    // Date comptabilisation
  date_paiement: DATE,

  // Fournisseur
  fournisseur: STRING(100),
  fournisseur_siret: STRING(14),
  numero_facture: STRING(50),

  // Montants
  montant_ht: DECIMAL(12,2),
  taux_tva_id: INTEGER,                    // FK TauxTVA
  montant_tva: DECIMAL(12,2) DEFAULT 0,
  montant_ttc: DECIMAL(12,2) NOT NULL,

  // Classification
  type_depense: ENUM('fonctionnement', 'investissement'),
  categorie: ENUM(
    'achats_collection',                   // Jeux, livres, films, disques
    'fournitures',                         // Fournitures bureau, consommables
    'services',                            // Prestations, abonnements
    'personnel',                           // Salaires (hors charges)
    'charges_sociales',                    // Charges patronales
    'locaux',                              // Loyer, charges, entretien
    'energie',                             // Electricite, gaz, eau
    'assurances',
    'communication',                       // Publicite, flyers, site web
    'animations',                          // Intervenants, materiel events
    'deplacements',                        // Transport, missions
    'frais_bancaires',
    'impots_taxes',
    'amortissements',
    'divers'
  ),

  // Affectation budgetaire
  ligne_budgetaire_id: INTEGER,            // FK LigneBudgetaire
  projet_id: INTEGER,                      // FK ProjetBudgetaire

  // Affectation comptable
  compte_comptable_id: INTEGER NOT NULL,   // FK CompteComptable (classe 6)
  section_analytique_id: INTEGER,

  // Fonds dedies
  fonds_dedie_id: INTEGER,                 // FK FondDedie si utilise fonds affecte

  // Paiement
  mode_paiement_id: INTEGER,               // FK ModePaiement
  compte_bancaire_id: INTEGER,             // FK CompteBancaire
  reference_paiement: STRING(100),         // Num cheque, ref virement

  // Justificatif (OBLIGATOIRE)
  justificatif_path: STRING(255) NOT NULL, // Chemin fichier scan
  justificatif_nom: STRING(100),
  justificatif_type: STRING(50),           // "application/pdf", "image/jpeg"

  // Workflow validation
  statut: ENUM('brouillon', 'soumise', 'validee_n1', 'validee_n2', 'validee_finale', 'rejetee', 'payee'),

  // Niveau 1 : Gestionnaire
  soumise_par: INTEGER,
  date_soumission: DATE,

  // Niveau 2 : Comptable
  validee_n1_par: INTEGER,
  date_validation_n1: DATE,
  commentaire_n1: TEXT,

  // Niveau 3 : Comptable senior / Tresorier
  validee_n2_par: INTEGER,
  date_validation_n2: DATE,
  commentaire_n2: TEXT,

  // Niveau final : President (si requis)
  validee_finale_par: INTEGER,
  date_validation_finale: DATE,
  commentaire_final: TEXT,

  // Rejet
  rejetee_par: INTEGER,
  date_rejet: DATE,
  motif_rejet: TEXT,

  // Lien ecriture comptable
  ecriture_comptable_id: INTEGER,          // FK EcritureComptable (apres validation)

  libelle: STRING(255) NOT NULL,
  notes: TEXT,

  created_at, updated_at
}
```

### 3.5 Recette (hors cotisations)

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,
  exercice: INTEGER NOT NULL,

  // Identification
  numero_piece: STRING(20) UNIQUE,         // "REC-2025-00001"
  date_piece: DATE NOT NULL,
  date_comptable: DATE,
  date_encaissement: DATE,

  // Type et source
  type_recette: ENUM(
    'subvention',
    'don_numeraire',
    'don_nature',
    'mecenat',
    'vente',
    'prestation',
    'location',
    'amende',
    'cotisation_integration',              // Depuis module cotisations
    'autre'
  ),

  source: STRING(100),                     // Nom du payeur
  source_siret: STRING(14),
  reference: STRING(50),

  // Montants
  montant_ht: DECIMAL(12,2),
  taux_tva_id: INTEGER,
  montant_tva: DECIMAL(12,2) DEFAULT 0,
  montant_ttc: DECIMAL(12,2) NOT NULL,

  // Affectation
  ligne_budgetaire_id: INTEGER,
  projet_id: INTEGER,
  subvention_id: INTEGER,                  // FK Subvention si type='subvention'
  don_id: INTEGER,                         // FK Don si type don

  // Comptabilite
  compte_comptable_id: INTEGER NOT NULL,   // FK CompteComptable (classe 7)
  section_analytique_id: INTEGER,

  // Fonds dedies
  est_fonds_dedie: BOOLEAN DEFAULT false,
  fonds_dedie_id: INTEGER,
  affectation_fonds: STRING(255),          // Description de l'affectation

  // Encaissement
  mode_paiement_id: INTEGER,
  compte_bancaire_id: INTEGER,
  reference_encaissement: STRING(100),

  // Justificatif
  justificatif_path: STRING(255),

  // Validation
  statut: ENUM('brouillon', 'soumise', 'validee', 'encaissee'),
  validee_par: INTEGER,
  date_validation: DATE,

  // Lien ecriture comptable
  ecriture_comptable_id: INTEGER,

  // Integration automatique
  source_integration: ENUM('manuel', 'cotisation', 'amende', 'collection'),
  source_id: INTEGER,                      // ID de l'entite source

  libelle: STRING(255) NOT NULL,
  notes: TEXT,

  created_at, updated_at
}
```

---

## 4. Gestion du Benevolat

### 4.1 Vue d'ensemble

Le benevolat est valorise selon le plan comptable associatif (classe 87 - Contributions volontaires en nature). La valorisation est configurable par l'association.

### 4.2 Modeles

#### TauxHoraireBenevolat

```javascript
{
  id: INTEGER PRIMARY KEY,
  code: STRING(20) UNIQUE NOT NULL,        // "EXEC", "ENCAD", "EXPERT"
  libelle: STRING(100) NOT NULL,           // "Execution", "Encadrement", "Expertise"
  description: TEXT,

  taux_horaire: DECIMAL(8,2) NOT NULL,     // 11.88 (SMIC), 25.00, 50.00...

  // Reference
  reference_taux: STRING(100),             // "SMIC horaire 2024", "Convention collective X"

  actif: BOOLEAN DEFAULT true,
  ordre_affichage: INTEGER,

  created_at, updated_at
}
```

#### ActiviteBenevolat

```javascript
{
  id: INTEGER PRIMARY KEY,
  code: STRING(20) UNIQUE NOT NULL,        // "ACCUEIL", "ANIM", "ADMIN"
  libelle: STRING(100) NOT NULL,           // "Accueil public", "Animation", "Administration"
  description: TEXT,

  // Taux par defaut pour cette activite
  taux_horaire_defaut_id: INTEGER,         // FK TauxHoraireBenevolat

  // Section analytique associee
  section_analytique_id: INTEGER,

  actif: BOOLEAN DEFAULT true,

  created_at, updated_at
}
```

#### SessionBenevolat

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,          // FK PerimetreBudgetaire
  exercice: INTEGER NOT NULL,

  // Benevole
  benevole_id: INTEGER NOT NULL,           // FK Utilisateur

  // Activite
  activite_id: INTEGER NOT NULL,           // FK ActiviteBenevolat
  projet_id: INTEGER,                      // FK ProjetBudgetaire (optionnel)

  // Horaires
  date_session: DATE NOT NULL,
  heure_debut: TIME NOT NULL,
  heure_fin: TIME NOT NULL,
  duree_minutes: INTEGER,                  // Calcule automatiquement
  pause_minutes: INTEGER DEFAULT 0,        // Deduire les pauses

  // Valorisation
  taux_horaire_id: INTEGER NOT NULL,       // FK TauxHoraireBenevolat
  taux_horaire_montant: DECIMAL(8,2),      // Snapshot du taux au moment de la saisie
  valorisation: DECIMAL(10,2),             // duree * taux (calcule)

  // Lieu
  site_id: INTEGER,                        // FK Site
  lieu: STRING(100),

  // Validation
  statut: ENUM('saisie', 'validee', 'rejetee'),
  validee_par: INTEGER,
  date_validation: DATE,

  // Details
  description: TEXT,
  nb_participants: INTEGER,                // Si animation

  created_at, updated_at
}
```

#### BilanBenevolat (vue agregee par periode)

```javascript
// Vue/Table calculee
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,
  exercice: INTEGER NOT NULL,
  mois: INTEGER,                           // 1-12 ou NULL pour annuel

  // Totaux
  nb_benevoles_actifs: INTEGER,
  nb_sessions: INTEGER,
  total_heures: DECIMAL(10,2),
  total_valorisation: DECIMAL(12,2),

  // Par activite (JSON)
  detail_activites: JSON,                  // [{activite_id, heures, valorisation}, ...]

  // Par benevole (JSON)
  detail_benevoles: JSON,                  // [{benevole_id, heures, valorisation}, ...]

  created_at, updated_at
}
```

### 4.3 Integration comptable (Classe 87)

Les contributions benevoles sont enregistrees en classe 87 du plan comptable associatif :
- **870** - Benevolat
- **871** - Prestations en nature
- **875** - Dons en nature

```javascript
// Compte comptable a creer
{
  numero: '870000',
  libelle: 'Contributions volontaires - Benevolat',
  classe: 8,
  type: 'general',
  nature: 'produit'
}
```

### 4.4 Workflow

```
1. Benevole saisit ses heures (ou gestionnaire pour lui)
2. Validation par le gestionnaire du perimetre
3. Agregation mensuelle automatique
4. Integration dans le compte de resultat (classe 87)
5. Export pour rapport AG
```

---

## 5. Gestion des Dons

### 5.1 Vue d'ensemble

Gestion complete des dons avec generation de recus fiscaux (CERFA 11580) pour les associations habilitees.

### 5.2 Modeles

#### Donateur

```javascript
{
  id: INTEGER PRIMARY KEY,

  // Type
  type: ENUM('particulier', 'entreprise'),

  // Identite
  nom: STRING(100) NOT NULL,
  prenom: STRING(100),                     // Si particulier
  raison_sociale: STRING(100),             // Si entreprise

  // Coordonnees
  adresse_ligne1: STRING(255),
  adresse_ligne2: STRING(255),
  code_postal: STRING(10),
  ville: STRING(100),
  pays: STRING(50) DEFAULT 'France',

  email: STRING(100),
  telephone: STRING(20),

  // Entreprise
  siret: STRING(14),

  // Preferences
  recoit_newsletter: BOOLEAN DEFAULT false,
  recoit_remerciements: BOOLEAN DEFAULT true,
  anonyme: BOOLEAN DEFAULT false,          // Ne pas afficher dans les remerciements publics

  // Statistiques (calculees)
  total_dons: DECIMAL(12,2) DEFAULT 0,
  nb_dons: INTEGER DEFAULT 0,
  premier_don: DATE,
  dernier_don: DATE,

  notes: TEXT,

  created_at, updated_at
}
```

#### Don

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,
  exercice: INTEGER NOT NULL,

  // Donateur
  donateur_id: INTEGER NOT NULL,           // FK Donateur

  // Type de don
  type_don: ENUM(
    'numeraire',                           // Argent
    'nature',                              // Bien materiel
    'competence',                          // Mecenat de competences
    'abandon_frais'                        // Remboursement de frais non reclame
  ),

  // Montants
  montant: DECIMAL(12,2) NOT NULL,         // Montant ou valorisation
  montant_valorise: DECIMAL(12,2),         // Si don en nature, valorisation

  // Don en nature
  nature_description: TEXT,                // Description du bien
  nature_estimation_methode: STRING(255),  // Comment la valeur a ete estimee

  // Affectation
  est_affecte: BOOLEAN DEFAULT false,      // Don affecte a un projet
  affectation: STRING(255),                // Description de l'affectation
  projet_id: INTEGER,                      // FK ProjetBudgetaire
  fonds_dedie_id: INTEGER,                 // FK FondDedie

  // Dates
  date_don: DATE NOT NULL,
  date_encaissement: DATE,

  // Paiement (si numeraire)
  mode_paiement_id: INTEGER,
  compte_bancaire_id: INTEGER,
  reference_paiement: STRING(100),

  // Recu fiscal
  recu_fiscal_eligible: BOOLEAN DEFAULT true,
  recu_fiscal_genere: BOOLEAN DEFAULT false,
  recu_fiscal_numero: STRING(20),          // "RF-2025-00001"
  recu_fiscal_date: DATE,
  recu_fiscal_path: STRING(255),           // Chemin PDF

  // Campagne (optionnel)
  campagne: STRING(100),                   // "Appel dons Noel 2025"

  // Comptabilite
  compte_comptable_id: INTEGER,            // 754100 Dons manuels
  section_analytique_id: INTEGER,
  recette_id: INTEGER,                     // FK Recette (lie automatiquement)

  // Validation
  statut: ENUM('brouillon', 'valide', 'encaisse', 'annule'),
  validee_par: INTEGER,
  date_validation: DATE,

  notes: TEXT,
  remerciement_envoye: BOOLEAN DEFAULT false,
  date_remerciement: DATE,

  created_at, updated_at
}
```

### 5.3 Recu fiscal CERFA 11580

Generation automatique du recu fiscal pour les associations habilitees (interet general, articles 200 et 238 bis du CGI).

```javascript
// Donnees pour generation CERFA 11580
{
  // Organisme beneficiaire
  organisme_nom: "Association Ludotheque XYZ",
  organisme_adresse: "...",
  organisme_objet: "Gestion d'une ludotheque associative",
  organisme_reconnu_utilite_publique: false,

  // Numero d'ordre du recu
  numero_recu: "2025-00042",

  // Donateur
  donateur_nom_prenom: "DUPONT Jean",
  donateur_adresse: "...",

  // Don
  date_don: "15/03/2025",
  montant_euros: 150.00,
  montant_lettres: "Cent cinquante euros",

  // Nature (si don en nature)
  nature_don: "Numeraire" | "Nature" | "Abandon de frais",

  // Mode versement
  mode_versement: "Cheque" | "Virement" | "Especes" | "Prelevement",

  // Article du CGI
  article_cgi: "200" | "238 bis" | "978",
  taux_reduction: 66 | 75 | 60,            // % selon article

  // Signature
  date_recu: "16/03/2025",
  signataire: "Pierre MARTIN, President"
}
```

### 5.4 Integration comptable

| Type de don | Compte |
|-------------|--------|
| Don numeraire | 754100 - Dons manuels |
| Don en nature | 871000 - Dons en nature |
| Mecenat competences | 875000 - Mecenat de competences |
| Abandon de frais | 754200 - Abandon de frais par les benevoles |

---

## 6. Gestion des Subventions

### 6.1 Modeles

#### Financeur

```javascript
{
  id: INTEGER PRIMARY KEY,

  type: ENUM('collectivite', 'etat', 'europe', 'fondation', 'entreprise', 'autre'),
  sous_type: STRING(50),                   // "Commune", "Departement", "Region", "DRAC"

  // Identite
  nom: STRING(100) NOT NULL,               // "Mairie de Lyon"
  sigle: STRING(20),                       // "ML"

  // Coordonnees
  adresse: TEXT,
  code_postal: STRING(10),
  ville: STRING(100),

  email_general: STRING(100),
  telephone: STRING(20),
  site_web: STRING(255),

  // Contact principal
  contact_nom: STRING(100),
  contact_fonction: STRING(100),
  contact_email: STRING(100),
  contact_telephone: STRING(20),

  // Informations subventions
  plateforme_depot: STRING(255),           // "Demarches Simplifiees", URL specifique
  date_limite_depot: STRING(100),          // "15 avril" ou "Permanente"
  periode_instruction: STRING(100),        // "2-3 mois"

  // Documents requis (JSON)
  documents_requis: JSON,                  // ["Statuts", "Comptes N-1", "Budget previsionnel", ...]

  // Historique
  montant_total_obtenu: DECIMAL(12,2) DEFAULT 0,
  nb_subventions_obtenues: INTEGER DEFAULT 0,
  derniere_subvention_date: DATE,

  notes: TEXT,
  actif: BOOLEAN DEFAULT true,

  created_at, updated_at
}
```

#### Subvention

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER NOT NULL,
  exercice: INTEGER NOT NULL,

  // Financeur
  financeur_id: INTEGER NOT NULL,          // FK Financeur

  // Projet (optionnel)
  projet_id: INTEGER,                      // FK ProjetBudgetaire

  // Identification
  reference_interne: STRING(20) UNIQUE,    // "SUB-2025-00001"
  reference_externe: STRING(100),          // Reference du financeur

  // Type
  type_subvention: ENUM('fonctionnement', 'investissement', 'projet', 'emploi_aide'),

  objet: STRING(255) NOT NULL,             // "Fonctionnement 2025"
  description: TEXT,

  // Montants
  montant_demande: DECIMAL(12,2),
  montant_accorde: DECIMAL(12,2),
  montant_verse: DECIMAL(12,2) DEFAULT 0,
  montant_utilise: DECIMAL(12,2) DEFAULT 0,
  montant_a_rembourser: DECIMAL(12,2) DEFAULT 0,  // Si trop percu

  // Fonds dedies
  est_fonds_dedie: BOOLEAN DEFAULT false,
  affectation_obligatoire: TEXT,           // Description de l'affectation

  // Cycle de vie
  statut: ENUM(
    'identification',                      // Opportunite identifiee
    'en_preparation',                      // Dossier en cours
    'soumise',                             // Dossier depose
    'instruction',                         // En cours d'instruction
    'accordee',                            // Decision favorable
    'refusee',                             // Decision defavorable
    'versement_partiel',                   // Versements en cours
    'versee',                              // Totalement versee
    'compte_rendu',                        // CR en cours
    'cloturee',                            // Terminee
    'annulee'
  ),

  // Dates cles
  date_identification: DATE,
  date_limite_depot: DATE,
  date_depot: DATE,
  date_decision: DATE,
  date_notification: DATE,
  date_convention: DATE,
  date_premier_versement: DATE,
  date_dernier_versement: DATE,
  date_limite_compte_rendu: DATE,
  date_compte_rendu: DATE,
  date_cloture: DATE,

  // Documents
  dossier_demande_path: STRING(255),       // CERFA 12156
  notification_path: STRING(255),
  convention_path: STRING(255),
  compte_rendu_path: STRING(255),          // CERFA 15059

  // Comptabilite
  compte_produit_id: INTEGER,              // FK CompteComptable (74xxxx)
  section_analytique_id: INTEGER,

  // Liens recettes
  recettes: JSON,                          // [{recette_id, montant, date}, ...]

  responsable_id: INTEGER,                 // FK Utilisateur
  notes: TEXT,

  created_at, updated_at
}
```

#### ConventionSubvention

```javascript
{
  id: INTEGER PRIMARY KEY,
  subvention_id: INTEGER NOT NULL,         // FK Subvention

  // Identification
  numero_convention: STRING(50),
  date_signature: DATE,
  date_debut: DATE,
  date_fin: DATE,

  // Versements prevus
  echeancier_versements: JSON,             // [{date, montant, condition}, ...]

  // Clauses et obligations (JSON)
  clauses: JSON,                           /* [
    {type: "reporting", description: "Rapport semestriel", echeance: "30/06"},
    {type: "logo", description: "Logo financeur sur communications"},
    {type: "mention", description: "Mention obligatoire"},
    {type: "audit", description: "Droit de controle sur pieces"}
  ] */

  // Suivi des obligations
  obligations_suivi: JSON,                 /* [
    {clause_id: 1, statut: "fait", date: "15/06/2025", commentaire: "..."}
  ] */

  // Fichiers
  convention_signee_path: STRING(255),
  avenants_paths: JSON,                    // ["avenant1.pdf", "avenant2.pdf"]

  notes: TEXT,

  created_at, updated_at
}
```

#### VersementSubvention

```javascript
{
  id: INTEGER PRIMARY KEY,
  subvention_id: INTEGER NOT NULL,         // FK Subvention

  // Versement
  numero_ordre: INTEGER,                   // 1, 2, 3...
  montant: DECIMAL(12,2) NOT NULL,
  date_versement: DATE NOT NULL,

  // Encaissement
  mode_paiement_id: INTEGER,
  compte_bancaire_id: INTEGER,
  reference: STRING(100),                  // Reference virement

  // Lien recette
  recette_id: INTEGER,                     // FK Recette

  notes: TEXT,

  created_at, updated_at
}
```

### 6.2 CERFA Subventions

#### CERFA 12156*06 - Demande de subvention

```javascript
// Donnees pour pre-remplissage
{
  // Identification association
  nom_association: "...",
  sigle: "...",
  numero_rna: "W...",
  numero_siret: "...",
  adresse_siege: "...",

  // Representant legal
  representant_nom: "...",
  representant_qualite: "President",

  // Objet de la demande
  objet_demande: "...",

  // Montant
  montant_demande: 15000.00,

  // Budget previsionnel du projet/fonctionnement
  charges: [...],
  produits: [...],

  // Autres financements
  autres_subventions: [...],

  // Pieces jointes
  pieces_jointes: [
    "Statuts",
    "Liste des dirigeants",
    "Comptes approuves N-1",
    "Budget previsionnel N",
    "RIB"
  ]
}
```

#### CERFA 15059*02 - Compte rendu financier

```javascript
// Donnees pour pre-remplissage (6 mois apres fin exercice)
{
  // Subvention concernee
  reference_subvention: "...",
  montant_attribue: 15000.00,
  objet: "...",

  // Depenses realisees
  depenses: [
    {poste: "Achats", prevu: 5000, realise: 4800},
    {poste: "Services", prevu: 3000, realise: 3200},
    // ...
  ],

  // Recettes realisees
  recettes: [
    {poste: "Subvention objet demande", prevu: 15000, realise: 15000},
    {poste: "Autres subventions", prevu: 5000, realise: 4000},
    // ...
  ],

  // Ecart et justification
  ecart_total: -1200,
  justification_ecart: "...",

  // Contribution volontaire
  benevolat_heures: 500,
  benevolat_valorisation: 5940.00
}
```

---

## 7. Budget Previsionnel et Suivi

### 7.1 Structure du budget

```
BUDGET PREVISIONNEL 2025 - Perimetre "Ludotheque"
+--------------------------------------------------------------------+
| CHARGES (Classe 6)                | Pessimiste | Realiste | Optimiste |
+--------------------------------------------------------------------+
| 60 - Achats                       |            |          |           |
|   601 - Achats jeux               |   8 000    |  10 000  |  12 000   |
|   602 - Fournitures               |   1 000    |   1 500  |   2 000   |
| 61 - Services exterieurs          |            |          |           |
|   613 - Loyer                     |   6 000    |   6 000  |   6 000   |
|   615 - Entretien                 |     500    |     800  |   1 000   |
| 62 - Autres services              |            |          |           |
|   623 - Communication             |     500    |   1 000  |   1 500   |
| 63 - Impots et taxes              |     200    |     200  |     200   |
| 64 - Charges de personnel         |            |          |           |
|   641 - Salaires                  |  20 000    |  20 000  |  20 000   |
|   645 - Charges sociales          |   8 000    |   8 000  |   8 000   |
| 65 - Autres charges               |     500    |     500  |     500   |
| 66 - Charges financieres          |     100    |     100  |     100   |
| 68 - Dotations amortissements     |   1 000    |   1 000  |   1 000   |
+--------------------------------------------------------------------+
| TOTAL CHARGES                     |  45 800    |  49 100  |  52 300   |
| + Provision imprevu (5%)          |   2 290    |   2 455  |   2 615   |
| = TOTAL CHARGES AVEC PROVISION    |  48 090    |  51 555  |  54 915   |
+--------------------------------------------------------------------+

+--------------------------------------------------------------------+
| PRODUITS (Classe 7)               | Pessimiste | Realiste | Optimiste |
+--------------------------------------------------------------------+
| 70 - Ventes, prestations          |            |          |           |
|   701 - Cotisations               |  15 000    |  18 000  |  22 000   |
|   707 - Ventes boutique           |     500    |   1 000  |   2 000   |
| 74 - Subventions                  |            |          |           |
|   741 - Subvention Mairie         |  20 000    |  20 000  |  20 000   |
|   742 - Subvention Departement    |   5 000    |   8 000  |  10 000   |
| 75 - Autres produits              |            |          |           |
|   754 - Dons                      |   1 000    |   2 000  |   4 000   |
|   758 - Divers                    |     500    |   1 000  |   1 500   |
| 77 - Produits exceptionnels       |       0    |     500  |   1 000   |
| 78 - Reprises provisions          |       0    |       0  |       0   |
+--------------------------------------------------------------------+
| TOTAL PRODUITS                    |  42 000    |  50 500  |  60 500   |
+--------------------------------------------------------------------+

+--------------------------------------------------------------------+
| RESULTAT PREVISIONNEL             |  -6 090    |  -1 055  |  +5 585   |
+--------------------------------------------------------------------+

+--------------------------------------------------------------------+
| CONTRIBUTIONS VOLONTAIRES (Cl. 8) |            |          |           |
+--------------------------------------------------------------------+
| 87 - Benevolat valorise           |   5 000    |   8 000  |  12 000   |
+--------------------------------------------------------------------+
```

### 7.2 Suivi previsionnel vs realise

```
SUIVI BUDGETAIRE 2025 - Ludotheque (au 30/06/2025)
+------------------------------------------------------------------------+
| Ligne                    | Prevu    | Realise  | Ecart    | %     | ! |
+------------------------------------------------------------------------+
| CHARGES                  |          |          |          |       |   |
| Achats jeux              |  10 000  |   6 500  |  -3 500  |  65%  |   |
| Fournitures              |   1 500  |   2 100  |    +600  | 140%  | ! |
| Loyer                    |   6 000  |   3 000  |  -3 000  |  50%  |   |
| ...                      |          |          |          |       |   |
+------------------------------------------------------------------------+
| TOTAL CHARGES            |  49 100  |  28 500  | -20 600  |  58%  |   |
+------------------------------------------------------------------------+
| PRODUITS                 |          |          |          |       |   |
| Cotisations              |  18 000  |  12 000  |  -6 000  |  67%  |   |
| Subvention Mairie        |  20 000  |  20 000  |       0  | 100%  |   |
| Subvention Departement   |   8 000  |       0  |  -8 000  |   0%  | ! |
| ...                      |          |          |          |       |   |
+------------------------------------------------------------------------+
| TOTAL PRODUITS           |  50 500  |  34 000  | -16 500  |  67%  |   |
+------------------------------------------------------------------------+
| RESULTAT                 |  -1 055  |  +5 500  |  +6 555  |       |   |
+------------------------------------------------------------------------+

! = Ecart > seuil d'alerte (20% par defaut)
```

---

## 8. Depenses et Recettes

### 8.1 Categories de depenses

```javascript
const CATEGORIES_DEPENSES = {
  fonctionnement: {
    achats_collection: {
      libelle: "Achats collection",
      compte_defaut: "601000",
      description: "Jeux, livres, films, disques"
    },
    fournitures: {
      libelle: "Fournitures",
      compte_defaut: "602000",
      description: "Bureau, consommables, petit equipement"
    },
    services: {
      libelle: "Services exterieurs",
      compte_defaut: "611000",
      description: "Prestations, sous-traitance"
    },
    personnel: {
      libelle: "Personnel",
      compte_defaut: "641000",
      description: "Salaires bruts"
    },
    charges_sociales: {
      libelle: "Charges sociales",
      compte_defaut: "645000",
      description: "Cotisations patronales"
    },
    locaux: {
      libelle: "Locaux",
      compte_defaut: "613000",
      description: "Loyer, charges locatives"
    },
    energie: {
      libelle: "Energie",
      compte_defaut: "606000",
      description: "Electricite, gaz, eau"
    },
    assurances: {
      libelle: "Assurances",
      compte_defaut: "616000",
      description: "RC, local, materiel"
    },
    communication: {
      libelle: "Communication",
      compte_defaut: "623000",
      description: "Publicite, site web, flyers"
    },
    animations: {
      libelle: "Animations",
      compte_defaut: "625000",
      description: "Intervenants, materiel evenements"
    },
    deplacements: {
      libelle: "Deplacements",
      compte_defaut: "625100",
      description: "Transport, frais mission"
    },
    frais_bancaires: {
      libelle: "Frais bancaires",
      compte_defaut: "627000",
      description: "Commissions, agios"
    },
    impots_taxes: {
      libelle: "Impots et taxes",
      compte_defaut: "635000",
      description: "CFE, taxes diverses"
    },
    divers: {
      libelle: "Divers",
      compte_defaut: "658000",
      description: "Autres charges"
    }
  },
  investissement: {
    mobilier: {
      libelle: "Mobilier",
      compte_defaut: "218400",
      description: "Rayonnages, tables, chaises"
    },
    informatique: {
      libelle: "Materiel informatique",
      compte_defaut: "218300",
      description: "Ordinateurs, imprimantes"
    },
    amenagement: {
      libelle: "Amenagements",
      compte_defaut: "218100",
      description: "Travaux d'amenagement"
    }
  }
};
```

### 8.2 Integration automatique des achats collection

Quand un article est ajoute dans un module collection (jeux, livres, films, disques) avec un prix d'achat, une depense peut etre creee automatiquement.

```javascript
// Declencheur sur creation article avec prix_achat
async function onArticleCreated(article, module) {
  if (article.prix_achat && article.prix_achat > 0) {
    // Trouver le perimetre correspondant au module
    const perimetre = await PerimetreBudgetaire.findOne({
      where: { modules: { [Op.contains]: [module] } }
    });

    if (perimetre && perimetre.integration_achats_auto) {
      await Depense.create({
        perimetre_id: perimetre.id,
        exercice: new Date().getFullYear(),
        date_piece: article.date_acquisition || new Date(),
        montant_ttc: article.prix_achat,
        categorie: 'achats_collection',
        libelle: `Achat ${module}: ${article.titre}`,
        source_integration: 'collection',
        source_id: article.id,
        statut: 'brouillon'  // A valider manuellement
      });
    }
  }
}
```

---

## 9. Tresorerie

### 9.1 Modele FluxTresorerie

```javascript
{
  id: INTEGER PRIMARY KEY,
  perimetre_id: INTEGER,                   // NULL = global association
  compte_bancaire_id: INTEGER NOT NULL,    // FK CompteBancaire

  date_flux: DATE NOT NULL,

  type: ENUM('reel', 'previsionnel'),

  // Montants
  montant_entree: DECIMAL(12,2) DEFAULT 0,
  montant_sortie: DECIMAL(12,2) DEFAULT 0,

  // Solde (calcule)
  solde_apres: DECIMAL(12,2),

  // Source
  source_type: ENUM('depense', 'recette', 'virement_interne', 'prevision', 'import_bancaire'),
  source_id: INTEGER,

  libelle: STRING(255),

  // Rapprochement bancaire
  rapproche: BOOLEAN DEFAULT false,
  date_rapprochement: DATE,
  reference_releve: STRING(50),

  created_at, updated_at
}
```

### 9.2 Projection de tresorerie

```
PROJECTION TRESORERIE - 6 prochains mois
+------------------------------------------------------------------------+
| Mois       | Solde debut | Entrees  | Sorties  | Solde fin | Alerte   |
+------------------------------------------------------------------------+
| Juillet    |    15 000   |   8 000  |  12 000  |   11 000  |          |
| Aout       |    11 000   |   2 000  |   8 000  |    5 000  |    !     |
| Septembre  |     5 000   |  25 000  |  10 000  |   20 000  |          |
| Octobre    |    20 000   |   5 000  |  12 000  |   13 000  |          |
| Novembre   |    13 000   |   6 000  |  11 000  |    8 000  |          |
| Decembre   |     8 000   |  10 000  |  15 000  |    3 000  |    !!    |
+------------------------------------------------------------------------+

! = Solde < seuil alerte (10 000 EUR)
!! = Solde < seuil critique (5 000 EUR)
```

### 9.3 Import bancaire

Formats supportes :
- OFX (Open Financial Exchange)
- QIF (Quicken Interchange Format)
- CSV (format configurable par banque)

```javascript
// Configuration import CSV par banque
{
  banque: "Credit Agricole",
  separateur: ";",
  encodage: "ISO-8859-1",
  colonnes: {
    date: 0,
    libelle: 1,
    debit: 3,
    credit: 4,
    reference: 2
  },
  format_date: "DD/MM/YYYY",
  format_montant: "virgule",              // "virgule" ou "point"
  lignes_entete: 1
}
```

---

## 10. Workflow de Validation

### 10.1 Circuit de validation des depenses

```
+-------------+     +---------------+     +---------------+     +------------------+
|  BROUILLON  | --> |    SOUMISE    | --> |  VALIDEE N1   | --> |   VALIDEE N2     |
| (Saisisseur)|     | (Gestionnaire)|     |  (Comptable)  |     | (Tresorier/Resp) |
+-------------+     +---------------+     +---------------+     +------------------+
                           |                     |                       |
                           v                     v                       v
                      +---------+           +---------+            +---------+
                      | REJETEE |           | REJETEE |            | REJETEE |
                      +---------+           +---------+            +---------+
                                                                         |
                                                                         v
                                                               +------------------+
                                                               |  VALIDEE FINALE  |
                                                               |   (President)    |
                                                               +------------------+
                                                                         |
                                                                         v
                                                               +------------------+
                                                               |      PAYEE       |
                                                               +------------------+
```

### 10.2 Regles de validation

```javascript
const REGLES_VALIDATION = {
  // Seuils de validation
  seuils: {
    validation_n1_obligatoire: 0,          // Toujours
    validation_n2_obligatoire: 500,        // Si montant >= 500 EUR
    validation_finale_obligatoire: 2000    // Si montant >= 2000 EUR
  },

  // Qui peut valider chaque niveau
  validateurs: {
    n1: ['comptable', 'administrateur'],
    n2: ['comptable', 'administrateur'],   // Comptable senior ou tresorier
    finale: ['administrateur']              // President ou bureau
  },

  // Un validateur ne peut pas valider sa propre depense
  auto_validation_interdite: true,

  // Delai max entre soumission et validation
  delai_validation_jours: 30,

  // Notifications
  notifier_validateur_suivant: true,
  notifier_soumetteur_decision: true
};
```

### 10.3 Gestion des rejets

```javascript
{
  motifs_rejet_predifinis: [
    "Justificatif manquant ou illisible",
    "Montant incorrect",
    "Affectation budgetaire incorrecte",
    "Depense non autorisee",
    "Doublon",
    "Information manquante",
    "Autre (preciser)"
  ],

  // Action apres rejet
  action_rejet: "retour_brouillon",        // Retour en brouillon pour correction

  // Possibilite de resoumission
  nb_resoumissions_max: 3
}
```

---

## 11. Integrations Automatiques

### 11.1 Cotisations vers Recettes

```javascript
// Lors de la validation d'une cotisation
async function onCotisationValidee(cotisation) {
  // Trouver le perimetre global ou par defaut
  const perimetre = await PerimetreBudgetaire.findOne({
    where: { est_global: true }
  });

  await Recette.create({
    perimetre_id: perimetre.id,
    exercice: new Date(cotisation.date_debut).getFullYear(),
    type_recette: 'cotisation_integration',
    source: `${cotisation.utilisateur.prenom} ${cotisation.utilisateur.nom}`,
    montant_ttc: cotisation.montant_paye,
    date_piece: cotisation.date_paiement,
    date_encaissement: cotisation.date_paiement,
    compte_comptable_id: COMPTE_COTISATIONS,  // 756xxx
    source_integration: 'cotisation',
    source_id: cotisation.id,
    statut: 'encaissee',
    libelle: `Cotisation ${cotisation.tarif.nom}`
  });
}
```

### 11.2 Amendes vers Recettes

```javascript
// Lors du paiement d'une amende de retard
async function onAmendePayee(emprunt, montantAmende) {
  // Determiner le perimetre selon le module de l'article
  const module = emprunt.getModuleArticle();  // 'ludotheque', 'bibliotheque', etc.
  const perimetre = await PerimetreBudgetaire.findByModule(module);

  await Recette.create({
    perimetre_id: perimetre.id,
    exercice: new Date().getFullYear(),
    type_recette: 'amende',
    source: `${emprunt.utilisateur.prenom} ${emprunt.utilisateur.nom}`,
    montant_ttc: montantAmende,
    date_piece: new Date(),
    date_encaissement: new Date(),
    source_integration: 'amende',
    source_id: emprunt.id,
    statut: 'encaissee',
    libelle: `Amende retard - ${emprunt.article.titre}`
  });
}
```

### 11.3 Achats collection vers Depenses

```javascript
// Lors de l'ajout d'un article avec prix d'achat
async function onArticleAjoute(article, module) {
  if (!article.prix_achat || article.prix_achat <= 0) return;

  const perimetre = await PerimetreBudgetaire.findByModule(module);
  if (!perimetre || !perimetre.integration_achats_auto) return;

  await Depense.create({
    perimetre_id: perimetre.id,
    exercice: new Date().getFullYear(),
    date_piece: article.date_acquisition || new Date(),
    montant_ttc: article.prix_achat,
    categorie: 'achats_collection',
    compte_comptable_id: COMPTE_ACHATS_COLLECTION,  // 601xxx
    source_integration: 'collection',
    source_id: article.id,
    statut: 'brouillon',  // Necessite validation
    libelle: `Achat: ${article.titre}`,
    notes: `Import automatique depuis module ${module}`
  });
}
```

### 11.4 Import bancaire

```javascript
// Service d'import
class ImportBancaireService {

  async importerReleve(compteId, fichier, format) {
    const config = await ConfigImportBancaire.findByFormat(format);
    const lignes = await this.parserFichier(fichier, config);

    const resultats = {
      importees: 0,
      rapprochees: 0,
      non_rapprochees: 0,
      erreurs: []
    };

    for (const ligne of lignes) {
      try {
        // Creer le flux de tresorerie
        const flux = await FluxTresorerie.create({
          compte_bancaire_id: compteId,
          date_flux: ligne.date,
          type: 'reel',
          montant_entree: ligne.credit || 0,
          montant_sortie: ligne.debit || 0,
          source_type: 'import_bancaire',
          libelle: ligne.libelle,
          reference_releve: ligne.reference
        });

        // Tenter le rapprochement automatique
        const operation = await this.rechercherOperation(ligne);
        if (operation) {
          await this.rapprocher(flux, operation);
          resultats.rapprochees++;
        } else {
          resultats.non_rapprochees++;
        }

        resultats.importees++;
      } catch (err) {
        resultats.erreurs.push({ ligne, erreur: err.message });
      }
    }

    return resultats;
  }

  async rechercherOperation(ligneBancaire) {
    // Recherche par montant + date approximative + reference
    // ...
  }

  async rapprocher(flux, operation) {
    flux.rapproche = true;
    flux.date_rapprochement = new Date();
    flux.source_type = operation.type;  // 'depense' ou 'recette'
    flux.source_id = operation.id;
    await flux.save();

    // Mettre a jour l'operation
    if (operation.type === 'depense') {
      operation.statut = 'payee';
    } else {
      operation.statut = 'encaissee';
    }
    await operation.save();
  }
}
```

---

## 12. API Routes

### 12.1 Perimetres budgetaires

```
GET    /api/budget/perimetres                    # Liste des perimetres accessibles
GET    /api/budget/perimetres/:id                # Detail d'un perimetre
POST   /api/budget/perimetres                    # Creer un perimetre (admin)
PUT    /api/budget/perimetres/:id                # Modifier (admin)
DELETE /api/budget/perimetres/:id                # Supprimer (admin)
GET    /api/budget/perimetres/:id/droits         # Droits sur ce perimetre
POST   /api/budget/perimetres/:id/droits         # Affecter des droits
DELETE /api/budget/perimetres/:id/droits/:userId # Retirer des droits
```

### 12.2 Budgets previsionnels

```
GET    /api/budget/budgets                       # Liste des budgets
GET    /api/budget/budgets/:id                   # Detail avec lignes
POST   /api/budget/budgets                       # Creer un budget
PUT    /api/budget/budgets/:id                   # Modifier
DELETE /api/budget/budgets/:id                   # Supprimer (si brouillon)
POST   /api/budget/budgets/:id/proposer          # Soumettre pour validation
POST   /api/budget/budgets/:id/valider           # Valider
POST   /api/budget/budgets/:id/cloturer          # Cloturer l'exercice
POST   /api/budget/budgets/:id/dupliquer         # Dupliquer pour N+1
GET    /api/budget/budgets/:id/suivi             # Suivi previsionnel/realise
GET    /api/budget/budgets/:id/ecarts            # Analyse des ecarts
```

### 12.3 Lignes budgetaires

```
GET    /api/budget/budgets/:budgetId/lignes      # Lignes d'un budget
POST   /api/budget/budgets/:budgetId/lignes      # Ajouter une ligne
PUT    /api/budget/lignes/:id                    # Modifier une ligne
DELETE /api/budget/lignes/:id                    # Supprimer
POST   /api/budget/lignes/import                 # Import depuis modele
```

### 12.4 Depenses

```
GET    /api/budget/depenses                      # Liste avec filtres
GET    /api/budget/depenses/:id                  # Detail
POST   /api/budget/depenses                      # Creer (+ upload justificatif)
PUT    /api/budget/depenses/:id                  # Modifier
DELETE /api/budget/depenses/:id                  # Supprimer (si brouillon)
POST   /api/budget/depenses/:id/soumettre        # Soumettre validation
POST   /api/budget/depenses/:id/valider          # Valider niveau N
POST   /api/budget/depenses/:id/rejeter          # Rejeter
POST   /api/budget/depenses/:id/payer            # Marquer payee
POST   /api/budget/depenses/import               # Import CSV
GET    /api/budget/depenses/export               # Export
GET    /api/budget/depenses/categories           # Liste categories
```

### 12.5 Recettes

```
GET    /api/budget/recettes                      # Liste avec filtres
GET    /api/budget/recettes/:id                  # Detail
POST   /api/budget/recettes                      # Creer
PUT    /api/budget/recettes/:id                  # Modifier
DELETE /api/budget/recettes/:id                  # Supprimer
POST   /api/budget/recettes/:id/valider          # Valider
GET    /api/budget/recettes/export               # Export
```

### 12.6 Subventions

```
GET    /api/budget/subventions                   # Liste avec filtres
GET    /api/budget/subventions/:id               # Detail complet
POST   /api/budget/subventions                   # Creer demande
PUT    /api/budget/subventions/:id               # Modifier
DELETE /api/budget/subventions/:id               # Supprimer
PUT    /api/budget/subventions/:id/statut        # Changer statut
POST   /api/budget/subventions/:id/versement     # Enregistrer versement
GET    /api/budget/subventions/:id/convention    # Detail convention
PUT    /api/budget/subventions/:id/convention    # Modifier convention
GET    /api/budget/subventions/calendrier        # Calendrier echeances
GET    /api/budget/subventions/alertes           # Alertes (CR a rendre, etc.)
```

### 12.7 Financeurs

```
GET    /api/budget/financeurs                    # Liste
GET    /api/budget/financeurs/:id                # Detail
POST   /api/budget/financeurs                    # Creer
PUT    /api/budget/financeurs/:id                # Modifier
DELETE /api/budget/financeurs/:id                # Supprimer
GET    /api/budget/financeurs/:id/subventions    # Historique subventions
```

### 12.8 Benevolat

```
GET    /api/budget/benevolat/sessions            # Liste sessions
GET    /api/budget/benevolat/sessions/:id        # Detail
POST   /api/budget/benevolat/sessions            # Saisir heures
PUT    /api/budget/benevolat/sessions/:id        # Modifier
DELETE /api/budget/benevolat/sessions/:id        # Supprimer
POST   /api/budget/benevolat/sessions/:id/valider # Valider
GET    /api/budget/benevolat/bilan               # Bilan valorisation
GET    /api/budget/benevolat/benevoles           # Stats par benevole
GET    /api/budget/benevolat/activites           # Liste activites
POST   /api/budget/benevolat/activites           # Creer activite
GET    /api/budget/benevolat/taux                # Taux horaires
POST   /api/budget/benevolat/taux                # Creer taux
PUT    /api/budget/benevolat/taux/:id            # Modifier taux
```

### 12.9 Dons

```
GET    /api/budget/dons                          # Liste dons
GET    /api/budget/dons/:id                      # Detail
POST   /api/budget/dons                          # Enregistrer don
PUT    /api/budget/dons/:id                      # Modifier
DELETE /api/budget/dons/:id                      # Supprimer
POST   /api/budget/dons/:id/recu-fiscal          # Generer recu fiscal
GET    /api/budget/dons/stats                    # Statistiques dons
GET    /api/budget/donateurs                     # Liste donateurs
GET    /api/budget/donateurs/:id                 # Detail donateur
POST   /api/budget/donateurs                     # Creer donateur
PUT    /api/budget/donateurs/:id                 # Modifier
```

### 12.10 Tresorerie

```
GET    /api/budget/tresorerie/soldes             # Soldes actuels par compte
GET    /api/budget/tresorerie/flux               # Flux de tresorerie
GET    /api/budget/tresorerie/projection         # Projection N mois
POST   /api/budget/tresorerie/import             # Import releve bancaire
GET    /api/budget/tresorerie/rapprochement      # Operations a rapprocher
POST   /api/budget/tresorerie/rapprochement      # Rapprocher manuellement
```

### 12.11 Projets budgetaires

```
GET    /api/budget/projets                       # Liste projets
GET    /api/budget/projets/:id                   # Detail avec suivi financier
POST   /api/budget/projets                       # Creer projet
PUT    /api/budget/projets/:id                   # Modifier
DELETE /api/budget/projets/:id                   # Supprimer
GET    /api/budget/projets/:id/bilan             # Bilan financier
```

### 12.12 Reporting et exports

```
GET    /api/budget/dashboard                     # Tableau de bord
GET    /api/budget/consolidation                 # Consolidation multi-perimetres
GET    /api/budget/exercice/:annee/stats         # Statistiques exercice
GET    /api/budget/comparatif                    # Comparatif N/N-1/N-2
GET    /api/budget/alertes                       # Toutes les alertes

# Exports
GET    /api/budget/export/rapport-ag             # Rapport pour AG (PDF)
GET    /api/budget/export/suivi-budgetaire       # Suivi budgetaire (Excel)
GET    /api/budget/export/cerfa-12156/:subId     # CERFA demande subvention
GET    /api/budget/export/cerfa-15059/:subId     # CERFA compte-rendu
GET    /api/budget/export/cerfa-11580/:donId     # Recu fiscal don
GET    /api/budget/export/benevolat              # Bilan benevolat (PDF)
GET    /api/budget/export/tresorerie             # Etat tresorerie (Excel)
```

---

## 13. Interface Utilisateur

### 13.1 Pages admin

| Page | Description | Role min |
|------|-------------|----------|
| `/admin/budget-dashboard.html` | Tableau de bord budgetaire | gestionnaire |
| `/admin/budget-perimetres.html` | Gestion des perimetres | administrateur |
| `/admin/budget-previsionnel.html` | Budgets previsionnels | comptable |
| `/admin/depenses.html` | Saisie et suivi depenses | gestionnaire |
| `/admin/recettes.html` | Saisie et suivi recettes | gestionnaire |
| `/admin/subventions.html` | Gestion des subventions | gestionnaire |
| `/admin/financeurs.html` | Annuaire des financeurs | gestionnaire |
| `/admin/dons.html` | Gestion des dons | gestionnaire |
| `/admin/donateurs.html` | Annuaire des donateurs | gestionnaire |
| `/admin/benevolat.html` | Suivi du benevolat | gestionnaire |
| `/admin/benevolat-saisie.html` | Saisie heures benevoles | benevole* |
| `/admin/tresorerie.html` | Suivi tresorerie | comptable |
| `/admin/projets-budgetaires.html` | Gestion des projets | gestionnaire |
| `/admin/parametres-budget.html` | Configuration module | administrateur |

*Les benevoles peuvent saisir leurs propres heures uniquement

### 13.2 Navigation (ajout au menu existant)

```javascript
// Dans admin-navigation.js, ajouter :
{
  id: 'budget',
  label: 'Budget',
  icon: 'wallet2',
  href: 'budget-dashboard.html',
  minRole: 'gestionnaire',
  module: 'budget'  // Nouveau module a activer
}
```

### 13.3 Maquette tableau de bord

```
+------------------------------------------------------------------+
|  TABLEAU DE BORD BUDGETAIRE                    [Perimetre: v]    |
|  Exercice 2025                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | BUDGET PREVU     |  | REALISE          |  | EXECUTION        | |
|  |     85 000 EUR   |  |     42 500 EUR   |  |       50%        | |
|  | [===============>                    ] |                      | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | SOLDE TRESORERIE |  | SUBVENTIONS      |  | BENEVOLAT        | |
|  |     23 500 EUR   |  | 3 en attente     |  | 245h ce mois     | |
|  |     [OK]         |  | 28 000 EUR       |  | = 2 910 EUR      | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  +-------------------------------+  +---------------------------+ |
|  | CHARGES vs PRODUITS           |  | ALERTES                   | |
|  |                               |  |                           | |
|  | [Graphique barres empilees]   |  | ! Ecart >20% Fournitures  | |
|  |                               |  | ! CR Sub Mairie 15/01     | |
|  | Jan Fev Mar Avr Mai Jun ...   |  | ! 3 depenses a valider    | |
|  |                               |  | ! Tresorerie basse Aout   | |
|  +-------------------------------+  +---------------------------+ |
|                                                                   |
|  +-------------------------------+  +---------------------------+ |
|  | DEPENSES RECENTES             |  | SUBVENTIONS 2025          | |
|  | - Achats jeux (500 EUR)    14/12 | Mairie: 20 000 [VERSEE]   | |
|  | - EDF (180 EUR)            10/12 | Dept: 8 000 [ACCORDEE]    | |
|  | - Imprimeur (350 EUR)      08/12 | Region: ? [INSTRUCTION]   | |
|  | [Voir tout]                   |  | [Voir tout]               | |
|  +-------------------------------+  +---------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 14. Exports et CERFA

### 14.1 CERFA 12156*06 - Demande de subvention

Le systeme pre-remplit automatiquement :
- Identification de l'association (depuis ParametresStructure)
- Representant legal
- Budget previsionnel de l'action
- Financements deja obtenus

Export PDF remplissable ou donnees pour saisie manuelle.

### 14.2 CERFA 15059*02 - Compte rendu financier

Le systeme pre-remplit :
- Reference de la subvention
- Depenses realisees (depuis le suivi)
- Recettes realisees
- Ecarts et justifications
- Valorisation du benevolat

### 14.3 CERFA 11580*04 - Recu fiscal don

Generation automatique pour chaque don :
- Informations donateur
- Montant et nature du don
- Date du versement
- Signature numerisee du president

### 14.4 Rapport Assemblee Generale

Document PDF comprenant :
- Synthese de l'exercice
- Budget previsionnel vs realise
- Detail des charges et produits
- Subventions obtenues
- Bilan des dons
- Valorisation du benevolat
- Graphiques d'evolution
- Comparatif N/N-1

### 14.5 Export Excel suivi budgetaire

Classeur avec onglets :
- Synthese
- Detail charges
- Detail produits
- Suivi subventions
- Suivi tresorerie
- Benevolat

---

## 15. Configuration

### 15.1 Parametres du module

```javascript
{
  // === GENERAL ===
  module_actif: true,

  // === EXERCICE ===
  debut_exercice_mois: 1,                  // 1=Janvier, 9=Septembre
  exercice_en_cours: 2025,

  // === BUDGET ===
  taux_provision_imprevu: 5.0,             // 5%
  scenarios_actifs: ['pessimiste', 'realiste', 'optimiste'],

  // === ALERTES ===
  seuil_alerte_ecart_pourcentage: 20,
  seuil_alerte_ecart_montant: 1000,
  seuil_alerte_tresorerie: 5000,
  seuil_critique_tresorerie: 2000,
  jours_avant_echeance_subvention: 30,

  // === VALIDATION DEPENSES ===
  validation_obligatoire: true,
  seuil_validation_n2: 500,
  seuil_validation_finale: 2000,
  justificatif_obligatoire: true,
  taille_max_justificatif_mo: 10,
  formats_justificatif: ['pdf', 'jpg', 'jpeg', 'png'],

  // === INTEGRATIONS ===
  integration_cotisations: true,
  integration_amendes: true,
  integration_achats_collection: true,
  import_bancaire_actif: true,

  // === BENEVOLAT ===
  benevolat_actif: true,
  valorisation_compte_comptable: '870000',

  // === DONS ===
  dons_actif: true,
  recu_fiscal_actif: true,
  association_interet_general: true,       // Habilitation recus fiscaux
  taux_reduction_don: 66,                  // 66% ou 75%

  // === SUBVENTIONS ===
  cerfa_generation_auto: true,
  convention_suivi_clauses: true,

  // === NOTIFICATIONS ===
  notifier_validateurs: true,
  notifier_echeances: true,
  notifier_alertes_budget: true,

  // === COMPTABILITE ===
  generer_ecritures_auto: true,
  journal_achats: 'AC',
  journal_ventes: 'VT',
  journal_banque: 'BQ',
  journal_od: 'OD'
}
```

### 15.2 Comptes comptables par defaut

```javascript
{
  // Charges (classe 6)
  achats_collection: '601000',
  fournitures: '602000',
  services: '611000',
  loyer: '613000',
  entretien: '615000',
  assurances: '616000',
  honoraires: '622000',
  publicite: '623000',
  transports: '625000',
  frais_bancaires: '627000',
  impots: '635000',
  salaires: '641000',
  charges_sociales: '645000',
  dotations_amortissements: '681000',

  // Produits (classe 7)
  cotisations: '756100',
  ventes: '707000',
  prestations: '706000',
  subventions_fonctionnement: '741000',
  subventions_investissement: '131000',
  dons: '754100',
  amendes: '758100',

  // Contributions volontaires (classe 8)
  benevolat: '870000',
  dons_nature: '871000',
  mecenat_competences: '875000'
}
```

---

## 16. Planning de Developpement

### Phase 1 : Fondations (2 sprints)
- [ ] Modeles de base (PerimetreBudgetaire, Budget, LigneBudgetaire)
- [ ] Modeles Depense et Recette
- [ ] API CRUD de base
- [ ] Gestion des droits par perimetre
- [ ] Interface de saisie depenses avec upload justificatif
- [ ] Interface de saisie recettes

### Phase 2 : Budget Previsionnel (1 sprint)
- [ ] Interface budget previsionnel (3 scenarios)
- [ ] Calcul automatique des totaux
- [ ] Suivi previsionnel vs realise
- [ ] Tableau de bord basique

### Phase 3 : Workflow Validation (1 sprint)
- [ ] Circuit de validation multi-niveaux
- [ ] Notifications aux validateurs
- [ ] Interface de validation
- [ ] Historique des validations

### Phase 4 : Subventions (2 sprints)
- [ ] Modeles Financeur, Subvention, Convention, Versement
- [ ] Interface gestion subventions
- [ ] Tracking cycle de vie
- [ ] Calendrier des echeances
- [ ] Generation CERFA 12156 et 15059
- [ ] Suivi des conventions et clauses

### Phase 5 : Benevolat (1 sprint)
- [ ] Modeles TauxHoraire, Activite, Session
- [ ] Interface saisie heures
- [ ] Validation des heures
- [ ] Bilan et valorisation (compte 87)
- [ ] Export rapport benevolat

### Phase 6 : Dons (1 sprint)
- [ ] Modeles Donateur, Don
- [ ] Interface gestion dons
- [ ] Generation recus fiscaux CERFA 11580
- [ ] Statistiques et suivi donateurs

### Phase 7 : Tresorerie (1 sprint)
- [ ] Modele FluxTresorerie
- [ ] Import bancaire (OFX, CSV)
- [ ] Rapprochement automatique
- [ ] Projection de tresorerie
- [ ] Alertes seuils

### Phase 8 : Integrations (1 sprint)
- [ ] Integration cotisations -> recettes
- [ ] Integration amendes -> recettes
- [ ] Integration achats collection -> depenses
- [ ] Lien avec module comptable existant

### Phase 9 : Reporting Avance (1 sprint)
- [ ] Comparatif multi-exercices
- [ ] Consolidation multi-perimetres
- [ ] Export PDF rapport AG
- [ ] Export Excel complet
- [ ] Graphiques et visualisations

### Phase 10 : Finalisation (1 sprint)
- [ ] Configuration et parametrage
- [ ] Documentation utilisateur
- [ ] Tests et corrections
- [ ] Mise en production

---

## Estimation Technique Globale

| Composant | Quantite |
|-----------|----------|
| Nouveaux modeles Sequelize | 18 |
| Routes API | ~120 endpoints |
| Controleurs | 12 |
| Services | 10 |
| Pages admin HTML | 14 |
| Migrations | 5-6 fichiers |
| Sprints estimes | 12 sprints |

---

*Document genere le 14/12/2024*
*Version 2.0 - Valide pour developpement*
