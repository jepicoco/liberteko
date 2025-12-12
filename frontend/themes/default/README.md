# Comment creer un nouveau theme

## Structure d'un theme

Chaque theme est un dossier dans `frontend/themes/` avec la structure suivante :

```
mon-theme/
├── manifest.json          # Obligatoire - Metadonnees du theme
├── css/
│   └── theme.css          # Styles CSS du theme
├── js/
│   └── theme.js           # Scripts JavaScript (optionnel)
├── images/
│   └── ...                # Images du theme
├── index.html             # Page d'accueil personnalisee
├── catalogue.html         # Page catalogue personnalisee
├── fiche.html             # Page fiche article personnalisee
├── infos.html             # Page informations personnalisee
└── usager/
    ├── login.html         # Page connexion usager
    ├── dashboard.html     # Tableau de bord usager
    ├── emprunts.html      # Historique emprunts
    ├── profil.html        # Profil usager
    ├── forgot-password.html
    └── reset-password.html
```

## Le fichier manifest.json

Le fichier `manifest.json` est **obligatoire**. Il contient les metadonnees du theme.

Voir `manifest.example.json` pour un exemple complet.

### Champs obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Nom affiche du theme |
| `version` | string | Version semver (ex: "1.0.0") |
| `description` | string | Description du theme |
| `author` | string | Auteur du theme |
| `mode` | string | "light" ou "dark" |

### Champs couleurs (colors)

| Champ | Description |
|-------|-------------|
| `primary` | Couleur principale (boutons, liens) |
| `secondary` | Couleur secondaire |
| `accent` | Couleur d'accent |
| `background` | Fond principal |
| `backgroundSecondary` | Fond secondaire (cartes, sections) |
| `text` | Couleur du texte principal |
| `textSecondary` | Couleur du texte secondaire |
| `success` | Couleur de succes (vert) |
| `warning` | Couleur d'avertissement (orange) |
| `danger` | Couleur d'erreur (rouge) |
| `info` | Couleur d'information (bleu) |

### Champs style

| Champ | Valeurs possibles |
|-------|-------------------|
| `borderRadius` | ex: "8px", "0px", "16px" |
| `shadowStyle` | "subtle", "medium", "strong" |
| `navbarStyle` | "gradient", "solid", "transparent" |

## Variables CSS disponibles

Dans vos fichiers CSS, vous pouvez utiliser ces variables :

```css
:root {
  /* Couleurs principales */
  --color-primary: #667eea;
  --color-secondary: #764ba2;
  --color-accent: #20c997;

  /* Fonds */
  --color-background: #ffffff;
  --color-background-secondary: #f8f9fa;

  /* Textes */
  --color-text: #333333;
  --color-text-secondary: #6c757d;

  /* Etats */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Style */
  --border-radius: 8px;
}
```

## Pages personnalisables

Les pages suivantes peuvent etre personnalisees :

### Pages publiques
- `index.html` - Page d'accueil
- `catalogue.html` - Liste des articles
- `fiche.html` - Detail d'un article
- `infos.html` - Informations sur l'association

### Pages usager (espace membre)
- `usager/login.html` - Connexion
- `usager/dashboard.html` - Tableau de bord
- `usager/emprunts.html` - Historique des emprunts
- `usager/profil.html` - Profil utilisateur
- `usager/forgot-password.html` - Mot de passe oublie
- `usager/reset-password.html` - Reinitialisation du mot de passe

## APIs disponibles dans les pages

### Catalogue public
```javascript
// Liste des articles
GET /api/public/catalogue?type=jeu&search=monopoly&limit=50

// Detail d'un article
GET /api/public/catalogue/jeu/123
```

### Informations structure
```javascript
// Parametres publics
GET /api/parametres/structure/public

// Horaires d'ouverture
GET /api/calendrier/horaires
```

### Espace usager (avec authentification)
```javascript
// Token stocke dans localStorage sous 'usager_token'
const token = localStorage.getItem('usager_token');

// Headers pour les requetes authentifiees
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Emprunts de l'usager
GET /api/usager/emprunts

// Profil usager
GET /api/usager/auth/me
PUT /api/usager/auth/profil
```

## Bonnes pratiques

1. **Toujours inclure le CSS de base** : Votre `theme.css` doit definir toutes les variables CSS utilisees.

2. **Tester en mode light ET dark** : Verifiez que votre theme fonctionne avec les deux modes si applicable.

3. **Responsive design** : Assurez-vous que vos pages s'adaptent aux mobiles.

4. **Performance** : Optimisez vos images et minimisez le CSS/JS en production.

5. **Accessibilite** : Verifiez les contrastes de couleurs et la navigation au clavier.

## Exemple minimal

Pour creer un theme minimal qui change juste les couleurs :

1. Creer le dossier `frontend/themes/mon-theme/`
2. Creer `manifest.json` avec les couleurs souhaitees
3. Creer `css/theme.css` :

```css
/* Variables personnalisees */
:root {
  --color-primary: #your-color;
  --color-secondary: #your-color;
  /* ... */
}

/* Styles supplementaires si necessaire */
body {
  font-family: 'Votre Police', sans-serif;
}
```

Le theme sera automatiquement detecte et disponible dans l'administration.
