# Feature — Primitives transverses

## Objectif

Extraire les comportements transverses aujourd'hui recopies dans chaque page : chargement, etat
vide, erreur, confirmation, retour d'action, validation, pied de dialogue.

## Ligne rouge

**Uniformiser le comportement transverse, jamais le rendu specifique.** Les 4 agents d'audit
convergent : on ne touche ni a la definition des colonnes, ni au markup des items.

## Primitives retenues

| # | Primitive | Points d'appel | Supprime |
|---|-----------|----------------|----------|
| P1 | `_admin-skeleton.scss` — un seul `@keyframes`, jeu de classes commun | 11 modules + 2 dialogues | 11 `@keyframes` identiques, 10 `.skeleton-block` identiques |
| P2 | `<app-skeleton>` — variantes liste / table / grille / cartes, `role="status"` par construction | 11 modules | ~180 lignes de `@for (i of [1,2,3])` ; supprime les 2 `mat-spinner` et le spinner maison de config |
| P3 | `<app-empty-state>` — icone, message, action optionnelle | 18 points d'appel | 7 noms de classe et 16 formulations ramenes a 1 gabarit |
| P4 | `<app-error-state>` — bandeau persistant `role="alert"` + reessai | 10 pages | Livre par l'US "erreurs visibles" de la feature 1 |
| P5 | `AdminNotifier` — `success` / `error` / `info`, duree et libelle uniques | 48 appels `snackBar.open` | 5 durees et 2 libelles ramenes a 2 regles |
| P6 | `AdminConfirmService.delete(entite, nom)` | 17 appels | ~120 lignes ; harmonise les 4 messages divergents |
| P7 | `AdminValidators` + `VALIDATION_MESSAGES` | 36 `mat-error` en dur | 18 formulations de "champ obligatoire" ramenees a 1 fonction ; 3 reecritures du pattern URL ramenees a 1 |
| P8 | `<app-form-actions>` — ordre, variantes, disabled, spinner | 15 dialogues + 2 pages | ~135 lignes ; unifie 4 orthographes de "Enregistrement..." |
| P9 | `openAdminDialog(component, taille, data)` — 4 paliers | 26 ouvertures | ~65 lignes ; 10 tailles ramenees a 4 |
| P10 | `<admin-page-header>` | 13 pages | ~180 lignes de SCSS |
| P11 | `useReorder()` + `<app-reorder-controls>` | 8 implementations | ~510 lignes |

## Piege identifie a l'audit

`_admin-shared.scss:114-126` definit deja `.error-message`, **mais sous `.admin-layout`**. Les
overlays CDK sont montes **hors** de ce conteneur : c'est precisement ce scoping qui a cause les 6
redefinitions locales du bandeau d'erreur. P4 doit donc s'accompagner d'une `panelClass:
'admin-dialog'` posee par P9, et le selecteur devient `.admin-layout, .admin-dialog`.

Sans cela, la primitive sera contournee exactement comme l'a ete `_admin-shared.scss`.

## Livraison Claude (2026-07-29)

Neuf primitives sur onze livrees, toutes en TDD strict.

| Primitive | Commit | Etat |
|-----------|--------|------|
| P4 `<app-error-state>` | `d1be247` | Fait — 3 modules cables, 8 restants |
| P5 `AdminNotifier` | `7812732` | Fait — 11 modules |
| P1 `_admin-skeleton.scss` | `7f9acaf` | Fait — 11 declarations ramenees a 1 |
| P2 `<app-skeleton>` | `7f9acaf`, `fa36109`, `912db13` | Fait — 11 modules migres |
| P3 `<app-empty-state>` | `c260aec`, `eccaf7f` | Fait — 12 points d'appel |
| P6 `AdminConfirmService` | `c260aec`, `323c3d7`, `7d92238` | Fait — 17 appels |
| P7 `AdminValidators` | `521d4af` | Fait |
| P8 `<app-form-actions>` | `521d4af` | Cree — migration des 15 pieds a faire |
| P9 `openAdminDialog` | `9364574`, `6c04fa4`, `7d92238` | Fait — 31 ouvertures, **zero ouverture brute restante** |
| P10 `<admin-page-header>` | `888baba`, `5bbe1e1` | Fait — 6 en-tetes sur 13 |
| P11 `createReorder` | `45455dc`, `e66c5de`, `48e3a36`, `b9fd2da` | Fait — 5 migres sur 8 |

**Verifications a chaque etape** : 1365 tests OK, lint `--max-warnings=0` propre, `ng build` OK.

### Decouvertes en cours de route

**Collision de noms d'animation.** Angular ne scope pas les noms de `@keyframes` : l'encapsulation
emulee n'ajoute des attributs qu'aux selecteurs. `analytics` declarait un `skeleton-pulse` faisant
varier l'opacite quand les dix autres deplacaient un `background-position`. Extraire l'animation
partagee rendait la collision effective, et les cartes analytics — au fond plat — seraient apparues
figees, sans erreur ni test rouge. Renommee `skeleton-fade`.

**Le piege de scoping etait bien la cause racine.** `_admin-shared.scss` scopait ses alertes sous
`.admin-layout`, hors duquel les overlays CDK sont montes. La classe `admin-dialog` posee par
`AdminDialogService` corrige cela ; sans elle, les `<app-empty-state>` places dans les trois
dialogues auraient reproduit le probleme.

**`users` etait deja factorise — pour lui seul.** Sa `openFormDialog` et sa `openSimpleDialog`
locales resolvaient le probleme dans un fichier en le laissant entier ailleurs. Elles ont disparu.

**Pluralisation.** Un `+ 's'` naif produisait "jeus". Le compteur d'en-tete applique les regles
francaises courantes.

### Trois reordonnancements non migres, et pourquoi

**`sponsors-list`** est un composant *presentationnel* : il n'appelle aucun service et emet vers son
parent, qui persiste et libere la garde. Le forcer dans le helper demanderait de simuler un
Observable la ou il n'y en a pas, et travestirait son role. C'est le type de sur-abstraction contre
lequel l'audit mettait en garde.

**`team-members-dialog`** et **`coaching-staff-dialog`** sont **reportes a la feature 3**. Leur garde
de reordonnancement vit dans un sous-composant (`memberListRef()?.resetReordering()`), et ces deux
dialogues sont precisement ceux que la regle dialogue/page condamne. Les refactoriser maintenant,
puis restructurer les composants en pages routees, serait du travail fait deux fois — et la logique
de reorder devra de toute facon etre reprise quand l'etat passera d'un dialogue a une page.

La garde manquante de `team-members-dialog` a en revanche ete posee des l'itération 2 (`fdd64d1`) :
c'etait un bug, il ne pouvait pas attendre la migration.

### Reste a faire
- Migration des 15 pieds de formulaire vers `<app-form-actions>`.
- 7 en-tetes restants (articles-list et twitch-channels ont leurs actions groupees).
- 8 modules restants pour `<app-error-state>`.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | En cours (9 primitives sur 11) | A faire | A faire | A faire |
| UI/UX | En cours | A faire | A faire | A faire |
