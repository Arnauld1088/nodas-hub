# NODAS HUB — structure découpée (à partir de V6-24)

## Ce qui a changé par rapport au fichier unique

Le fichier `Gestion_de_stock_V6-24-NODAS-HUB_cam_rest.html` (4 894 lignes, 626 Ko)
a été découpé en fichiers séparés, sans changer une seule ligne de logique :

```
nodas-hub/
├── index.html            (structure HTML uniquement — ~8 lignes)
├── css/
│   └── styles.css        (tout le CSS)
├── js/
│   ├── app.js             (toute la logique appli : état, rendu des pages,
│   │                       Firestore CRUD métier, scanner, exports Excel/PDF…
│   │                       — script classique, exécuté en premier)
│   └── firebase-init.js   (initialisation Firebase, authentification,
│                            synchro cloud, admin plateforme
│                            — script type="module", exécuté après app.js)
├── assets/
│   ├── favicon.png        (icône, extraite du base64 inline)
│   ├── logo-auth.png      (logo écran de connexion, 147 Ko — était en base64 inline)
│   └── logo-sidebar.png   (logo menu latéral)
└── electron/
    ├── main.js            (point d'entrée Electron)
    └── package.json        (config electron-builder pour générer .exe/.dmg/.AppImage)
```

**Aucun outil de build requis** pour la version web : ce sont de simples
`<script src="...">`, exactement comme avant, à héberger sur GitHub Pages
comme aujourd'hui.

## Pourquoi c'était si gros : les images en base64

36 % du poids du fichier original (225 Ko sur 626 Ko) venait de 3 images
(logo écran de connexion, logo menu, favicon) encodées en base64 directement
dans le HTML. Elles sont maintenant de vrais fichiers `.png` dans `assets/`,
référencés par `<img src="assets/logo-auth.png">` — visuellement identique,
mais bien plus léger et bien plus facile à modifier (remplacer un logo = juste
écraser le fichier PNG, plus besoin de ré-encoder en base64).

## Ordre de chargement (important, ne pas changer)

```html
<script src="js/app.js"></script>
<script type="module" src="js/firebase-init.js"></script>
```

`app.js` est un script classique : il s'exécute pendant le parsing de la page,
et toutes ses fonctions (`showPage`, `saveArticle`, `renderArticles`, etc.)
deviennent globales (attachées à `window`), exactement comme dans le fichier
unique d'origine.

`firebase-init.js` est un module ES (nécessaire pour les `import` Firebase) ;
les modules sont **toujours différés** par le navigateur, donc il s'exécute
après `app.js`, comme c'était déjà le cas dans le fichier unique. Le
développeur d'origine avait déjà pris soin d'exposer toutes les fonctions
utilisées par les `onclick` du HTML via `window.xxx = ...` (ex :
`window.authSubmit`, `window.createEconomeAccount`...) — ce pattern continue
de fonctionner à l'identique dans les fichiers séparés.

**Ne changez pas cet ordre et n'ajoutez pas `defer`/`async` sur `app.js`**,
sous peine de casser des fonctions appelées depuis le HTML avant qu'elles
soient définies.

## Déploiement web (GitHub Pages) — inchangé

Poussez tout le contenu de ce dossier (sauf `electron/`) à la racine de votre
dépôt, exactement comme avant. `index.html` doit rester à la racine.

## Version bureau (Electron)

Le dossier `electron/` ne duplique aucun code : `main.js` lance une fenêtre
native qui sert *les mêmes* fichiers `index.html` / `css/` / `js/` / `assets/`
via un petit serveur local (`http://127.0.0.1:17345`), plutôt qu'en `file://`
direct — car le SDK Firebase (Auth, Firestore, IndexedDB) fonctionne mal ou
pas du tout servi en `file://`.

### Pour tester en local (nécessite Node.js installé sur votre machine) :

```bash
cd electron
npm install
npm start
```

### Pour générer un exécutable installable (.exe Windows, .dmg Mac, .AppImage Linux) :

```bash
cd electron
npm install
npm run dist:win     # ou dist:mac / dist:linux
```

