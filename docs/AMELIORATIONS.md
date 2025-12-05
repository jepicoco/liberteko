# Ameliorations futures

Ce document liste les ameliorations suggeres pour les futures versions de l'application.

---

## Protection backend des modules desactives

### Contexte actuel

La gestion des modules actifs (Holodeck) masque actuellement les fonctionnalites desactivees **cote frontend uniquement**. Un utilisateur technique pourrait theoriquement acceder aux endpoints API meme si le module est desactive.

### Amelioration suggeree

Ajouter un middleware `checkModuleActive(moduleCode)` pour bloquer les appels API vers les fonctionnalites dont le module est desactive.

### Implementation

```javascript
// backend/middleware/checkModule.js

const { ModuleActif } = require('../models');

/**
 * Middleware pour verifier si un module est actif
 * @param {string} moduleCode - Code du module a verifier
 * @returns {Function} - Middleware Express
 */
const checkModuleActive = (moduleCode) => {
  return async (req, res, next) => {
    try {
      const isActive = await ModuleActif.isActif(moduleCode);

      if (!isActive) {
        return res.status(403).json({
          error: 'Module desactive',
          module: moduleCode,
          message: `Le module "${moduleCode}" est actuellement desactive. Contactez l'administrateur.`
        });
      }

      next();
    } catch (error) {
      // En cas d'erreur (table non creee), laisser passer (fail-safe)
      console.warn(`Impossible de verifier le module ${moduleCode}:`, error.message);
      next();
    }
  };
};

module.exports = { checkModuleActive };
```

### Exemple d'utilisation

```javascript
// backend/routes/jeux.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkModuleActive } = require('../middleware/checkModule');
const jeuxController = require('../controllers/jeuxController');

// Toutes les routes de jeux necessitent le module ludotheque actif
router.get('/', verifyToken, checkModuleActive('ludotheque'), jeuxController.getAll);
router.get('/:id', verifyToken, checkModuleActive('ludotheque'), jeuxController.getById);
router.post('/', verifyToken, checkModuleActive('ludotheque'), jeuxController.create);
router.put('/:id', verifyToken, checkModuleActive('ludotheque'), jeuxController.update);
router.delete('/:id', verifyToken, checkModuleActive('ludotheque'), jeuxController.delete);

module.exports = router;
```

### Routes a proteger par module

| Module | Routes concernees |
|--------|-------------------|
| scanner | `/api/barcodes/scan`, `/api/barcodes/validate` |
| ludotheque | `/api/jeux/*` |
| bibliotheque | `/api/livres/*` |
| filmotheque | `/api/films/*` |
| discotheque | `/api/disques/*` |
| communications | `/api/email/*`, `/api/sms/*`, `/api/email-logs/*`, `/api/sms-logs/*` |
| comptabilite | `/api/cotisations/*` (partiellement), `/api/comptes-bancaires/*` |
| outils | `/api/import/*`, `/api/archives/*` |

### Notes

- Les routes d'administration (`/api/parametres/modules-actifs/*`) ne doivent **pas** etre protegees car elles gerent les modules eux-memes
- Certaines routes peuvent appartenir a plusieurs modules (ex: emprunts depend de ludotheque ET de l'adherent)
- Le middleware doit etre place **apres** `verifyToken` pour eviter les appels non authentifies

---

## Autres ameliorations envisageables

### 1. Cache serveur pour les modules actifs

Actuellement, chaque verification appelle la base de donnees. Un cache Redis ou en memoire pourrait ameliorer les performances.

```javascript
// Exemple avec cache memoire simple (5 minutes)
let modulesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function getModulesActifs() {
  const now = Date.now();
  if (modulesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return modulesCache;
  }

  modulesCache = await ModuleActif.getActifs();
  cacheTimestamp = now;
  return modulesCache;
}
```

### 2. Notifications lors des changements de modules

Envoyer une notification (webhook, email admin) lorsqu'un module est active/desactive.

### 3. Historique des changements de modules

Creer une table `modules_actifs_historique` pour tracker qui a change quoi et quand.

```sql
CREATE TABLE modules_actifs_historique (
  id INT PRIMARY KEY AUTO_INCREMENT,
  module_code VARCHAR(50) NOT NULL,
  ancien_etat BOOLEAN NOT NULL,
  nouvel_etat BOOLEAN NOT NULL,
  utilisateur_id INT NOT NULL,
  date_changement DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES adherents(id)
);
```

### 4. Dependances entre modules

Certains modules pourraient dependre d'autres modules. Par exemple :
- `communications` pourrait dependre de `email` OU `sms` (au moins un actif)
- `emprunts` depend de au moins une collection (ludotheque, bibliotheque, etc.)

### 5. Mode maintenance global

Un module special "maintenance" qui desactive tout le site sauf pour les administrateurs.

---

*Document cree le 2025-12-05*
*Derniere mise a jour: 2025-12-05*
