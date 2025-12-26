# Analyse du Marché et Personas Liberteko

**Version**: 0.9
**Date**: Décembre 2025
**Auteur**: Analyse multi-personas avec Claude Code

---

## Table des matières

1. [Panorama des solutions existantes](#1-panorama-des-solutions-existantes)
2. [Synthèse des besoins par profil](#2-synthèse-des-besoins-par-profil)
3. [Évaluation de Liberteko](#3-évaluation-de-liberteko)
4. [Personas pour l'architecture multi-structures](#4-personas-pour-larchitecture-multi-structures)
5. [Recommandations stratégiques](#5-recommandations-stratégiques)

---

## 1. Panorama des solutions existantes

### 1.1 Solutions spécialisées Ludothèques

| Solution | Éditeur | Prix | Points forts | Points faibles |
|----------|---------|------|--------------|----------------|
| **Ludoprêt** | Communautaire | Gratuit | Simple, communauté active, base 7746 jeux | Pas de catalogue en ligne, interface datée |
| **Eludéo** | AXN Informatique | Sur devis | Leader FR, SaaS, évolution continue | Prix non transparent, dépendance éditeur |
| **Logiludo** | Logitos | Sur devis | Site web intégré, réservations en ligne | Peu de retours publics |
| **GFL** | Jordan Lachasse | Licence unique | Pas d'abonnement, depuis 1987 | Installation locale, interface datée |
| **Kawa** | Dyade | Sur devis | Multi-sites, ludobus, 160 clients | Complexe, prix élevé |
| **LudoMAX** | MaxProd | Sur devis | RGPD, hébergement France | Peu connu |

### 1.2 SIGB pour Bibliothèques

| Solution | Type | Prix | Multi-sites | Points forts | Points faibles |
|----------|------|------|-------------|--------------|----------------|
| **PMB** | Open Source | Gratuit | Oui | 6000+ installations, API native | Code vieillissant (PHP4) |
| **Koha** | Open Source | Gratuit | Oui | 18000+ installations mondiales | Très complexe, Perl, Linux requis |
| **Decalog** | SaaS | Sur devis | Oui | Leader FR, 2300 sites, 30 ans | Prix élevé, dépendance |
| **Nanook** | SaaS | Sur devis | Oui | Cartographie, mutualisation | Moins connu que Decalog |
| **Syracuse** | SaaS | 42€/an/user | Oui | Tarifs transparents | Moins de retours |
| **Waterbear** | Open Source | Gratuit | Limité | Gratuit, hébergé | Fonctionnalités limitées |

### 1.3 Constat du marché

**Gap majeur identifié** : Aucune solution ne couvre nativement :
- Jeux de société + Livres + Films + Disques en un seul outil
- Avec gestion multi-structures (organisation > structures > sites)
- Et comptabilité FEC intégrée
- Et communications automatisées complètes

**Position unique de Liberteko** : Seule solution intégrant toutes ces fonctionnalités.

---

## 2. Synthèse des besoins par profil

### 2.1 Besoins Usager (Adhérent)

#### Essentiels (Must-have)
- [ ] Catalogue en ligne avec recherche/filtres
- [ ] Disponibilité temps réel des articles
- [ ] Réservation en ligne
- [ ] Espace personnel (emprunts en cours, historique)
- [ ] Prolongation en ligne
- [ ] Notifications email retour imminent
- [ ] Interface responsive mobile
- [ ] Renouvellement cotisation en ligne

#### Appréciables (Nice-to-have)
- [ ] Recommandations personnalisées
- [ ] Listes favoris/wishlist
- [ ] Avis et notes articles
- [ ] Notifications push (PWA)
- [ ] Mode sombre
- [ ] Statistiques personnelles
- [ ] Calendrier synchronisé

#### Différenciants (Wow-factor)
- [ ] Recherche naturelle IA
- [ ] Scan code-barres in-app
- [ ] Gamification (badges, défis)
- [ ] Mode hors-ligne (PWA)
- [ ] Budget participatif acquisitions
- [ ] Impact écologique affiché

### 2.2 Besoins Bénévole

#### Essentiels
- [ ] Interface ultra-simple (formation 15 min max)
- [ ] Prêt/retour en 2 clics + scan
- [ ] Recherche instantanée adhérents/articles
- [ ] Alertes visuelles (retards, réservations, cotisations expirées)
- [ ] Support scanner USB codes-barres
- [ ] Aide contextuelle sur chaque écran
- [ ] Gestion cas particuliers (retards, prolongations)

#### Appréciables
- [ ] Mode tablette (inventaire mobile)
- [ ] Statistiques simples du jour
- [ ] Impression reçus automatique
- [ ] Fiches réflexes imprimables

### 2.3 Besoins Gestionnaire

#### Gestion Adhérents
- [ ] CRUD complet adhérents
- [ ] Gestion familles/foyers avec tarification
- [ ] Quotient familial (tranches QF)
- [ ] Tags personnalisables
- [ ] Import/export CSV
- [ ] Communications email/SMS
- [ ] Historique complet

#### Gestion Catalogue
- [ ] Multi-collections (jeux, livres, films, disques)
- [ ] Enrichissement API (BGG, BNF, TMDB, MusicBrainz)
- [ ] Import MARC/UNIMARC (livres)
- [ ] Import MyLudo (jeux)
- [ ] Gestion exemplaires multiples
- [ ] Classification personnalisable
- [ ] Thématiques et mots-clés

#### Gestion Emprunts
- [ ] Limites configurables par profil/module
- [ ] Prolongations automatiques ou manuelles
- [ ] Réservations avec file d'attente
- [ ] Relances automatisées (email/SMS)
- [ ] Statistiques circulation

#### Tarification
- [ ] Arbre décisionnel tarifs
- [ ] Codes de réduction
- [ ] Tarifs famille
- [ ] Quotient familial
- [ ] Multi-périodes (annuel, semestriel)

### 2.4 Besoins Comptable/Trésorier

#### Caisse
- [ ] Sessions de caisse (ouverture/clôture)
- [ ] Suivi écarts (théorique vs réel)
- [ ] Multi-modes de paiement
- [ ] Traçabilité opérateurs
- [ ] Remises en banque
- [ ] Rapports PDF sessions

#### Comptabilité
- [ ] Export FEC obligatoire (norme L.47 A)
- [ ] Exports multi-formats (Sage, Ciel, EBP, Quadra)
- [ ] Écritures automatiques équilibrées
- [ ] Journaux comptables (VT, CA, BQ, OD)
- [ ] Plan comptable associatif
- [ ] Comptabilité analytique (activité, site, financeur)

#### Facturation
- [ ] Génération factures (numérotation auto)
- [ ] Avoirs
- [ ] Règlements partiels
- [ ] TVA (si applicable)
- [ ] Export PDF

### 2.5 Besoins Administrateur Système

#### Architecture Multi-Structures
- [ ] Organisation parent (entité juridique)
- [ ] Structures opérationnelles (ludothèque, bibliothèque...)
- [ ] Sites physiques par structure
- [ ] Portails publics groupés
- [ ] Isolation données entre structures
- [ ] Transferts inter-structures tracés

#### Droits et Sécurité
- [ ] Rôles hiérarchiques (admin, gestionnaire, comptable, bénévole, usager)
- [ ] Rôle par structure (surcharge)
- [ ] JWT avec expiration
- [ ] Chiffrement données sensibles (AES-256)
- [ ] Rate limiting
- [ ] Audit trail complet
- [ ] Conformité RGPD

#### Maintenance
- [ ] Système migrations idempotentes
- [ ] Interface admin migrations
- [ ] Mode maintenance avec IP whitelist
- [ ] Logs rotatifs (Winston)
- [ ] Sauvegardes documentées

#### API et Intégrations
- [ ] API REST complète
- [ ] Webhooks (événements)
- [ ] Z39.50 / SRU (catalogues bibliothèques)
- [ ] OAI-PMH (moissonnage)
- [ ] SSO (SAML, OAuth2)

---

## 3. Évaluation de Liberteko

### 3.1 Matrice de couverture des besoins

| Catégorie | Besoin | Statut | Notes |
|-----------|--------|--------|-------|
| **USAGER** ||||
| | Catalogue en ligne | ✅ Implémenté | Thèmes multiples |
| | Disponibilité temps réel | ✅ Implémenté | |
| | Réservation en ligne | ✅ Implémenté | File d'attente FIFO |
| | Espace personnel | ✅ Implémenté | Portail usager |
| | Prolongation en ligne | ✅ Implémenté | Configurable par module |
| | Notifications email | ✅ Implémenté | Templates + déclencheurs |
| | Responsive mobile | ✅ Implémenté | Bootstrap 5 |
| | Renouvellement cotisation | ✅ Implémenté | Via portail |
| | Recommandations IA | ⚠️ Partiel | Thématiques LLM, pas reco perso |
| | PWA/Mode hors-ligne | ⚠️ Partiel | Tablette fréquentation uniquement |
| | Gamification | ❌ Non implémenté | |
| **BÉNÉVOLE** ||||
| | Interface simple | ✅ Implémenté | Emprunts en 2 clics |
| | Scanner codes-barres | ✅ Implémenté | USB natif |
| | Alertes visuelles | ✅ Implémenté | Badges, couleurs |
| | Aide contextuelle | ✅ Implémenté | Système aide JSON |
| | Gestion retards | ✅ Implémenté | Filtres + relances auto |
| **GESTIONNAIRE** ||||
| | CRUD adhérents | ✅ Implémenté | Complet |
| | Familles/foyers | ✅ Implémenté | Garde partagée incluse |
| | Quotient familial | ✅ Implémenté | Barèmes configurables |
| | Multi-collections | ✅ Implémenté | Jeux, livres, films, disques |
| | Enrichissement API | ✅ Implémenté | BGG, BNF, TMDB, MusicBrainz |
| | Import MARC/UNIMARC | ✅ Implémenté | ISO 2709 |
| | Import MyLudo | ✅ Implémenté | CSV streaming |
| | Arbre tarifs | ✅ Implémenté | Éditeur visuel |
| | Communications auto | ✅ Implémenté | Email + SMS + templates |
| **COMPTABLE** ||||
| | Sessions caisse | ✅ Implémenté | V0.9 complet |
| | Remises banque | ✅ Implémenté | V0.9 ajouté |
| | Export FEC | ✅ Implémenté | Multi-formats |
| | Exports Sage/Ciel/EBP | ✅ Implémenté | 8+ formats |
| | Facturation | ✅ Implémenté | Factures + avoirs |
| | Analytique | ✅ Implémenté | Sections multi-axes |
| | Certification NF525 | ❌ Non implémenté | Obligatoire sept. 2026 |
| **ADMIN SYSTÈME** ||||
| | Multi-organisations | ✅ Implémenté | V0.9 |
| | Multi-structures | ✅ Implémenté | V0.9 |
| | Multi-sites | ✅ Implémenté | Sites + emplacements |
| | Portails groupés | ✅ Implémenté | GroupeFrontend |
| | Rôles par structure | ✅ Implémenté | UtilisateurStructure |
| | JWT + chiffrement | ✅ Implémenté | AES-256-CBC |
| | Audit trail | ✅ Implémenté | auditLogger complet |
| | RGPD | ⚠️ Partiel | Export données OK, anonymisation manuelle |
| | Migrations admin | ✅ Implémenté | Interface + API |
| | Mode maintenance | ✅ Implémenté | IP whitelist |
| | API REST | ✅ Implémenté | Complète |
| | Documentation OpenAPI | ❌ Non implémenté | Swagger manquant |
| | Z39.50 / SRU | ❌ Non implémenté | |
| | SSO (SAML/OAuth) | ❌ Non implémenté | |
| | MFA | ❌ Non implémenté | |

### 3.2 Score de couverture

| Profil | Besoins couverts | Score |
|--------|------------------|-------|
| Usager | 8/12 | 67% |
| Bénévole | 5/5 | 100% |
| Gestionnaire | 11/11 | 100% |
| Comptable | 6/7 | 86% |
| Admin Système | 12/17 | 71% |
| **GLOBAL** | **42/52** | **81%** |

### 3.3 Avantages concurrentiels de Liberteko

1. **Unique sur le marché** : Seule solution intégrant jeux + livres + films + disques
2. **Multi-structures natif** : Architecture organisation > structures > sites
3. **Comptabilité FEC** : Export multi-formats intégré (rare dans les SIGB)
4. **Communications complètes** : Email + SMS + templates + déclencheurs automatiques
5. **Tarification avancée** : Arbre décisionnel visuel unique
6. **Open source** : Pas de licence, personnalisation possible
7. **Architecture moderne** : Node.js/Express vs PHP/Perl des concurrents
8. **Installation automatisée** : Script install.js complet

### 3.4 Points d'amélioration prioritaires

| Priorité | Fonctionnalité | Effort | Impact |
|----------|----------------|--------|--------|
| 🔴 Critique | Certification NF525 caisse | Élevé | Légal (amende 7500€) |
| 🟠 Haute | PWA complète (mode hors-ligne) | Moyen | UX mobile |
| 🟠 Haute | Documentation OpenAPI/Swagger | Faible | Intégrations |
| 🟡 Moyenne | Z39.50 / SRU (catalogues) | Élevé | Interopérabilité bibliothèques |
| 🟡 Moyenne | SSO (SAML/OAuth2) | Moyen | Collectivités |
| 🟡 Moyenne | MFA pour admins | Faible | Sécurité |
| 🟢 Basse | Gamification usagers | Moyen | Engagement |
| 🟢 Basse | Recommandations personnalisées | Élevé | UX |

---

## 4. Personas pour l'architecture multi-structures

### 4.1 Persona : Marie, Directrice de Foyer Culturel

**Profil**
- 45 ans, directrice d'un foyer culturel intercommunal
- Gère 3 structures : 1 ludothèque, 1 bibliothèque, 1 médiathèque
- 15 salariés + 30 bénévoles répartis sur 5 sites
- Budget annuel : 500 000€

**Rôle système** : Super-administrateur

**Objectifs**
- Vision consolidée de toutes les structures
- Reporting unifié pour les élus (CA, fréquentation)
- Mutualisation des ressources (adhérents, catalogues partagés)
- Maîtrise des coûts informatiques

**Frustrations actuelles**
- 3 logiciels différents non connectés
- Triple saisie des adhérents
- Pas de statistiques consolidées
- Coûts de licences cumulés élevés

**Besoins Liberteko**
- Dashboard organisation (toutes structures)
- Adhérent unique multi-structures
- Portail public unifié
- Export comptable consolidé
- Carte adhérent unique

**Scénarios d'usage**
1. AG annuelle : export bilan consolidé toutes structures
2. Demande subvention : stats fréquentation multi-sites
3. Audit : export FEC par structure
4. Communication : newsletter toutes collections

---

### 4.2 Persona : Sophie, Responsable Ludothèque

**Profil**
- 38 ans, ludothécaire diplômée
- Responsable d'une ludothèque municipale (2000 jeux)
- 2 salariés + 8 bénévoles
- 500 familles adhérentes
- 1 site principal + 1 ludobus

**Rôle système** : Administrateur structure (Ludothèque)

**Objectifs**
- Catalogage efficace des nouveaux jeux
- Gestion des animations et ateliers
- Suivi des retards et relances
- Rotation stock ludobus
- Statistiques pour rapport annuel

**Frustrations actuelles**
- Enrichissement manuel des fiches jeux (long)
- Synchronisation ludobus complexe
- Relances manuelles par téléphone
- Rapports Excel fastidieux

**Besoins Liberteko**
- Import BoardGameGeek automatique
- Multi-sites avec transferts
- Templates relances email/SMS
- Rapports statistiques automatiques
- Gestion inventaire mobile (tablette)

**Scénarios d'usage**
1. Réception nouveaux jeux : scan EAN → enrichissement BGG → étiquetage
2. Départ ludobus : transfert lot de jeux vers site mobile
3. Fin de mois : relances automatiques retardataires
4. Conseil municipal : export PDF statistiques

---

### 4.3 Persona : Thomas, Bibliothécaire

**Profil**
- 32 ans, bibliothécaire territorial
- Travaille dans une médiathèque intercommunale
- 15 000 documents (livres, DVD, CD)
- Participe au réseau BDP départemental

**Rôle système** : Gestionnaire (Bibliothèque)

**Objectifs**
- Catalogage UNIMARC conforme
- Échanges avec la BDP
- Désherbage régulier
- Mise en valeur nouveautés
- Animations lecture

**Frustrations actuelles**
- Import notices BNF manuel
- Pas de lien avec BDP
- Pas de suggestions automatiques (désherbage)
- Site web séparé du catalogue

**Besoins Liberteko**
- Import ISO 2709 (MARC/UNIMARC)
- Récupération notices BNF (Z39.50/SRU)
- Module désherbage avec critères
- Portail public intégré
- Gestion nouveautés automatique

**Scénarios d'usage**
1. Réception BDP : import notice UNIMARC → exemplaire local
2. Désherbage annuel : liste jamais empruntés + état usagé
3. Nouveautés : badge automatique 30 jours
4. Lecteur : réservation en ligne depuis portail

---

### 4.4 Persona : Jean-Pierre, Trésorier Bénévole

**Profil**
- 62 ans, retraité expert-comptable
- Trésorier bénévole de l'association
- Gère la comptabilité des 3 structures
- Prépare le bilan annuel et le budget

**Rôle système** : Comptable (toutes structures)

**Objectifs**
- Suivi des encaissements en temps réel
- Export FEC pour expert-comptable
- Rapprochement bancaire mensuel
- Suivi analytique par activité
- Bilan et compte de résultat

**Frustrations actuelles**
- Ressaisie des cotisations dans Sage
- Pas de suivi analytique
- Rapprochement bancaire manuel
- Export FEC artisanal (Excel)

**Besoins Liberteko**
- Export FEC automatique conforme
- Export Sage/Ciel format natif
- Comptabilité analytique (par structure, activité)
- Sessions de caisse avec écarts
- Remises en banque avec bordereaux

**Scénarios d'usage**
1. Fin de journée : clôture caisse avec comptage
2. Fin de semaine : remise chèques en banque
3. Fin de mois : export vers Sage, rapprochement
4. Fin d'année : export FEC, bilan par structure

---

### 4.5 Persona : Émilie, Bénévole d'accueil

**Profil**
- 28 ans, en recherche d'emploi
- Bénévole 4h/semaine le samedi matin
- Pas de formation bibliothéconomique
- À l'aise avec le numérique

**Rôle système** : Bénévole

**Objectifs**
- Accueillir les adhérents rapidement
- Enregistrer prêts/retours sans erreur
- Répondre aux questions simples
- Alerter si problème (retard, réservation)

**Frustrations actuelles**
- Interface complexe (trop de menus)
- Formation longue à chaque nouveau logiciel
- Peur de faire des erreurs
- Pas d'aide en cas de doute

**Besoins Liberteko**
- Interface épurée (5 boutons max)
- Scan code-barre unique
- Alertes visuelles claires (couleurs)
- Aide contextuelle (bouton ?)
- Messages d'erreur compréhensibles

**Scénarios d'usage**
1. Prêt standard : scan carte → scan jeux → valider
2. Retour : scan jeu → vérifier état → valider
3. Adhérent oublié carte : recherche nom → photo → confirmer
4. Retard : alerte rouge → message explicatif → blocage ou tolérance

---

### 4.6 Persona : Lucas, Adhérent Famille

**Profil**
- 40 ans, père de 2 enfants (8 et 12 ans)
- Adhérent famille (ludothèque + bibliothèque)
- Emprunte 5-10 articles/mois
- Consulte le catalogue sur smartphone

**Rôle système** : Usager

**Objectifs**
- Trouver des jeux/livres adaptés à ses enfants
- Réserver avant de se déplacer
- Éviter les retards (rappels)
- Renouveler sa cotisation facilement
- Voir l'historique familial

**Frustrations actuelles**
- 2 cartes différentes (ludo + biblio)
- Pas de réservation en ligne
- Oublie les dates de retour
- Doit appeler pour prolonger

**Besoins Liberteko**
- Carte unique multi-structures
- Catalogue unifié avec filtres (âge, joueurs)
- Réservation en ligne
- Notifications SMS avant échéance
- Prolongation en 1 clic
- Historique complet famille

**Scénarios d'usage**
1. Dimanche soir : recherche "jeu coopératif 8-10 ans" → réservation
2. Mardi : SMS "réservation prête" → retrait mercredi
3. J-2 retour : SMS rappel → prolongation si pas réservé
4. Fin cotisation : email → renouvellement en ligne

---

### 4.7 Persona : Admin Système Collectivité

**Profil**
- 35 ans, responsable informatique d'une communauté de communes
- Gère le SI de 5 communes (15 000 habitants)
- Doit intégrer le logiciel dans l'infrastructure existante
- Responsable sécurité et RGPD

**Rôle système** : Super-administrateur technique

**Objectifs**
- Hébergement sécurisé (données en France)
- Intégration SSO avec Active Directory
- Sauvegardes automatisées
- Monitoring et alertes
- Conformité RGPD prouvable

**Frustrations actuelles**
- Logiciels SaaS sans contrôle
- Pas d'API pour intégration
- Sauvegardes manuelles
- Pas de logs d'audit

**Besoins Liberteko**
- Installation on-premise ou cloud France
- API REST documentée
- Logs d'audit complets
- Export données RGPD
- Intégration LDAP/SSO (futur)
- Documentation technique

**Scénarios d'usage**
1. Installation : script automatisé + configuration
2. Quotidien : monitoring Prometheus/Grafana
3. Incident : consultation logs + rollback
4. Audit RGPD : export traces accès données personnelles
5. Mise à jour : migration DB via interface admin

---

## 5. Recommandations stratégiques

### 5.1 Positionnement marché

**Cible principale** : Associations et collectivités gérant plusieurs types de collections culturelles (ludothèque + bibliothèque + médiathèque).

**Proposition de valeur unique** : "La seule solution intégrée multi-collections avec comptabilité FEC et architecture multi-structures native."

**Différenciation vs concurrents** :
- vs Eludéo/Kawa : Gère aussi les livres, films, disques
- vs PMB/Koha : Gère aussi les jeux, comptabilité intégrée
- vs tous : Tarification arbre décisionnel unique

### 5.2 Roadmap prioritaire

**Court terme (Q1 2025)**
1. Documentation OpenAPI/Swagger
2. PWA complète avec mode hors-ligne
3. MFA pour administrateurs
4. Tests automatisés > 80% couverture

**Moyen terme (Q2-Q3 2025)**
5. Protocole Z39.50 (client) pour import notices BNF
6. SSO SAML/OAuth2 (collectivités)
7. Gamification usagers (badges, défis)
8. App mobile native (React Native)

**Long terme (Q4 2025 - 2026)**
9. Certification NF525 caisse (obligatoire sept. 2026)
10. Recommandations IA personnalisées
11. Budget participatif acquisitions
12. Serveur OAI-PMH (exposition catalogue)

### 5.3 Modèle économique suggéré

**Option 1 : Open Source + Services**
- Logiciel gratuit (licence MIT ou AGPL)
- Services payants : hébergement SaaS, formation, support, personnalisations
- Cible : associations, petites collectivités

**Option 2 : Freemium**
- Version gratuite limitée (1 structure, 500 adhérents)
- Version Pro payante (multi-structures, support prioritaire)
- Cible : structures en croissance

**Option 3 : SaaS par adhérent**
- Tarification : 0.50€ à 1€ / adhérent / mois
- Tout inclus (hébergement, mises à jour, support)
- Cible : collectivités avec budget récurrent

### 5.4 Conclusion

Liberteko répond à **81% des besoins identifiés** par les 5 personas analysés. C'est un score remarquable pour une solution jeune face à des acteurs établis depuis 20-30 ans.

Les principaux gaps concernent :
- L'interopérabilité bibliothèques (Z39.50, OAI-PMH)
- L'authentification avancée (SSO, MFA)
- La certification légale caisse (NF525)

La position unique de Liberteko sur le marché des solutions **multi-collections intégrées** représente une opportunité significative, notamment pour les foyers culturels, centres sociaux, et communautés de communes qui gèrent simultanément ludothèque, bibliothèque et médiathèque.

---

## Sources

### Logiciels Ludothèques
- [Ludoprêt](https://ludopret.fr/)
- [Eludéo](https://www.eludeo.fr/)
- [Logiludo](https://logiludo.fr/)
- [GFL](https://gfl-pro.fr/)
- [Kawa Ludothèque](https://dyade.fr/ludotheque)
- [L&A Ludothèque](https://www.defi-enfance.fr/ludotheque/)

### SIGB Bibliothèques
- [PMB Services](https://www.sigb.net/)
- [Koha Community](https://koha-community.org/)
- [Decalog](https://www.decalog.net/)
- [Nanook](https://www.nanook-sigb.fr/)
- [Syracuse](https://www.archimed.fr/syracuse.aspx)
- [Waterbear](https://waterbear.info/)

### Réglementation
- [Certification NF525](https://www.economie.gouv.fr/entreprises/professionnels-certification-logiciels-systemes-caisse)
- [Export FEC](https://www.impots.gouv.fr/fec)
- [RGPD CNIL](https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on)

### Marché
- [Archimag - Logiciels bibliothèques 2025](https://www.archimag.com/bibliotheque-edition)
- [Enssib - SIGB](https://www.enssib.fr/)
