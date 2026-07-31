# EPIC-42 — Uniformisation du site public

## Objectif

Rendre le site public coherent d'une page a l'autre. L'EPIC-41 traite le panel
d'administration ; celui-ci traite ce que voient les visiteurs.

Deux points d'entree identifies par le PO le 2026-07-29 :

1. **Les retours arriere**, qui prennent quatre formes differentes selon la page.
2. **Les titres et sous-titres**, recopies a chaque nouvelle page — l'enjeu enonce par le PO n'est
   pas la dette passee mais le cout futur : *"eviter de reecrire le code en boucle"*.

## Constat initial — la navigation de retour

Audit du code au 2026-07-29, sur les pages de detail du site public.

| Page | Forme | Markup |
|------|-------|--------|
| `/structure/equipes/:slug` | Bouton chevron seul | `<button class="back-button" (click)="goBack()">` + SVG inline |
| `/structure/equipes/:team/joueur/:slug` | Bouton chevron + libelle | idem + `<span class="back-label">Voir d'autres joueurs</span>` |
| `/structure/equipes/:team/coach/:slug` | Bouton chevron + libelle | idem + « Voir d'autres coachs » |
| `/articles/:slug` | Fil d'Ariane a 3 niveaux | `<nav class="article-breadcrumb">` — Accueil › Articles › Titre |
| `/structure/recrutement/:id/:slug` | Lien texte | `<a class="btn-back">Retour aux offres</a>`, **present deux fois dans le fichier** |
| `/boutique/:slug` *(a venir)* | Fil d'Ariane a 2 niveaux | `<nav class="produit__breadcrumb">` — boutique / Nom du produit |

**Quatre paradigmes, quatre noms de classe, deux separateurs differents** (`›` et `/`), et un libellé
de premier niveau en minuscules (« boutique ») la ou l'autre fil d'Ariane capitalise (« Accueil »,
« Articles »).

### Ce que cela produit pour le visiteur

Un visiteur qui parcourt une equipe, puis un article, puis un produit rencontre trois mecaniques de
retour differentes sur trois pages consecutives. Rien n'indique ou il se trouve dans l'arborescence
sur les pages a bouton, alors que les pages a fil d'Ariane le disent.

### Details techniques releves

- Le **SVG du chevron est recopie a l'identique** dans team-detail, player-detail et coach-detail :
  4 lignes de `<path>` et `<rect>` avec la couleur `#32D299` en dur, hors variable de charte.
- Les boutons naviguent par `router.navigate()` en dur plutot que par `routerLink`, ce qui les rend
  non ouvrables dans un nouvel onglet et invisibles au survol.
- `job-detail` declare deux fois le meme lien de retour dans le meme fichier (lignes 156 et 169).
- Seul `article-detail` porte `aria-current="page"` sur le niveau courant.

## Perimetre

### 1. Navigation de retour (point d'entree)

Choisir une regle unique, l'appliquer aux six pages de detail, extraire le composant partage.

### 2. Titres et hierarchie typographique

**29 combinaisons de classes** sur les titres du site public. `.title` est redefini dans **six
fichiers SCSS differents**, avec six lignes identiques sur sept — seule la taille varie. Aucune
echelle typographique n'existe : chaque page a choisi la sienne.

Consequence directe : toute nouvelle page recopie le bloc, et une correction de charte demande six
modifications.

### 3. A elargir apres audit

Ce constat sur les retours arriere est probablement le symptome d'un ecart plus large. Un audit
complet du site public reste a mener, sur le modele de celui de l'EPIC-41 : structure des pages,
etats de chargement, formulaires, typographie, boutons, espacements.

**Cet EPIC ne doit pas etre lance sans cet audit** : la premiere feature en depend, et l'experience
de l'EPIC-41 montre que l'audit revele des defauts fonctionnels qu'on ne cherchait pas.

## Hors perimetre

- Le panel d'administration — c'est l'EPIC-41.
- La refonte graphique de la charte. On uniformise l'application de la charte existante, on ne la
  redefinit pas.

## Question ouverte pour le PO

**Fil d'Ariane partout, ou bouton de retour partout, ou une regle qui distingue les deux ?**

Les deux ont des merites differents :

- Le **fil d'Ariane** situe le visiteur dans l'arborescence et offre plusieurs points de sortie. Il
  a aussi une valeur SEO : Google l'exploite pour afficher le chemin dans les resultats, et il se
  prete a un balisage `BreadcrumbList` en JSON-LD. Le projet a une gate Lighthouse SEO bloquante
  (`categories:seo >= 0.9`), ce qui rend cet argument concret.
- Le **bouton de retour** est plus leger visuellement et suffit quand il n'existe qu'un seul chemin
  d'arrivee.

Une regle possible : fil d'Ariane des que la page est a plus d'un niveau de la racine, bouton sinon.
Mais dans l'etat actuel, toutes les pages de detail sont a deux niveaux ou plus — cette regle
donnerait donc du fil d'Ariane partout.

A trancher en brainstorming avant d'ecrire la premiere US.

## Branche git

A creer. `feat/epic-42-site-uniformisation` (frontend), depuis `main`, dans un worktree dedie.

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Audit du site public](FEATURES/audit-site-public/README.md) | A faire | A faire | Sans objet | Sans objet |
| [Navigation de retour](FEATURES/navigation-retour/README.md) | A faire (arbitrage PO requis) | A faire | A faire | A faire |
| [Titres et hierarchie typographique](FEATURES/typographie-titres/README.md) | A faire | A faire | A faire | A faire |

## Criteres de validation EPIC

- Une seule mecanique de retour sur l'ensemble des pages de detail, ou une regle explicite ecrite
  dans `frontend/CLAUDE.md` si deux mecaniques coexistent.
- Un seul separateur, une seule convention de capitalisation.
- Le chevron n'est plus recopie : composant ou icone partagee, couleur issue de la charte.
- Les retours sont des liens navigables (nouvel onglet, survol), pas des boutons a navigation
  imperative.
- `aria-current="page"` sur le niveau courant de chaque fil d'Ariane.
- Balisage `BreadcrumbList` JSON-LD si le fil d'Ariane est retenu.
- Une echelle typographique unique, documentee dans `DESIGN_SYSTEM.md`, appliquee par des classes
  ou composants partages. Plus aucune redefinition locale de `.title` ou `.section-title`.
- Une regle inscrite dans `frontend/CLAUDE.md` : ou vit la typographie, et quand une classe locale
  reste legitime.
- Hierarchie semantique correcte : un seul `<h1>` par page, aucun saut de niveau.
- Aucune regression sur la gate Lighthouse SEO (`categories:seo >= 0.9`, bloquante en CI).
- VQO >= 9.5/10.

## Coordination

La page produit de la boutique vit sur `feat/boutique-collection-2026`, non mergee. Son fil d'Ariane
devra suivre la meme regle que les autres — a coordonner au merge, comme l'a ete le groupe Boutique
de la sidebar dans l'EPIC-43.
