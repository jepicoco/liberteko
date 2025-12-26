# Plan d'Implementation SIGB Bibliotheque

**Document genere le**: 25 decembre 2024
**Version**: 1.0
**Base**: Analyse du fichier `251224_bib-Requirements Summary.md`

---

## Table des Matieres

1. [Resume Executif](#1-resume-executif)
2. [Etat des Lieux - Fonctionnalites Existantes](#2-etat-des-lieux)
3. [Import ISO 2709 / MARC](#3-import-iso-2709--marc)
4. [Systeme de Cotes et Classification Dewey](#4-systeme-de-cotes-dewey)
5. [Gestion des Categories Inconnues](#5-gestion-des-categories-inconnues)
6. [Consultation Mobile en Rayon](#6-consultation-mobile-en-rayon)
7. [Module Evenements - Bourse aux Livres](#7-module-evenements)
8. [Conformite RGPD](#8-conformite-rgpd)
9. [Nettoyage des Notices](#9-nettoyage-des-notices)
10. [Ordre de Priorite et Planning](#10-ordre-de-priorite)
11. [Estimations Techniques](#11-estimations-techniques)

---

## 1. Resume Executif

### Contexte

Le projet Liberteko dispose deja d'une base solide pour la gestion de bibliotheque avec:
- Modele Notice/Exemplaire pleinement implemente
- Systeme de desherbage operationnel
- Multi-structures fonctionnel
- Caisse et comptabilite integrees

### Fonctionnalites a Developper

| Priorite | Fonctionnalite | Complexite | Effort |
|----------|----------------|------------|--------|
| P1 | Import ISO 2709 BDP | Haute | 5-8 jours |
| P1 | Classification Dewey + Cotes locales | Moyenne | 3-5 jours |
| P2 | Workflow categories inconnues | Moyenne | 2-3 jours |
| P2 | File d'impression etiquettes | Moyenne | 2-3 jours |
| P3 | Module Bourse aux livres | Moyenne | 3-4 jours |
| P3 | Automatisation RGPD | Faible | 1-2 jours |
| P4 | Nettoyage notices orphelines | Faible | 1 jour |

---

## 2. Etat des Lieux

### 2.1 Modele Notice / Exemplaire

**Status: IMPLEMENTE**

Le systeme distingue correctement:
- **Notice** (`Livre`, `Jeu`, `Film`, `Disque`) = Fiche bibliographique
- **Exemplaire** (`ExemplaireLivre`, etc.) = Copie physique

```
Livre (notice)
├── titre, auteur, ISBN, resume, genres...
└── exemplaires (1:N)
    ├── ExemplaireLivre #1 (code_barre: LIV00001, etat: bon, emplacement: Rayon A)
    ├── ExemplaireLivre #2 (code_barre: LIV00002, etat: neuf, emplacement: Reserve)
    └── ExemplaireLivre #3 (code_barre: LIV00003, etat: acceptable, emplacement: Rayon A)
```

**Tables de reference normalisees:**
- `Auteur` avec roles (auteur, traducteur, illustrateur...)
- `Editeur`, `GenreLitteraire`, `Theme`, `Langue`
- `FormatLivre`, `CollectionLivre`, `EmplacementLivre`

### 2.2 Systeme de Desherbage

**Status: IMPLEMENTE (vient d'etre termine)**

- `TypeSortie` - Types de sortie configurables (rebut, don, vente)
- `LotSortie` - Regroupement d'exemplaires a sortir
- `ArticleSortie` - Lien exemplaire ↔ lot avec valeur capturee
- Integration comptable automatique
- Fonds propres calcules depuis les exemplaires

### 2.3 Scanner et Prets

**Status: IMPLEMENTE**

- Scanner USB (douchette) + webcam QR code
- Gestion prets/retours par scan
- Validation des limites d'emprunt
- Controle retour avec mise en rayon
- Multi-collections (jeux, livres, films, disques)

### 2.4 Lookup EAN/ISBN

**Status: PARTIELLEMENT IMPLEMENTE**

Services existants dans `eanLookupService.js`:
- OpenLibrary (livres) - partiel
- BNF (livres) - disponible mais non priorise
- GoogleBooks - non finalise
- UPCitemdb, BGG, TMDB, MusicBrainz - autres collections

**Manque**: Parser ISO 2709 / MARC

### 2.5 Import de Donnees

**Status: JEUX UNIQUEMENT**

`importController.js` gere:
- Import CSV avec mapping de colonnes
- Preview avant import
- Creation auto des references (find-or-create)
- Progress SSE streaming

**Manque**: Import equivalent pour les livres

---

## 3. Import ISO 2709 / MARC

### 3.1 Contexte BDP

La Bibliotheque Departementale de Pret (BDP) fournit des lots de livres avec:
- Fichier ISO 2709 contenant les notices MARC
- Metadonnees de lot (provenance, dates, obligation de retour)
- Notices au format UNIMARC (standard francais)

### 3.2 Format ISO 2709

```
Structure d'un enregistrement ISO 2709:
┌─────────────────────────────────────────────────┐
│ Leader (24 caracteres)                          │
│ Directory (entrees de 12 caracteres chacune)    │
│ Separateur de champ                             │
│ Champs de donnees (avec sous-champs $a, $b...)  │
│ Separateur d'enregistrement                     │
└─────────────────────────────────────────────────┘
```

**Champs UNIMARC principaux:**
| Tag | Contenu | Mapping Liberteko |
|-----|---------|-------------------|
| 010 | ISBN | `livre.isbn` |
| 020 | Numero national | - |
| 200 | Titre | `livre.titre`, `sous_titre` |
| 210 | Editeur, lieu, date | `editeur`, `annee_publication` |
| 215 | Description physique | `nb_pages`, `format` |
| 225 | Collection | `collection` |
| 300 | Notes | `notes` |
| 330 | Resume | `resume` |
| 606 | Sujets | `themes`, `genres` |
| 676 | Classification Dewey | `dewey_code` (nouveau) |
| 700 | Auteur principal | `auteurs` (role: auteur) |
| 701 | Co-auteurs | `auteurs` (role: auteur) |
| 702 | Contributeurs | `auteurs` (role: selon $4) |

### 3.3 Architecture Proposee

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPORT ISO BDP                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Upload File  │───►│ MARC Parser  │───►│ Field Mapper │       │
│  │ (.mrc/.iso)  │    │              │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Preview    │◄───│  Authority   │◄───│  Validator   │       │
│  │   + Resolve  │    │   Matching   │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Confirm    │───►│ Bulk Insert  │───►│   Report     │       │
│  │   Import     │    │ Transaction  │    │   + Logs     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Fichiers a Creer

#### Service: `backend/services/marcParserService.js`

```javascript
/**
 * Service de parsing ISO 2709 / MARC
 * Supporte UNIMARC (France) et MARC21 (international)
 */

const FIELD_MAPPINGS = {
  unimarc: {
    isbn: { tag: '010', subfields: ['a'] },
    titre: { tag: '200', subfields: ['a'] },
    sousTitre: { tag: '200', subfields: ['e'] },
    auteurPrincipal: { tag: '700', subfields: ['a', 'b'] },
    coAuteurs: { tag: '701', subfields: ['a', 'b'] },
    editeur: { tag: '210', subfields: ['c'] },
    annee: { tag: '210', subfields: ['d'] },
    pages: { tag: '215', subfields: ['a'] },
    collection: { tag: '225', subfields: ['a'] },
    resume: { tag: '330', subfields: ['a'] },
    dewey: { tag: '676', subfields: ['a'] },
    sujets: { tag: '606', subfields: ['a'] }
  }
};

class MarcParserService {
  parseISO2709(buffer) { /* ... */ }
  parseRecord(recordData) { /* ... */ }
  extractField(record, tag, subfields) { /* ... */ }
  detectFormat(leader) { /* UNIMARC vs MARC21 */ }
  mapToLivre(marcRecord) { /* ... */ }
}
```

#### Controller: `backend/controllers/livreImportController.js`

```javascript
/**
 * Controller d'import de livres
 * - Import ISO 2709 (BDP)
 * - Import CSV
 * - Preview et resolution des conflits
 */

exports.uploadISO = async (req, res) => { /* ... */ };
exports.previewImport = async (req, res) => { /* ... */ };
exports.resolveCategories = async (req, res) => { /* ... */ };
exports.confirmImport = async (req, res) => { /* ... */ };
exports.getImportHistory = async (req, res) => { /* ... */ };
```

#### Routes: `backend/routes/livreImport.js`

```javascript
router.post('/iso', upload.single('file'), livreImportController.uploadISO);
router.get('/preview/:sessionId', livreImportController.previewImport);
router.post('/resolve/:sessionId', livreImportController.resolveCategories);
router.post('/confirm/:sessionId', livreImportController.confirmImport);
router.get('/history', livreImportController.getImportHistory);
```

#### Model: `backend/models/ImportSession.js`

```javascript
/**
 * Session d'import temporaire
 * Stocke les donnees en attente de confirmation
 */
const ImportSession = sequelize.define('ImportSession', {
  id: { type: DataTypes.UUID, primaryKey: true },
  type: { type: DataTypes.ENUM('iso', 'csv', 'api') },
  source: { type: DataTypes.STRING }, // 'bdp', 'bnf', 'savoie_biblio'
  filename: { type: DataTypes.STRING },
  total_records: { type: DataTypes.INTEGER },
  parsed_records: { type: DataTypes.JSON }, // Donnees parsees
  conflicts: { type: DataTypes.JSON }, // Categories/auteurs non resolus
  statut: { type: DataTypes.ENUM('pending', 'resolved', 'imported', 'cancelled') },
  imported_count: { type: DataTypes.INTEGER },
  error_count: { type: DataTypes.INTEGER },
  import_log: { type: DataTypes.JSON },
  structure_id: { type: DataTypes.INTEGER },
  created_by: { type: DataTypes.INTEGER },
  expires_at: { type: DataTypes.DATE } // Auto-cleanup apres 24h
});
```

#### Frontend: `frontend/admin/import-livres.html`

Interface wizard en 4 etapes:
1. **Upload** - Selection fichier ISO/CSV + parametres lot BDP
2. **Preview** - Affichage des notices parsees avec detection conflits
3. **Resolution** - Mapping categories inconnues, auteurs ambigus
4. **Import** - Confirmation + progress bar + rapport final

### 3.5 Gestion des Lots BDP

Les lots BDP ont des contraintes specifiques:
- Obligation de retour a une date donnee
- Inventaire requis
- Provenance tracee

**Model supplementaire**: `LotBDP`

```javascript
const LotBDP = sequelize.define('LotBDP', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero_lot: { type: DataTypes.STRING, unique: true },
  date_reception: { type: DataTypes.DATEONLY },
  date_retour_prevue: { type: DataTypes.DATEONLY },
  retourne: { type: DataTypes.BOOLEAN, defaultValue: false },
  date_retour_effectif: { type: DataTypes.DATEONLY },
  nb_exemplaires: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
  structure_id: { type: DataTypes.INTEGER }
});

// Lien avec exemplaires
ExemplaireLivre.belongsTo(LotBDP, { foreignKey: 'lot_bdp_id', as: 'lotBDP' });
```

---

## 4. Systeme de Cotes Dewey

### 4.1 Etat Actuel

**RIEN N'EXISTE** pour la classification Dewey ou les cotes locales:
- Pas de champ `cote` sur Livre ou ExemplaireLivre
- Pas de table de classification Dewey
- Pas de regles de construction de cotes locales
- `EmplacementLivre` = localisation physique (rayon), PAS la cote

### 4.2 Distinction Cote vs Emplacement

| Concept | Description | Exemple |
|---------|-------------|---------|
| **Emplacement** | Ou se trouve physiquement le livre | "Rayon A3", "Reserve", "Salle enfants" |
| **Cote** | Classification intellectuelle pour le rangement | "J SF LEG", "R 843 HUG", "153.4 PSY" |

Les deux sont necessaires et complementaires.

### 4.3 Syntaxe de Cote Locale (Requirements)

Le client utilise un systeme de cotes compose de:
1. **Prefixe public** : J (Jeunesse), R (Roman adulte), A (Adulte autre)
2. **Sous-genre** : RP (Policier), RSF (SF), RH (Historique), RT (Terreur), LCD (BD)
3. **Classification Dewey** : Pour les documentaires (000-999)
4. **Lettres auteur** : 3 premieres lettres du nom

**Exemples:**
- `J SF LEG` = Jeunesse, Science-Fiction, auteur "Le Guin"
- `R POL CHR` = Roman adulte, Policier, auteur "Christie"
- `153.4 PSY` = Documentaire Dewey 153.4 (Psychologie)
- `A 641 CUI` = Adulte, Dewey 641 (Cuisine)

### 4.4 Schema de Donnees Propose

#### Table: `dewey_classifications`

```sql
CREATE TABLE dewey_classifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,           -- "153", "153.4", "150-159"
  libelle VARCHAR(255) NOT NULL,       -- "Psychologie"
  libelle_en VARCHAR(255),             -- "Psychology"
  parent_code VARCHAR(20),             -- "150" pour "153"
  niveau INT DEFAULT 1,                -- 1=100s, 2=10s, 3=unites, 4+=decimales
  actif BOOLEAN DEFAULT TRUE,
  INDEX idx_code (code),
  INDEX idx_parent (parent_code)
);
```

#### Table: `regles_cotes` (par structure)

```sql
CREATE TABLE regles_cotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  structure_id INT,
  nom VARCHAR(100) NOT NULL,           -- "Fiction Jeunesse SF"
  prefixe VARCHAR(10),                 -- "J"
  sous_genre VARCHAR(10),              -- "SF"
  genre_litteraire_id INT,             -- Lien vers genre (optionnel)
  dewey_min VARCHAR(20),               -- "800" (pour limiter aux documentaires)
  dewey_max VARCHAR(20),               -- "899"
  utiliser_dewey BOOLEAN DEFAULT FALSE,
  nb_lettres_auteur INT DEFAULT 3,
  ordre_elements JSON,                 -- ["prefixe", "sous_genre", "auteur"]
  actif BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (structure_id) REFERENCES structures(id),
  FOREIGN KEY (genre_litteraire_id) REFERENCES genres_litteraires(id)
);
```

#### Table: `livre_cotes`

```sql
CREATE TABLE livre_cotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  livre_id INT NOT NULL,
  structure_id INT,
  dewey_bnf VARCHAR(20),               -- Dewey source BNF (ex: "153.45")
  dewey_local VARCHAR(20),             -- Dewey applique localement (ex: "153")
  cote_calculee VARCHAR(50),           -- Cote auto-generee
  cote_manuelle VARCHAR(50),           -- Override manuel
  cote_finale VARCHAR(50) AS (COALESCE(cote_manuelle, cote_calculee)) STORED,
  raison_override TEXT,                -- Pourquoi different de BNF
  valide BOOLEAN DEFAULT FALSE,
  valide_par INT,
  valide_le DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE KEY uk_livre_structure (livre_id, structure_id),
  FOREIGN KEY (livre_id) REFERENCES livres(id) ON DELETE CASCADE,
  FOREIGN KEY (structure_id) REFERENCES structures(id),
  FOREIGN KEY (valide_par) REFERENCES utilisateurs(id)
);
```

### 4.5 Service de Calcul de Cote

```javascript
// backend/services/coteService.js

class CoteService {

  /**
   * Calcule la cote d'un livre selon les regles de la structure
   */
  async calculerCote(livreId, structureId) {
    const livre = await Livre.findByPk(livreId, {
      include: ['auteursRef', 'genresRef']
    });

    const regles = await RegleCote.findAll({
      where: { structure_id: structureId, actif: true },
      order: [['ordre', 'ASC']]
    });

    // Trouver la regle applicable
    const regle = this.trouverRegleApplicable(livre, regles);

    if (!regle) {
      return null; // Pas de regle, cote manuelle requise
    }

    // Construire la cote
    const elements = [];

    for (const element of regle.ordre_elements) {
      switch (element) {
        case 'prefixe':
          elements.push(regle.prefixe);
          break;
        case 'sous_genre':
          elements.push(regle.sous_genre);
          break;
        case 'dewey':
          elements.push(this.truncateDewey(livre.dewey_code, regle.precision_dewey));
          break;
        case 'auteur':
          elements.push(this.getAuteurAbbrev(livre, regle.nb_lettres_auteur));
          break;
      }
    }

    return elements.filter(Boolean).join(' ');
  }

  /**
   * Compare la cote BNF avec la politique locale
   */
  async comparerAvecBNF(livreId, structureId) {
    const livreCote = await LivreCote.findOne({
      where: { livre_id: livreId, structure_id: structureId }
    });

    return {
      dewey_bnf: livreCote?.dewey_bnf,
      dewey_local: livreCote?.dewey_local,
      cote_suggeree: await this.calculerCote(livreId, structureId),
      divergence: livreCote?.dewey_bnf !== livreCote?.dewey_local
    };
  }

  /**
   * Recherche par plage Dewey
   */
  async rechercherParDewey(deweyPattern, structureId) {
    // Ex: "153" trouve 153, 153.1, 153.45...
    return LivreCote.findAll({
      where: {
        structure_id: structureId,
        dewey_local: { [Op.like]: `${deweyPattern}%` }
      },
      include: [{ model: Livre, as: 'livre' }]
    });
  }
}
```

### 4.6 Interface Admin

#### Page: `frontend/admin/parametres-cotes.html`

**Sections:**
1. **Classification Dewey** - Arbre hierarchique navigable
2. **Regles de cotes** - CRUD des regles par structure
3. **Mapping genres → prefixes** - Association genre litteraire ↔ prefixe cote
4. **Test de cote** - Simulateur pour verifier le resultat

#### Page: `frontend/admin/livres.html` (extension)

Ajouter dans le detail livre:
- Affichage cote actuelle
- Bouton "Modifier cote"
- Historique des changements de cote
- Comparaison BNF vs local

---

## 5. Gestion des Categories Inconnues

### 5.1 Problematique

Lors de l'import BDP/BNF, les categories (genres, sujets) peuvent:
- Ne pas exister dans la base locale
- Avoir un libelle different (ex: "SF" vs "Science-Fiction")
- Etre plus specifiques que souhaite (ex: "Roman policier scandinave")

### 5.2 Workflow de Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                 RESOLUTION CATEGORIES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Categorie inconnue detectee: "Roman policier scandinave"        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Actions possibles:                                          │ │
│  │                                                             │ │
│  │ ○ Creer la categorie                                        │ │
│  │   → Ajoute "Roman policier scandinave" aux genres           │ │
│  │                                                             │ │
│  │ ○ Mapper vers existante                                     │ │
│  │   → Remplacer par: [Policier        ▼]                      │ │
│  │                                                             │ │
│  │ ○ Ignorer                                                   │ │
│  │   → Ne pas attribuer de genre                               │ │
│  │                                                             │ │
│  │ ☐ Appliquer a tous les imports futurs                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Appliquer] [Passer]                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Table de Mapping

```sql
CREATE TABLE mappings_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  structure_id INT,
  source VARCHAR(50),                  -- 'bdp', 'bnf', 'savoie_biblio'
  categorie_source VARCHAR(255),       -- Libelle original
  action ENUM('creer', 'mapper', 'ignorer'),
  genre_litteraire_id INT,             -- Si action = 'mapper'
  actif BOOLEAN DEFAULT TRUE,
  created_at DATETIME,
  UNIQUE KEY uk_source_cat (structure_id, source, categorie_source),
  FOREIGN KEY (genre_litteraire_id) REFERENCES genres_litteraires(id)
);
```

### 5.4 Outils de Nettoyage

**Page: `frontend/admin/parametres-genres.html`**

- Liste des genres avec compteur d'utilisation
- Bouton "Fusionner" pour combiner deux genres
- Bouton "Supprimer" (seulement si 0 utilisation)
- Import/Export de la liste des genres
- Historique des modifications

---

## 6. Consultation Mobile en Rayon

### 6.1 Etat Actuel

**Scanner existant** (`frontend/admin/scanner.html`):
- Prets/retours fonctionnels
- Mise en rayon (controle retour)
- USB + webcam supportes

**Manque:**
- File d'impression d'etiquettes
- Mode "consultation rayon" (lecture seule enrichie)
- Synchronisation etiquettes avec poste fixe

### 6.2 File d'Impression d'Etiquettes

#### Model: `EtiquetteQueue`

```sql
CREATE TABLE etiquettes_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_type ENUM('jeu', 'livre', 'film', 'disque'),
  article_id INT NOT NULL,
  exemplaire_id INT,
  raison ENUM('nouveau', 'modification_cote', 'remplacement', 'autre'),
  notes TEXT,
  statut ENUM('en_attente', 'imprime', 'annule') DEFAULT 'en_attente',
  priorite INT DEFAULT 5,              -- 1=urgent, 10=basse
  quantite INT DEFAULT 1,
  ajoute_par INT,
  ajoute_le DATETIME DEFAULT CURRENT_TIMESTAMP,
  imprime_le DATETIME,
  structure_id INT,
  INDEX idx_statut (statut),
  INDEX idx_structure (structure_id)
);
```

#### API Etiquettes

```javascript
// Routes
POST   /api/etiquettes/queue          // Ajouter a la file
GET    /api/etiquettes/queue          // Liste en attente
DELETE /api/etiquettes/queue/:id      // Annuler
POST   /api/etiquettes/print-batch    // Generer PDF batch
POST   /api/etiquettes/mark-printed   // Marquer comme imprime
GET    /api/etiquettes/stats          // Statistiques file
```

#### Integration Scanner

Dans `scanner.js`, ajouter:

```javascript
// Bouton dans la zone de controle retour
async function ajouterEtiquetteQueue(articleType, articleId) {
  await apiRequest('/etiquettes/queue', {
    method: 'POST',
    body: JSON.stringify({
      article_type: articleType,
      article_id: articleId,
      raison: 'modification_cote'
    })
  });
  showAlert('Etiquette ajoutee a la file', 'success');
  updateEtiquettesBadge();
}
```

### 6.3 Mode Consultation Rayon

Nouveau mode dans le scanner pour consulter sans modifier:

**Fonctionnalites:**
- Scan → Affichage fiche complete (sans boutons pret/retour)
- Affichage: cote, emplacement, etat, historique emprunts
- Bouton "Demander etiquette"
- Bouton "Signaler probleme" (etat, emplacement incorrect)
- Navigation vers fiche complete (nouvel onglet)

---

## 7. Module Evenements

### 7.1 Bourse aux Livres

La bourse aux livres reutilise l'infrastructure existante:
- `TypeSortie` avec code "vente_bourse"
- `LotSortie` pour regrouper les articles a vendre
- `MouvementCaisse` avec categorie "vente"

### 7.2 Extensions Necessaires

#### Model: `Evenement`

```sql
CREATE TABLE evenements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('bourse_livres', 'braderie', 'vide_grenier', 'autre'),
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE,
  lieu VARCHAR(255),
  statut ENUM('planifie', 'en_cours', 'termine', 'annule') DEFAULT 'planifie',
  lot_sortie_id INT,                   -- Lot de sortie associe
  tarification JSON,                   -- {"livre_poche": 0.50, "livre_relie": 2.00}
  structure_id INT,
  created_at DATETIME,
  FOREIGN KEY (lot_sortie_id) REFERENCES lots_sortie(id),
  FOREIGN KEY (structure_id) REFERENCES structures(id)
);
```

#### Extension ArticleSortie

```sql
ALTER TABLE articles_sortie ADD COLUMN (
  evenement_id INT,
  prix_vente DECIMAL(10,2),            -- Prix de vente effectif
  vendu BOOLEAN DEFAULT FALSE,
  date_vente DATETIME,
  acheteur_nom VARCHAR(255),
  FOREIGN KEY (evenement_id) REFERENCES evenements(id)
);
```

### 7.3 Interface Point de Vente

**Page: `frontend/admin/evenement-caisse.html`**

Interface simplifiee pour benevoles:
1. Selection de l'evenement actif
2. Scan rapide des articles
3. Affichage prix selon tarification
4. Total courant
5. Bouton "Encaisser" → Cree mouvement caisse
6. Option d'imprimer recu

---

## 8. Conformite RGPD

### 8.1 Etat Actuel

**Implemente:**
- Archivage utilisateurs avec `UtilisateurArchive`
- Anonymisation apres 3 ans (remplace par *****)
- Charte usager avec validation OTP
- Filtrage PII par role
- Logs d'acces aux archives

**Manque:**
- Job automatique d'archivage/anonymisation
- Droit a l'oubli (API self-service)
- Export donnees personnelles (portabilite)
- Configuration duree retention

### 8.2 Job d'Archivage Automatique

#### Fichier: `backend/jobs/rgpdCleanup.js`

```javascript
const cron = require('node-cron');
const { Utilisateur, UtilisateurArchive, Emprunt, Cotisation } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Job RGPD: Archive et anonymise les comptes inactifs
 * Execute quotidiennement a 3h00
 */
const RETENTION_YEARS = 3;

async function archiveInactifs() {
  const dateLimite = new Date();
  dateLimite.setFullYear(dateLimite.getFullYear() - RETENTION_YEARS);

  // Trouver les utilisateurs inactifs
  const inactifs = await Utilisateur.findAll({
    where: {
      [Op.and]: [
        // Pas d'emprunt recent
        sequelize.literal(`NOT EXISTS (
          SELECT 1 FROM emprunts
          WHERE emprunts.utilisateur_id = Utilisateur.id
          AND emprunts.date_emprunt > '${dateLimite.toISOString()}'
        )`),
        // Pas de cotisation recente
        sequelize.literal(`NOT EXISTS (
          SELECT 1 FROM cotisations
          WHERE cotisations.utilisateur_id = Utilisateur.id
          AND cotisations.date_debut > '${dateLimite.toISOString()}'
        )`),
        // Pas d'emprunt en cours
        sequelize.literal(`NOT EXISTS (
          SELECT 1 FROM emprunts
          WHERE emprunts.utilisateur_id = Utilisateur.id
          AND emprunts.date_retour_effective IS NULL
        )`)
      ]
    }
  });

  logger.info(`RGPD: ${inactifs.length} utilisateurs inactifs trouves`);

  for (const user of inactifs) {
    await archiverUtilisateur(user, 'inactivite_3ans_auto');
  }

  // Anonymiser les archives de plus de 3 ans
  await anonymiserArchivesAnciennes();
}

// Planification: tous les jours a 3h00
cron.schedule('0 3 * * *', archiveInactifs);

module.exports = { archiveInactifs };
```

### 8.3 API Droit a l'Oubli

```javascript
// Route: POST /api/usager/demande-suppression
exports.demandeSuppressionCompte = async (req, res) => {
  const userId = req.usager.id;

  // Verifier pas d'emprunt en cours
  const empruntsEnCours = await Emprunt.count({
    where: { utilisateur_id: userId, date_retour_effective: null }
  });

  if (empruntsEnCours > 0) {
    return res.status(400).json({
      error: 'Vous avez des emprunts en cours. Retournez-les avant de demander la suppression.'
    });
  }

  // Creer demande
  await DemandeRGPD.create({
    utilisateur_id: userId,
    type: 'suppression',
    statut: 'en_attente'
  });

  // Notifier admin
  await notifierAdminDemandeRGPD(userId);

  res.json({ message: 'Demande enregistree. Un administrateur traitera votre demande.' });
};
```

---

## 9. Nettoyage des Notices

### 9.1 Fonctionnalite

Identifier et supprimer les notices sans exemplaires:
- Notice creee mais jamais d'exemplaire ajoute
- Tous les exemplaires supprimes/sortis

### 9.2 Implementation

```javascript
// backend/controllers/maintenanceController.js

exports.findNoticesOrphelines = async (req, res) => {
  const { module } = req.query; // 'livre', 'jeu', etc.

  const orphelines = await Livre.findAll({
    include: [{
      model: ExemplaireLivre,
      as: 'exemplaires',
      required: false
    }],
    having: sequelize.literal('COUNT(exemplaires.id) = 0'),
    group: ['Livre.id']
  });

  res.json({
    total: orphelines.length,
    notices: orphelines.map(n => ({
      id: n.id,
      titre: n.titre,
      created_at: n.created_at
    }))
  });
};

exports.deleteNoticesOrphelines = async (req, res) => {
  const { ids } = req.body;

  await Livre.destroy({
    where: { id: { [Op.in]: ids } }
  });

  res.json({ deleted: ids.length });
};
```

### 9.3 Interface

**Page: `frontend/admin/maintenance.html`**

Section "Nettoyage notices":
- Bouton "Rechercher notices orphelines"
- Liste avec selection multiple
- Bouton "Supprimer selectionnees"
- Option "Supprimer toutes" (avec confirmation)
- Filtre par anciennete (notices > 6 mois sans exemplaire)

---

## 10. Ordre de Priorite

### Phase 1 - Fondations (Semaine 1-2)

1. **Import ISO 2709**
   - Parser MARC/UNIMARC
   - Controller d'import livres
   - Interface wizard d'import

2. **Classification Dewey**
   - Tables dewey_classifications, regles_cotes, livre_cotes
   - Service de calcul de cote
   - Migration pour ajouter champs cote

### Phase 2 - Workflows (Semaine 3)

3. **Workflow categories inconnues**
   - Table mappings_categories
   - Interface de resolution dans wizard import
   - Outils de fusion/nettoyage genres

4. **File d'impression etiquettes**
   - Table etiquettes_queue
   - API et integration scanner
   - Generation PDF batch

### Phase 3 - Modules Complementaires (Semaine 4)

5. **Module Evenements**
   - Table evenements
   - Extension ArticleSortie
   - Interface point de vente simplifie

6. **Automatisation RGPD**
   - Job cron d'archivage
   - API droit a l'oubli
   - Export donnees personnelles

7. **Nettoyage notices**
   - Endpoint recherche orphelines
   - Interface maintenance

---

## 11. Estimations Techniques

### Migrations a Creer

| Migration | Tables/Colonnes |
|-----------|-----------------|
| `addImportSession` | import_sessions |
| `addLotBDP` | lots_bdp, FK sur exemplaires |
| `addDeweySystem` | dewey_classifications, regles_cotes, livre_cotes |
| `addMappingsCategories` | mappings_categories |
| `addEtiquetteQueue` | etiquettes_queue |
| `addEvenements` | evenements, colonnes sur articles_sortie |
| `addDemandesRGPD` | demandes_rgpd |

### Fichiers Backend a Creer

| Fichier | Description |
|---------|-------------|
| `services/marcParserService.js` | Parser ISO 2709 |
| `services/coteService.js` | Calcul cotes Dewey |
| `controllers/livreImportController.js` | Import livres |
| `controllers/etiquettesController.js` | Gestion file etiquettes |
| `controllers/evenementsController.js` | Gestion evenements |
| `routes/livreImport.js` | Routes import |
| `routes/etiquettes.js` | Routes etiquettes |
| `routes/evenements.js` | Routes evenements |
| `jobs/rgpdCleanup.js` | Job automatique RGPD |
| `models/ImportSession.js` | Session d'import |
| `models/LotBDP.js` | Lots BDP |
| `models/DeweyClassification.js` | Classification Dewey |
| `models/RegleCote.js` | Regles de cotes |
| `models/LivreCote.js` | Cotes par livre |
| `models/MappingCategorie.js` | Mappings categories |
| `models/EtiquetteQueue.js` | File etiquettes |
| `models/Evenement.js` | Evenements |
| `models/DemandeRGPD.js` | Demandes RGPD |

### Pages Frontend a Creer

| Page | Description |
|------|-------------|
| `import-livres.html` | Wizard import ISO/CSV |
| `parametres-cotes.html` | Configuration Dewey et regles |
| `parametres-genres.html` | Gestion genres + fusion |
| `evenements.html` | Liste evenements |
| `evenement-caisse.html` | Point de vente evenement |
| Extension `scanner.html` | Mode consultation + file etiquettes |
| Extension `maintenance.html` | Nettoyage notices |

### Dependances NPM a Ajouter

```json
{
  "marc-record-js": "^0.4.0",    // Parser MARC (ou iso2709 custom)
  "node-cron": "^3.0.0"          // Jobs planifies (si pas deja present)
}
```

---

## Annexes

### A. Ressources MARC/UNIMARC

- [Format UNIMARC (BNF)](https://www.bnf.fr/fr/format-unimarc)
- [ISO 2709 Specification](https://www.iso.org/standard/41319.html)
- [Library of Congress MARC Standards](https://www.loc.gov/marc/)

### B. Classification Dewey

- [Dewey Decimal Classification](https://www.oclc.org/dewey.en.html)
- Tables principales (000-999) a importer depuis source ouverte

### C. Contacts BDP

- Savoie Biblio: Format des fichiers ISO a confirmer
- BDP locale: Specifications lots et obligations retour

---

*Document genere par analyse automatique du codebase Liberteko*
*Derniere mise a jour: 25/12/2024*
