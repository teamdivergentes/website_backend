# EPIC-28 — Raccourcis admin auto perms-aware + reorga navbar

## Objectif

Rendre la navigation admin **adaptative** : raccourcis et navbar reflètent automatiquement les permissions de l'utilisateur connecté, sans configuration manuelle ni duplication. Au passage, profiter du chantier pour reorganiser la navbar admin (regroupements logiques, ordre, libelles).

## Perimetre

- **Raccourcis admin auto** : la liste des raccourcis (header public + dashboard admin + menus rapides) est generee dynamiquement a partir des permissions de l'utilisateur, **et non plus codee en dur**.
- **Filtrage perms-aware** : si un utilisateur n'a pas la permission, le raccourci correspondant n'apparait pas (ni desactive ni affiche grise).
- **Reorga navbar admin** : audit de la structure actuelle, regroupements logiques, renommages, ordre prioritaire des sections.
- **Tests** : matrice de permissions par role (Admin / CM / Gestionnaire / autre) en E2E.

## Hors perimetre

- Modification du modele de permissions backend (deja en place).
- Refonte visuelle complete du panel admin → autre EPIC si besoin.
- Gestion fine d'expiration ou de revocation de permissions.

## Branche git

`feat/epic-28-admin-shortcuts-navbar` (depuis `develop`).

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Raccourcis admin auto perms-aware](FEATURES/admin-shortcuts-auto-perms/README.md) | Fait (2026-05-17, hors E2E matrix) | A faire | A faire | A faire |
| [Reorganisation de la navbar admin](FEATURES/admin-navbar-reorg/README.md) | Audit fait (2026-07-29) — implementation reprise par EPIC-43 | Fait (2026-07-29) | Voir EPIC-43 | Voir EPIC-43 |

## Livraison Claude (2026-05-17)

Branche `feat/epic-28-admin-shortcuts-navbar` (frontend, 5 commits) :
- Nouveau registre `src/shared/config/admin-shortcuts.ts` — 12 raccourcis avec `requiredPermissions` + `group`
- Nouveau service `AdminShortcutsService` — Signals computed pour `availableShortcuts()`, `canShortcut(key)`, `shortcutsBySection()`
- Composants refactores : header public, dashboard-stats, admin-sidebar (toutes listes hardcodees remplacees par boucles sur le registre)
- **1038 tests OK** (+30), lint + tsc verts
- Couverture dashboard-stats : 6 → 12 raccourcis (manquaient users, roles, games, articles, analytics)

## Brainstorming navbar (2026-07-29)

L'US d'audit de la Feature 2 est **satisfaite**. Spec :
`frontend/docs/superpowers/specs/2026-07-29-admin-shell-refonte-design.md` (commit `ff83dec`).

Constat qui a oriente la suite : la taxonomie `section` livree le 2026-05-17 est inexploitable
telle quelle — `content` absorbe 7 des 14 entrees, `analytics` et `tools` sont des groupes a 1 item.
Pour un Gestionnaire elle produirait 3 groupes dont 2 orphelins. Le redecoupage precede donc
l'affichage. Nouveau decoupage retenu : `esport` / `contenu` / `structure` / `admin`, plus une zone
epinglee.

L'implementation est **reprise par EPIC-43** (`BACKLOG/EPIC-43-admin-shell-refonte/`), le PO ayant
elargi le perimetre au shell admin complet — ce que l'EPIC-28 excluait explicitement.

**Reste** :
- US #629 — Matrice E2E permissions x raccourcis par role (Docker requis). **Couverte par les tests
  E2E de l'EPIC-43**, feature Navigation admin.
- Feature 2 — Reorganisation navbar (brainstorming PO requis)

## Criteres de validation EPIC

- Un utilisateur connecte voit **strictement** les raccourcis correspondant a ses permissions (ni plus, ni moins).
- Aucune liste de raccourcis n'est codee en dur cote frontend (toute reference est tiree d'un mapping centralise).
- La navbar admin est reorganisee selon un schema valide par le PO (brainstorming prealable).
- Tests E2E Playwright : matrice permissions x raccourcis pour au moins 3 roles (Admin, CM, Gestionnaire).
- Aucune regression sur les pages admin existantes.
- VQO >= 9.5/10 sur tous les domaines.

## Notes

- L'EPIC-21 (raccourci "Administration" dans le header public) a introduit la mecanique de "bouton conditionnel selon role". Cette base est a generaliser/factoriser.
- EPIC-16 enabler "Permissions upload images role CM" rappelle que les permissions sont fines (granularite par action + ressource) — le mapping raccourci → permission doit l'integrer.
- Brainstorming UX a faire en amont du dev (cf. [[superpowers:brainstorming]]) avec maquette de la nouvelle navbar.
