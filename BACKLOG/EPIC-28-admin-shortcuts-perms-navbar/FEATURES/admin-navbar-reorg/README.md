# Feature — Reorganisation de la navbar admin

## Objectif

Profiter du chantier "raccourcis perms-aware" pour reorganiser la navbar du panel admin : regroupements logiques, ordre des sections, libelles plus clairs, suppression des doublons eventuels.

## Composants impactes

- `frontend/src/app/admin/layout/` (sidebar + topbar admin).
- `frontend/src/shared/config/admin-shortcuts.ts` : le champ `section` doit refleter la nouvelle structure.
- Eventuellement le SCSS (alignement, paddings, transitions).

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Audit + brainstorming de la nouvelle organisation](us-audit-and-brainstorm-navbar.md) | Fait (2026-07-29) | Fait (2026-07-29) | Sans objet | Sans objet |
| [Implementer la nouvelle structure de la navbar admin](us-implement-navbar-reorg.md) | Reprise par EPIC-43 | — | — | — |

## Suite (2026-07-29)

L'US d'audit est satisfaite : spec de design
`frontend/docs/superpowers/specs/2026-07-29-admin-shell-refonte-design.md` (commit `ff83dec`),
valide par le PO.

L'US d'implementation est **reprise par EPIC-43** (`BACKLOG/EPIC-43-admin-shell-refonte/`), qui
elargit le perimetre au shell admin complet : sidebar, fil d'Ariane, palette Cmd+K et dashboard.
L'EPIC-28 excluait explicitement la "refonte visuelle complete du panel admin -> autre EPIC si
besoin". Les criteres d'acceptation de cette US sont couverts par les lots 1 a 3 de l'EPIC-43.