Le fichier installable sera dans `electron/dist/`.

## Découpage de app.js par domaine (fait)

`js/app.js` (3 940 lignes) a été découpé en 20 fichiers par domaine
fonctionnel, dans l'ordre de chargement suivant (ne pas changer cet ordre
dans `index.html`) :

| Fichier | Contenu |
|---|---|
| `state-vars.js` | **Doit être chargé en premier.** Variables partagées entre tous les modules (`state`, `importBuffers`, `JOURNAL_ACTION_LABELS`...) — déclarées en `var` (et non `let`/`const`) pour rester accessibles depuis tous les autres fichiers `<script>` classiques |
| `utils.js` | Formatage, calculs génériques (fmt, fmtDate, margePct, renderPagination...) |
| `persistence.js` | Sauvegarde locale/état, snapshots, journal d'activité |
| `ui-core.js` | Navigation, modales, thème, recherche globale |
| `articles.js` | CRUD articles, fiche article, export PDF |
| `fournisseurs.js` | CRUD fournisseurs, fiche fournisseur |
| `entrees-sorties.js` | Entrées/sorties simples et factures groupées |
| `dashboard.js` | Tableau de bord, page "Aujourd'hui", liste de courses |
| `ventes.js` | Ventes (recette/article) |
| `commandes.js` | Bons de commande, réception, export Excel/PDF |
| `historique-prix.js` | Historique des prix fournisseurs |
| `journal.js` | Journal d'activité (affichage/filtres) |
| `scanner.js` | Scanner codes-barres/QR, pairage téléphone |
| `admin.js` | Vue Admin plateforme, backups serveur |
| `parametres.js` | Page Paramètres, catégories |
| `import-export.js` | Export CSV/XLSX/JSON, assistant d'import universel |
| `correction.js` | Correction manuelle de stock |
| `analyse.js` | Consommation & prévisions |
| `foodcost.js` | Food Cost (global + par recette) |
| `recettes.js` | CRUD recettes, fiche recette |
| `main.js` | **Doit être chargé en dernier.** Écouteurs DOM globaux + appels d'initialisation (`applyTheme()`, `renderDashboard()`...) qui doivent s'exécuter après que tous les autres fichiers soient chargés |

**Méthode utilisée** : découpage automatique basé sur l'arbre syntaxique
(AST, via `acorn`) plutôt que sur de simples recherches de texte, pour
garantir qu'aucune fonction n'est coupée en deux. Un contrôle ligne par
ligne a confirmé que la concaténation des 20 fichiers reproduit exactement
le contenu de l'ancien `app.js` (seules les 8 déclarations `let`/`const`
partagées ont été changées en `var`, volontairement, pour rester visibles
d'un fichier à l'autre).

L'ancien fichier monolithique est conservé pour référence dans
`legacy/app-monolithique-V6-24.js.bak` (non chargé par `index.html`).

### Point de vigilance si vous ajoutez du code

- Une **nouvelle fonction globale** peut aller dans n'importe quel fichier
  domaine (l'ordre entre fichiers du milieu n'a pas d'importance, les
  fonctions sont "hoisted").
- Une **nouvelle variable partagée entre plusieurs domaines** doit être
  déclarée en `var` (pas `let`/`const`) et de préférence dans
  `state-vars.js`, sinon elle ne sera visible que dans le fichier où elle
  est déclarée.
- Un **nouveau code qui doit s'exécuter au chargement de la page** (comme
  `applyTheme()` actuellement) doit aller dans `main.js`, à la fin.

## P1 — Firestore en sous-collections (fait)

Les données ne tiennent plus dans un seul document `users/{etablissementId}`.
Nouveau schéma :

```
users/{etablissementId}                    ← doc léger : appName, appSub, members,
                                              foodCost, catégories, migratedAt...
users/{etablissementId}/data/articles      ← { items: [...] }
users/{etablissementId}/data/purchases     ← { items: [...] }  (entrées)
users/{etablissementId}/data/sorties
users/{etablissementId}/data/fournisseurs
users/{etablissementId}/data/recettes
users/{etablissementId}/data/ventes
users/{etablissementId}/data/commandes
users/{etablissementId}/activityLog/{id}   ← 1 document par entrée (vraie sous-collection)
users/{etablissementId}/backups/{slot}     ← inchangé
```

