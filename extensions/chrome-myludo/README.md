# Extension Chrome Liberteko - Import MyLudo

Cette extension Chrome permet d'importer des jeux depuis MyLudo directement vers votre base de donnees Liberteko.

## Installation

### Mode developpeur (recommande pour les tests)

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le "Mode developpeur" en haut a droite
3. Cliquez sur "Charger l'extension non empaquetee"
4. Selectionnez le dossier `extensions/chrome-myludo`
5. L'extension apparait dans la barre d'outils

### Configuration

1. Cliquez sur l'icone de l'extension
2. Allez dans les parametres (ou clic droit > Options)
3. Entrez l'URL de votre serveur Liberteko
4. Entrez votre cle API (voir ci-dessous)
5. Testez la connexion

### Obtenir une cle API

1. Connectez-vous a l'administration Liberteko
2. Allez dans **Parametres > Services externes > Cles API**
3. Cliquez sur **Nouvelle Cle**
4. Configurez:
   - Nom: "Extension Chrome MyLudo"
   - Permissions: `jeux:read`, `jeux:create`, `jeux:update`, `images:upload`
   - Collection: Jeux
5. Copiez la cle generee (elle ne sera affichee qu'une fois!)

## Utilisation

1. Naviguez sur une page de jeu MyLudo (ex: `myludo.fr/#!/game/xxx`)
2. Un bouton "Liberteko" apparait en bas a droite
3. Cliquez sur l'icone de l'extension dans la barre d'outils
4. Verifiez les informations du jeu
5. Cliquez sur "Importer ce jeu"

Si le jeu existe deja (meme EAN), vous pourrez choisir de le mettre a jour.

## Structure des fichiers

```
chrome-myludo/
├── manifest.json      # Configuration de l'extension
├── popup.html         # Interface du popup
├── popup.js           # Logique du popup
├── options.html       # Page de configuration
├── options.js         # Logique de la configuration
├── content.js         # Script injecte dans MyLudo
├── content.css        # Styles du bouton flottant
├── background.js      # Service worker
└── icons/             # Icones de l'extension
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Icones

Vous devez fournir des icones PNG aux tailles suivantes:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Securite

- La cle API est stockee de maniere securisee dans le storage Chrome
- Les communications sont chiffrees via HTTPS
- Seul le domaine MyLudo est autorise

## Depannage

**L'extension ne detecte pas la page de jeu:**
- Verifiez que vous etes bien sur une URL du type `myludo.fr/#!/game/xxx`
- Rechargez la page apres installation de l'extension

**Erreur de connexion:**
- Verifiez l'URL du serveur (pas de slash final)
- Verifiez que la cle API est correcte et active
- Testez la connexion depuis les options

**Le jeu n'est pas importe:**
- Verifiez les permissions de la cle API
- Consultez les logs dans la console du navigateur
