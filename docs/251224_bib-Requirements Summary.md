# 12-24 Atelier de conception SIGB: Import BDP, cotes Dewey et conformité RGPD

## Stakeholders
- Bibliothèque municipale (client principal)
- BDP (Bibliothèque Départementale de Prêt) – fournisseur de lots et notices
- BNF (Bibliothèque nationale de France) – source de notices et cotes Dewey
- Savoie Biblio – réseau fournissant des notices et catégories
- Usagers/lecteurs de la bibliothèque
- Bénévoles de la bibliothèque (gestion des ventes, classement)
- Commission (référencée pour la charte de l’usager, côté Ludo)
- Éditeur/mainteneur du logiciel actuel (Microbib)
- Éditeurs d’autres SIGB mentionnés (Carvi, Décalog)
- Autorités de conformité (RGPD)
- Intervenants internes au projet (Ludo, équipe technique)
## Client/Juridiction rencontrés
- Client: Bibliothèque municipale (réseau local; usage de Microbib)
- Juridiction: Contexte français (RGPD, pratiques BNF/BDP/Dewey)
## Participants et rôles
- Speaker 1: Intervenant technique/produit (propose fonctionnalités SIGB, événements, email/charte, gestion d’exemplaires)
- Speaker 2: Responsable de la bibliothèque (explique besoins, pratiques de catalogage/cotation, limites et contraintes; utilisateur Microbib)
- Speaker 3: Intervenant/observateur (validation ponctuelle)
## Requirements
### Fonctionnels
- Import de lots BDP via fichier ISO:
  - Création automatique des notices à partir de l’ISO.
  - Conservation des métadonnées de lot (provenance, dates, obligation de retour).
- Gestion des exemplaires:
  - Une notice commune (auteur, co-auteur, ISBN, etc.) avec plusieurs exemplaires distincts par code-barres.
  - Opérations par scan: ajout d’exemplaire, mise au rebut à l’exemplaire (sans supprimer la notice).
  - Champs exemplaire: état, provenance (achat/don), prix public, prix d’achat, n° de facture, date d’acquisition, date de changement de statut (rebut).
- Désherbage et mise au rebut en lot:
  - Scan en série pour constituer des lots de rebut.
  - Capacité d’exporter/sortir les informations de lot.
  - Rétention des exemplaires en statut rebut visibles en base pendant 6 mois.
- Catégories/genres:
  - Détection de catégories inconnues lors d’import et workflow de résolution:
    - Option créer automatiquement.
    - Option demander validation: créer/remplacer par catégorie existante.
    - Outils de nettoyage/suppression de catégories non utilisées.
- Gestion des cotes:
  - Paramétrage de la syntaxe de cote locale (préfixes J/R/A, sous-genres: RP, RSF, RH, RT, LCD, etc., 3 lettres auteur).
  - Support Dewey (000–999, avec subdivisions décimales), possibilité de réduire la granularité locale (limiter après la virgule).
  - Aide à la décision: consultation des notices BNF/Dewey avec override local.
  - Possibilité d’assigner des cotes différentes de la BNF selon la politique de fonds locale.
- Recherche et intégration:
  - Liste des livres non intégrables lors d’un import, avec édition rapide des notices pour aligner catégories/cotes.
  - Recherche par Dewey (ex. “153”) pour lister les documents correspondants.
- Événements (bourse aux livres):
  - Création d’événements, affectation par scan (rebut ou non).
  - Tarification par type de livre, suivi vendu/non vendu.
- Interactions en rayon:
  - Consultation mobile de la base (scan en rayon pour voir/modifier cote, emplacement).
  - Synchronisation avec impression d’étiquettes (Brother) au bureau.
- Usagers et conformité:
  - Envoi d’email de validation de cotisation.
  - Lien vers charte de l’usager; confirmation par clic (signature “léger” non juridiquement contraignante).
  - Gestion des comptes inactifs (suppression automatique > 3 ans).
- Réseau multi-structures:
  - Modules pouvant être liés ou séparés (ex. usagers partagés).
  - Maintien de codes-barres exemplaires nominatifs (distincts de l’ISBN) pour l’interopérabilité entre bibliothèques.
### Non fonctionnels
- Fiabilité des imports (détection, logs des erreurs d’intégration).
- Sécurité RGPD: suppression des comptes inactifs, chiffrement des données sensibles.
- Utilisabilité:
  - Interfaces claires pour la gestion des catégories/cotes.
  - Outils de nettoyage de base (notices sans exemplaires).
  - Interface web moderne (contrairement à Carvi “poussif”/ancien).
