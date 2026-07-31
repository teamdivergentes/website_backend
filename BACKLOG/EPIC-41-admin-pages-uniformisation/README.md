# EPIC-41 — Uniformisation des pages d'administration

## Objectif

Rendre les 11 modules de pages admin coherents entre eux : meme comportement au chargement, a vide,
en erreur, a la confirmation et au retour d'action ; meme regle pour choisir entre dialogue et page
routee. Au passage, corriger les defauts fonctionnels que l'audit a mis au jour.

L'EPIC-43 excluait explicitement les pages CRUD ("inchangees"). Cet EPIC est la suite decidee par le
PO le 2026-07-29, apres un audit en 4 dimensions mene par 4 agents en parallele.

## Origine — audit du 2026-07-29

Quatre audits en lecture seule sur `src/app/admin/` (11 modules, ~16 500 lignes) :

| Dimension | Constat principal |
|-----------|-------------------|
| Structure et mise en page | Bug de specificite CSS : les correctifs responsive de 6 pages sont du code mort |
| Listes et tableaux | 4 paradigmes d'affichage pour 10 collections ; pagination absente sauf 1 page |
| Formulaires et dialogues | 4 patterns dialogue/page sans regle ; 18 formulations pour "champ obligatoire" |
| Etats et retour utilisateur | Une panne d'API se deguise en base vide sur 3 modules |

Duplication structurelle estimee, apres deduplication des recoupements entre audits :
**~1 800 lignes sur ~16 500**, soit ~11 % du code admin.

## Perimetre

### 1. Defauts fonctionnels (prioritaire)

| # | Defaut | Localisation |
|---|--------|--------------|
| 1 | Erreur de chargement masquee en etat vide | users, roles, twitch-channels |
| 2 | `limit: 100` sans pagination : acces perdu au-dela de 100 articles | `articles-list.component.ts:107` |
| 3 | `alert()` navigateur comme gestion d'erreur | `game-form-dialog.component.ts:162,181` |
| 4 | Echec silencieux : le bouton se reactive, rien d'autre | 3 dialogues `users` |
| 5 | `onReorder` sans garde : double-clic = appels concurrents | `team-members-dialog.component.ts:175` |
| 6 | 5 suppressions irreversibles sans aucun retour | games, teams, recruitment, sponsors, staff |
| 7 | Specificite `.page-header` : 11 declarations locales mortes | `_admin-shared.scss:85` |

### 2. Primitives transverses

Skeletons partages, etat vide, etat d'erreur avec reessai, service de notification, service de
confirmation, validateurs et messages centralises, pied de dialogue, factory d'ouverture de dialogue.

### 3. Regle dialogue vs page routee

Regle a inscrire dans `frontend/CLAUDE.md`, puis migration des 7 formulaires non conformes.

## Hors perimetre

- La definition des colonnes et le markup des items : **ligne rouge**. Les 4 agents convergent sur ce
  point — uniformiser le comportement transverse, jamais le rendu specifique.
- Un composant de liste generique pilote par configuration. Voir "Decision" ci-dessous.
- Le module `analytics` : lecture seule, sans CRUD, il ne partage rien avec les pages
  d'administration hormis les skeletons.

## Decision : primitives, pas de composant generique

Les 4 agents deconseillent unanimement un `<app-admin-list>` pilote par configuration.

Argument decisif : le poids duplique est dans la **mecanique** (~950 des 1 270 lignes relevees par
l'audit des listes), pas dans le **rendu**. Des primitives ciblees recuperent l'essentiel du gain
sans jamais contraindre le markup.

Precedent dans la codebase : `_admin-shared.scss:200-321` est deja une tentative d'uniformisation
par le CSS, et elle a echoue — les selecteurs y sont enumeres page par page, staff et twitch ne s'y
branchent pas, et ajouter une page oblige a editer 5 listes de selecteurs. Un composant generique
reproduirait la meme dette, en TypeScript cette fois.

## Branche git

`feat/admin-pages-uniformisation` (frontend), depuis `main`. A creer dans un worktree dedie.

Le lot 2 de la feature "defauts fonctionnels" touche le backend (pagination articles) : branche
separee dans le depot `backend` si le service ne suffit pas.

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Defauts fonctionnels](FEATURES/admin-defauts-fonctionnels/README.md) | Fait (2026-07-31) | A faire | A faire | A faire |
| [Primitives transverses](FEATURES/admin-primitives-transverses/README.md) | Fait (2026-07-31) | A faire | A faire | A faire |
| [Regle dialogue vers page](FEATURES/admin-dialogue-vers-page/README.md) | A faire | A faire | A faire | A faire |

## Ordre d'execution