### Comment ça bascule

Chaque établissement a un flag `migratedAt` sur son document principal.
- **Absent** → l'app lit/écrit encore à l'ancien format (les tableaux directement
  sur `users/{id}`) — rétrocompatible, rien ne casse pour les établissements pas
  encore migrés.
- **Présent** → l'app lit/écrit exclusivement via les sous-collections ci-dessus.

La migration se déclenche depuis la page **Paramètres**, réservée à
l'administrateur : un bandeau orange apparaît automatiquement tant que
l'établissement n'est pas migré (`window.migrateToSubcollections()`,
dans `firebase-init.js`). L'opération est **non destructive** — elle copie les
données, ne supprime rien de l'ancien format. Après migration, il faut
recharger la page pour que l'app bascule sur la lecture des sous-collections.

**Déployer aussi les nouvelles règles de sécurité** (`REGLES_FIRESTORE_v3_P1.txt`
à la racine du projet) dans Firebase Console → Firestore Database → Règles
**avant** de migrer un établissement, sinon les écritures vers `data/{domaine}`
et `activityLog/{id}` seront refusées.

### saveState(domain) — le point clé pour ne rien casser en ajoutant du code

`saveState()` n'écrit plus jamais tout d'un coup. Elle prend maintenant un
argument :
- `saveState('articles')` → ne resynchronise que le domaine articles
- `saveState(['articles','purchases'])` → plusieurs domaines à la fois (ex :
  créer un article avec un stock initial touche aussi les entrées)
- `saveState('meta')` → categoriesArticles, foodCost, appName, members...
  (tout ce qui reste sur le document principal)
- `saveState('all')` ou `saveState()` sans argument → resynchronise tout
  (réservé à la restauration JSON, la restauration d'un instantané local, et
  la réinitialisation complète)

**Piège à éviter absolument si vous ajoutez une fonction de sauvegarde** :
plusieurs fonctions existantes touchent silencieusement PLUSIEURS domaines à
la fois (ex : `saveEntree()` met à jour `purchases` ET le `total_entrant` de
l'article dans `articles` ; `saveVente()` touche `ventes` + `sorties` +
`articles`). Avant d'ajouter `saveState('un_seul_domaine')` à une nouvelle
fonction, vérifiez qu'elle ne modifie pas aussi `state.articles`,
`state.purchases` etc. d'un autre domaine dans le même appel — sinon cette
modification-là ne sera jamais envoyée au cloud.

### Journal d'activité (activityLog)

`logActivity()` fonctionne exactement pareil pour qui l'appelle (aucun des
39 points d'appel dans le code n'a changé). En interne, chaque entrée part
maintenant directement vers son propre document Firestore
(`saveActivityLogEntry`), sans passer par `saveState()`. Vider le journal
(`clearActivityLog()`) supprime tous les documents de la sous-collection par
lots de 400 (`clearActivityLogCloud()`).

### Correctifs Vue Admin Plateforme liés à la migration (faits)

Trois problèmes découverts après coup, tous corrigés dans `firebase-init.js` :

1. **`adminDeleteEtablissement`** (supprimer un établissement) ne supprimait pas
   les nouvelles sous-collections `data/{domaine}` ni `activityLog/{id}` — elles
   auraient survécu, orphelines, à la suppression. Corrigé : suppression
   explicite des 7 documents `data/*` et de tout le journal avant de supprimer
   le document principal.
2. **`restoreServerBackup`** (restaurer une sauvegarde automatique) écrasait le
   document principal en entier (`merge:false`), ce qui aurait effacé le flag
   `migratedAt` et fait « revenir en arrière » un établissement déjà migré,
   sans toucher aux sous-collections — désynchronisation garantie. Corrigé :
   la fonction détecte maintenant si l'établissement est migré et restaure au
   bon endroit (sous-collections + document meta sans jamais toucher
   `migratedAt`, ou ancien format si pas encore migré).