- Extensibilité:
  - Paramétrage des règles de cote par bibliothèque.
  - Support d’événements optionnels sans alourdir les flux quotidiens.
- Compatibilité:
  - Lecture de fichiers ISO BDP.
  - Intégration de notices BNF/Savoie Biblio.
- Maintenabilité:
  - Mise à jour régulière (versioning), suivi des règles RGPD.
### Données
- Notices: auteur(s), ISBN, genres, catégories, cotes (locaux et Dewey), sources (BNF/BDP/Savoie Biblio).
- Exemplaires: code-barres unique, état, provenance, prix public/achat, n° facture, dates (acquisition, changement de statut), statut (actif/rebut).
- Lots BDP: identifiants de lot, obligations de retour, inventaire.
- Usagers: informations d’inscription, consentements (charte), historique.
- Événements: liste des exemplaires affectés, tarification par type, statut vente.
- Journalisation: erreurs d’import, modifications de notices/cotes, actions de rebut.
Formats et sources:
- Fichier ISO (BDP) pour import.
- Notices BNF/Savoie Biblio (formats standards bibliographiques).
- Codes-barres exemplaires (internes, distincts de l’ISBN).
### Interface utilisateur
- Module d’import ISO avec assistant de résolution des catégories/cotes manquantes.
- Écran notice avec onglet “Exemplaires” (ajout par scan, état, provenance, prix).
- Workflow de désherbage/rebut par lot (scan, confirmation, rétention 6 mois).
- Paramétrage des règles de cote (préfixes, mapping genres → lettres, ordre).
- Recherche avancée (par Dewey, catégories, ISBN).
- Mobile/lecteur de code-barres pour consultation/modification en rayon (lecture seule ou édition limitée), avec file d’impression d’étiquettes.
- Module Événements (scan, tarification, résultats).
- Module Usagers: envoi de courriels (cotisation, charte), gestion consentements.
### Performance
- Import de lots ISO: traitement en masse avec retour des anomalies en moins de X minutes (cible à définir selon taille; suggestion:  3 ans) configurable.
- Journaux d’audit des modifications (cotes, statuts exemplaires).
- Authentification forte pour accès mobile/édition en rayon.
- Gestion des consentements (traçabilité du clic de validation de charte).
### Réglementaire et conformité
- RGPD: gestion des durées de conservation, consentements, droits d’accès/suppression.
- Respect des normes de catalogage (compatibilité Dewey; notices BNF).
- Interopérabilité réseau (multi-structures) sans réutilisation de l’ISBN comme identifiant d’exemplaire.
## Hypothèses et Contraintes
### Hypothèses
- Le fichier ISO BDP contient toutes les métadonnées nécessaires pour créer des notices.
- La bibliothèque souhaite conserver des notices sans exemplaires pour une période limitée puis effectuer un nettoyage.
- Les bénévoles gèrent la bourse aux livres de manière souple (tarification “au feeling”), le module Événements est “optionnel”.
- Les usagers accepteront une validation par lien (signature “léger”) pour la charte.
- Le mobile en rayon est utile surtout en consultation; l’impression d’étiquette se fait au bureau (Brother).
### Contraintes
- Dewey: nécessité d’adapter la granularité aux capacités/volumes locaux (réduction après la virgule).
- Politique locale de cote pouvant diverger de la BNF; l’outil doit permettre l’override.
- Microbib est l’outil actuel; migration ou changement de version comporte des risques (maintenance, RGPD).
- Interopérabilité réseau: interdiction pratique de réutiliser l’ISBN comme code-barres exemplaire (risques de collision et ambigüité multi-exemplaires).
- Rétention des exemplaires en rebut pendant 6 mois (politique existante).
- Interface d’étiquetage: dépendance à une imprimante spécifique (Brother).
## Définitions
- BDP: Bibliothèque Départementale de Prêt (prête des lots aux bibliothèques).
- BNF: Bibliothèque nationale de France (fournit notices et cotes).
- Dewey: Classification décimale internationale (000–999, avec subdivisions).
- Notice: Enregistrement bibliographique commun (métadonnées du titre).
- Exemplaire: Copie physique du livre, identifiée par un code-barres unique.
- Désherbage: Processus de retirer des documents du fonds (mise au rebut).
- Rebut: Statut de retrait; exemplaire conservé en base 6 mois.
- ISO (fichier): Format d’échange de lot BDP (à préciser exactitude technique).
- Charte de l’usager: Document interne encadrant l’usage et les engagements de l’usager.
- Savoie Biblio: Réseau/documentation fournissant notices et catégories.
Termes à clarifier:
- “Fichier ISO de la BDP”: format exact, structure des données, champs supportés.
- “Modules liés/séparés” en multi-structures: périmètre des modules partageables.
- “Signature par lien” et sa valeur probatoire souhaitée.
- Politique couleur associée aux cotes (règles, mapping).
## Gaps
- Lacunes du système actuel (côté client):
  - Catégories manquantes ou divergentes entre Savoie Biblio et la base locale (ex. “roman jeunesse science-fiction” absent).
  - Nettoyage compliqué des catégories proposées automatiquement.
  - Risques historiques de duplication/liaison incorrecte des notices (copier-coller).
  - Interface de recherche/réservation ancienne et peu ergonomique sur certains SIGB (Carvi).
  - Absence de règlement intérieur/charte usager formalisée et signée.