Strictement sequentiel entre features : les primitives s'appuient sur les correctifs, et les
migrations s'appuient sur les primitives.

```
Feature 1 (correctifs)  ->  Feature 2 (primitives)  ->  Feature 3 (migrations)
     risque faible             risque modere              risque eleve
```

## Criteres de validation EPIC

- Aucune erreur d'API ne peut plus se presenter comme un etat vide.
- Toute action destructive produit un retour utilisateur explicite.
- Un seul `@keyframes` d'animation skeleton dans tout le projet.
- Une seule formulation par concept : champ obligatoire, URL invalide, confirmation de suppression.
- La regle dialogue/page est ecrite dans `frontend/CLAUDE.md` et respectee par les 15 formulaires.
- Aucune regression de parcours : chaque migration dialogue -> page a son test E2E.
- VQO >= 9.5/10 sur tous les domaines.

## Lien avec l'EPIC-43

L'EPIC-43 (refonte du shell admin : sidebar, fil d'Ariane, palette, dashboard) se poursuit en
parallele. Les deux EPICs ne se recouvrent pas : l'EPIC-43 traite le cadre, l'EPIC-41 le contenu.

Seul point de contact : le dashboard. L'EPIC-43 lot 7 remplace la grille de liens rapides par les
blocs "Reprendre" / "A faire" ; ces blocs devront consommer les primitives d'etat vide et de
skeleton de l'EPIC-41 si celles-ci sont livrees avant.

## Avancement Claude (2026-07-31)

**Feature 1 — Defauts fonctionnels : terminee.** Les sept defauts de l'audit sont corriges. Le
dernier tour a etendu le bandeau d'erreur persistant a Matchs, Palmares, Commandes et Staff : leur
snackbar disparaissait en laissant l'etat vide a l'ecran, une panne d'API s'y lisait comme une base
sans donnee.

**Feature 2 — Primitives transverses : terminee.** Onze primitives livrees et adoptees.

| Primitive | Adoption |
|-----------|----------|
| `_admin-skeleton.scss` | 11 `@keyframes` -> 1 |
| `<app-skeleton>` | 11 modules |
| `<app-empty-state>` | 12 points d'appel |
| `<app-error-state>` | 11 pages |
| `AdminNotifier` | 48 appels `snackBar.open` |
| `AdminConfirmService` | 17 confirmations -> 1 service |
| `AdminValidators` | 36 `mat-error` |
| `<app-form-actions>` | **14 dialogues sur 21** |
| `AdminDialogService` | 31 ouvertures -> 4 paliers |
| `<app-page-header>` | **13 pages sur 13** |
| `createReorder()` | 6 implementations sur 8 |

Deux primitives ont du s'etendre pour couvrir les derniers cas plutot que de laisser des pages
dehors :
- `<app-page-header>` gagne deux emplacements de projection, `[leading]` et `[subtitle]` :
  l'editeur d'article place un bouton de retour avant son titre, les statistiques un sous-titre
  cliquable ;
- `<app-form-actions>` gagne une entree `color` : reinitialiser un mot de passe est une action
  destructive, la forcer en `primary` aurait efface ce signal.

**Non adopte, et deliberement.** Sept pieds de dialogue restent dehors : cinq n'ont qu'un bouton
"Fermer", un en aligne trois pour l'export, le dernier est le dialogue de confirmation. Ce ne sont
pas des pieds de formulaire — les y forcer ajouterait un bouton de validation sans action. Deux
reordonnancements restent hors de `createReorder()` : `sponsors-list` est presentationnel et emet
vers son parent, `team-members-dialog` et `coaching-staff-dialog` sont precisement les dialogues que
la feature 3 condamne.

`createReorder()` a par ailleurs ete **etendu au deplacement au clavier** (grab & move ARIA) lors du
merge de `develop` : la migration de Twitch vers le helper aurait sinon efface une fonctionnalite
d'accessibilite livree entre-temps. Le helper est desormais strictement superieur aux huit
implementations qu'il remplace.

**Feature 3 — Regle dialogue vers page : non demarree.** Voir la note de sequencement ci-dessous.

## Note de sequencement — feature 3

Les sept migrations dialogue -> page changent la navigation de sept parcours que le PO utilise au
quotidien : nouvelles routes, nouveaux composants, nouvelles entrees de fil d'Ariane, et un test E2E
par migration.

Elles sont volontairement **sorties de la premiere livraison**. Le PO a demande a donner ses retours
depuis la preprod ; livrer d'abord le shell et les primitives lui donne de quoi juger, et ses retours
peuvent legitimement changer la forme des pages cibles. Migrer avant de l'avoir entendu ferait porter
le risque au mauvais moment.