3. Un nouveau helper `deleteCollectionBatched()` factorise la suppression par
   lots (déjà nécessaire pour vider le journal, maintenant réutilisé aussi pour
   la suppression d'établissement).

**La possibilité de restaurer, pour un établissement donné, n'importe laquelle
de ses 14 sauvegardes automatiques existait déjà côté interface** (Vue Admin →
Détail d'un établissement → liste des sauvegardes avec leur date → bouton
Restaurer sur celle de son choix) — le point 2 ci-dessus était le seul obstacle
à ce que ça fonctionne correctement après une migration.

### Ce qui n'a pas été fait dans cette passe

- La Vue Admin Plateforme (KPIs tous établissements) fait maintenant des
  lectures supplémentaires pour les établissements migrés (5 lectures de plus
  par établissement) — acceptable pour une vue occasionnelle, mais à surveiller
  si le nombre d'établissements grossit beaucoup.
- Pas de règles de sécurité différenciées par rôle économe/scanner au niveau
  des sous-collections (ex : empêcher un économe d'écrire dans `data/articles`)
  — la structure le permettrait désormais, mais ce n'est pas activé.
- Pas de pagination "charger plus" sur le journal au-delà des 500 entrées les
  plus récentes chargées au login.

### Correctif CRITIQUE : cloudSaveNow écrivait au mauvais endroit pour un établissement non migré

Découvert en traitant la demande suivante (import JSON) : `cloudSaveNow(domain)`
écrivait **toujours** dans les nouvelles sous-collections `data/{domaine}`,
même pour un établissement dont `migratedAt` est absent. Concrètement, ça
voulait dire que **dès le déploiement de cette version, avant même d'avoir
cliqué sur "Migrer maintenant"**, toute nouvelle vente/entrée/article aurait
été écrite dans un endroit que l'app ne relit jamais tant qu'elle n'est pas
migrée — les données auraient semblé se sauvegarder, puis disparaître
silencieusement à la reconnexion.

Corrigé : `cloudSaveNow`, `saveActivityLogEntry` et `clearActivityLogCloud`
vérifient maintenant `window._migrationPending` et écrivent à l'ancien format
(champ plat sur `users/{id}`) tant que l'établissement n'est pas migré, et
uniquement dans les sous-collections une fois `migratedAt` présent.

**Résidu mineur accepté** : `window._migrationPending` n'est positionné qu'une
fois `loadUserData()` terminé, alors que l'app devient visible un peu avant la
fin de ce chargement. Il existe donc une toute petite fenêtre (une poignée de
centaines de millisecondes) où une action très rapide de l'utilisateur juste
après connexion pourrait théoriquement écrire au mauvais endroit. Risque jugé
négligeable en pratique (aucune action utile n'est possible avant que les
données soient chargées et affichées), mais à garder en tête.

### Import JSON (restoreJSON) et restauration de sauvegarde serveur : le journal

Même sujet que ci-dessus, cas particulier : le journal d'activité restauré par
`restoreJSON()` (import-export.js) ou `restoreServerBackup()` (Vue Admin) n'est
plus couvert par `saveState('all')`, qui ne gère que les 7 domaines + meta.
Un nouveau helper partagé, `replaceActivityLogFull(etablissementId, isMigrated, log)`
dans `firebase-init.js`, remplace entièrement le journal cloud (ancien format
ou sous-collection selon le cas) — utilisé par les deux fonctions de
restauration. Exposé aussi via `window.restoreActivityLogFull(logArray)` pour
l'établissement de l'utilisateur connecté.

## Secteurs & Économat (stock par emplacement)

Le stock d'un article n'est plus un chiffre unique global — chaque article a
maintenant un stock **par emplacement** (`stockParSecteur: {Économat: N,
Cuisine: N, ...}`). Rétrocompatible : un article créé avant cette mise à jour
n'a pas encore ce champ — `getStock(art)` retombe alors sur l'ancien calcul
(`total_entrant - total_sortant`), qui représente l'Économat par définition
(les secteurs n'existaient pas avant).

**Emplacements** : liste configurable dans Paramètres. "Économat" toujours
présent, non supprimable. Un secteur ne peut être supprimé que si son stock
est à zéro partout (transfert retour vers l'Économat d'abord).

**Entrée fournisseur** : nouveau champ "Destination" (Économat par défaut, ou
un secteur direct si le fournisseur livre directement en cuisine/salle...).

**Sortie** : le champ "secteur" (texte libre existant, avec suggestions) sert
maintenant à la fois d'étiquette de reporting ET de véritable destination de
stock : si le texte saisi correspond à un emplacement défini, le stock de CET
emplacement est déduit ; sinon (motifs non géographiques comme "Perte",
"Correction"), déduction sur l'Économat par défaut — comportement identique
à avant.

**Ventes** : utilisent déjà un champ "secteur" existant (où la vente a eu
lieu) — réutilisé directement pour déduire le bon stock.

**Nouveau : Transferts internes** (`js/transferts.js`, nouvelle page +
sous-collection Firestore `data/transferts`) — déplacer du stock d'un
emplacement à un autre (ex: Économat → Cuisine), avec vérification du stock
disponible à l'origine avant validation.

**Rattachement de l'historique** (Paramètres → bouton "Rattacher l'historique
aux emplacements") : renomme les anciennes valeurs "secteur" en texte libre
(ex: "cuisine") pour qu'elles correspondent exactement aux emplacements
définis. **Portée limitée, volontairement** : ça corrige l'affichage/les
filtres, mais ne recalcule PAS rétroactivement le stock par secteur des
mouvements passés (impossible à faire de façon fiable sans reconstituer tout
l'historique chronologique) — tout le stock antérieur à cette mise à jour
reste comptabilisé à l'Économat.

### Ce qui n'est PAS fait dans cette passe

- **Rôle "Responsable de secteur"** (accès restreint à un seul secteur, ne
  voit ni les autres secteurs ni les prix fournisseurs/administration) —
  demandé mais pas encore implémenté. C'est un chantier à part entière
  (nouvelle structure accountLinks avec un champ secteur, nouvelles règles
  Firestore, masquage conditionnel de pages existantes) qui mérite sa propre
  passe dédiée, comme les règles de sécurité P1.
- Les factures groupées (`saveFactureEntree`/`saveFactureSortie`) utilisent
  une seule destination/secteur pour toutes les lignes de la facture — pas
  de destination différente ligne par ligne.

### Règle affinée : les transferts passent toujours par l'Économat

Un transfert direct secteur → secteur est **bloqué** (message d'erreur clair) —
tout mouvement doit avoir l'Économat comme origine OU destination :
- **Économat → secteur** (distribution) : génère aussi une entrée dans
  `state.sorties` (secteur = destination), pour que les rapports existants
  (Food Cost, mouvements du tableau de bord...) voient le mouvement.
- **Secteur → Économat** (retour de ce qui n'a pas été utilisé) : génère aussi
  une entrée dans `state.purchases` (destination = Économat, `facture:'RETOUR'`,
  prix à 0 — même principe que les corrections de stock).

Dans les deux cas, ces enregistrements miroir sont **purement informatifs** :
le stock est déjà déplacé par `ajusterStockEmplacement()` au moment du
transfert lui-même — on ne le déplace pas une seconde fois. Chaque
enregistrement miroir porte un `transfertId` ; annuler un transfert
(`deleteTransfert`) supprime aussi son miroir associé, pour ne jamais laisser
une trace de mouvement qui n'existe plus.

### Où voir le stock par secteur (3 endroits)

1. **Nouvelle page "Stock par secteur"** (menu, sous Transferts) — tableau
   avec une colonne par emplacement défini, tous les articles, filtrable par
   catégorie/recherche, exportable en Excel.
2. **Fiche article** (clic sur un article) — bandeau "📍 Stock par
   emplacement" avec le détail par secteur (n'apparaît que si au moins un
   secteur est défini en plus de l'Économat).
3. **Formulaire de transfert** — affiche en direct "Disponible à [origine] :
   X" dès que l'article et l'origine sont choisis, avant même de taper la
   quantité.

## Rôle "Responsable de secteur"

Nouveau rôle, lié à UN secteur précis (choisi à la création du compte, dans
Paramètres → "Compte Responsable de secteur").

**Peut** : consulter tous les articles (lecture seule, sans les prix), le
Stock par secteur, enregistrer des sorties/ventes pour son secteur, faire un
retour vers l'Économat (jamais l'inverse), consulter uniquement ses propres
actions dans le Journal.

**Ne peut pas** : voir Entrées/Commandes/Fournisseurs/Historique des
prix/Food Cost/Recettes/Analyse/Import/Paramètres/Tableau de bord, créer ou
supprimer un article/fournisseur/recette, corriger le stock, gérer les
comptes, vider le journal, annuler un transfert.

### Comment c'est appliqué techniquement

- `accountLinks/{uid}` porte maintenant un champ `secteur` en plus de `role`.
- `window.isSecteurResponsable()` (comme `isEconome()`/`isScanner()`) — tous
  les contrôles "réservé à l'administrateur" déjà en place pour l'économe
  ont été étendus pour bloquer aussi ce rôle.
- Masquage des pages non autorisées par JS (comparaison sur l'attribut
  `onclick` des liens de menu, pas d'ID dédié à ajouter par page).
- Classe CSS `role-secteur` sur le `<body>` : cache les colonnes de prix
  (`.prix-col`), les boutons d'action non autorisés (`.not-secteur-action`,
  `.admin-only-action`) et tous les boutons de suppression (`.btn-danger`).
- Le champ secteur des formulaires Sortie/Vente est pré-rempli et verrouillé
  sur son propre secteur ; le formulaire de Transfert est verrouillé sur
  "son secteur → Économat" (impossible de choisir autre chose).
- **Aucune modification des règles Firestore nécessaire** : la règle
  générique déjà en place (accès via `accountLinks`) ne filtre pas par
  valeur de rôle, elle couvrait donc déjà ce nouveau rôle automatiquement.

### Limite de sécurité à connaître (honnêteté totale)

Comme pour l'économe aujourd'hui, ces restrictions sont appliquées **côté
client** (masquer/désactiver dans l'interface), pas via des règles Firestore
distinctes par rôle — Firestore ne permet pas de restriction au niveau d'un
champ précis (ex: cacher `prix_achat` mais autoriser le reste du même
document). Un utilisateur techniquement averti pourrait théoriquement
contourner ces limites via les outils navigateur ou un appel direct à
l'API Firestore. C'est le même modèle de confiance que celui déjà en place
pour l'économe — pas une régression introduite ici, juste une limite
inhérente à l'architecture actuelle (à corriger uniquement via un projet de
plus grande ampleur : Firestore Functions/Cloud Functions faisant office de
véritable backend, hors périmètre de cette passe).

## Transfert groupé (plusieurs articles + scan)

Bouton "🧾 Transfert groupé" sur la page Transferts, à côté du transfert
simple. Même règle qu'un transfert unique (un des deux emplacements doit être
l'Économat), mais permet de traiter plusieurs articles en une seule
opération : une ligne par article, avec un bouton 📷 par ligne pour scanner
le code-barres (`openScanner()`, réutilisé tel quel). Les mêmes
enregistrements miroir (sortie ou entrée pour les rapports) et le même
verrouillage pour le rôle "Responsable de secteur" s'appliquent qu'en mode
simple ou groupé.

## Export / Import des recettes

- **Export** (page Recettes → boutons Excel/CSV, ou assistant d'import
  universel) : une ligne par ingrédient (nom recette, type, prix de vente,
  portions, ingrédient, quantité, unité, notes) — la recette est donc répétée
  sur autant de lignes qu'elle a d'ingrédients. C'est le format le plus
  simple à éditer en masse dans Excel.
- **Import** (assistant universel → nouveau type "🍽 Recettes") : les lignes
  partageant le même nom de recette sont **automatiquement regroupées** en
  une seule recette avec sa liste d'ingrédients reconstituée. Les doublons
  (recette déjà existante avec le même nom) sont ignorés, comme pour les
  autres types d'import.