- Lacunes potentielles de notre solution:
  - Import ISO BDP: besoin de confirmer compatibilité et gestion fine des métadonnées de lot.
  - Outil de paramétrage avancé des cotes locales (règles de mapping lettres/ordre) à valider.
  - Edition mobile en rayon utile mais contrainte par réimpression d’étiquettes (flux à optimiser).
  - Événements/bourse: risque de sur-complexité pour un usage bénévole “feeling”.
  - Conformité RGPD: nécessité d’audit de chiffrement et suppression automatique configurable.
  - Aide à la décision Dewey (suggestions vs override local) à préciser.
## Décisions et Actions
- Décisions exprimées:
  - Maintien d’une gestion par exemplaires avec code-barres uniques (ne pas utiliser l’ISBN comme identifiant d’exemplaire).
  - Rétention des exemplaires en rebut pendant 6 mois.
  - Création manuelle de nouvelles catégories par la bibliothèque, avec possibilité d’automatiser sous validation.
- Actions à suivre:
  - Spécifier et intégrer l’import ISO BDP (structure, champs, tests).
  - Concevoir le module de résolution de catégories inconnues (créer/remplacer/ignorer).
  - Paramétrer un moteur de règles de cote (préfixes, sous-genres, 3 lettres auteur, Dewey override).
  - Mettre en place l’envoi d’emails de cotisation et charte avec traçabilité du consentement.
  - Vérifier la conformité RGPD (chiffrement, journalisation, suppression inactifs).
  - Définir le flux “mobile en rayon” + file d’impression d’étiquettes.
  - Ajouter un module “Événements” léger et optionnel.
  - Prévoir un outil de “nettoyage notices sans exemplaires”.
## Risques et Ambiguïtés – Suggestions
- Ambiguïté Dewey vs politique locale:
  - Risque d’incohérence et dispersion en rayons; suggestion: profil de cote local documenté (guide interne), outil de contrôle de cohérence.
- Import ISO:
  - Risque d’incompatibilité/erreurs de mapping; suggestion: sandbox d’import, rapport détaillé, rollback.
- Catégories:
  - Prolifération non maîtrisée; suggestion: workflow d’approbation, liste blanche/blacklist, fusion de catégories.
- RGPD:
  - Signature par lien non juridique; suggestion: évaluer besoin de signature électronique qualifiée ou d’un registre de consentements conforme.
- Mobile en rayon:
  - Double manipulation (scan en rayon + réimpression) peut décourager; suggestion: file d’attente d’étiquettes avec regroupement par session et rappel visuel.
- Multi-structures:
  - Interopérabilité future; suggestion: namespace pour codes-barres exemplaires (préfixe par bibliothèque), référentiel partagé d’usagers modulable.
- Événements bénévoles:
  - Surcharge process; suggestion: activer le module à la demande, gabarits simples (prix par type, export CSV minimal).
## Points nécessitant confirmation
- Format et contenu exacts du “fichier ISO BDP” (spécification technique).
- Règles détaillées de construction des cotes locales (ordre des lettres, couleurs associées).
- Politique de suppression/archivage des notices sans exemplaires (fréquence, critères).
- Exigences de signature/consentement (niveau probatoire attendu).
- Périmètre des modules “liés” en cas de réseau (usagers, notices, exemplaires, événements).