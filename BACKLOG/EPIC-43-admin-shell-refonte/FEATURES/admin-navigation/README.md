# Feature — Navigation admin

## Objectif

Reorganiser la sidebar admin en groupes semantiques, corriger les libelles et icones, deriver le fil
d'Ariane du registre central, et livrer l'accessibilite promise par `DESIGN_SYSTEM.md` §18.

## Composants impactes

- `frontend/src/shared/config/admin-shortcuts.ts` — type `AdminShortcutSection`, champs `section`,
  `label`, `icon` ; nouveaux exports `SECTION_ORDER` et `SECTION_LABELS`.
- `frontend/src/app/admin/components/admin-sidebar.component.ts` — template, `FA_ICON_MAP`, styles.
- `frontend/src/app/admin/components/admin-header.component.ts` — suppression de `routeTitles`.
- `frontend/src/app/admin/layout/admin-layout.component.ts` — persistance de l'etat replie,
  `ScreenSizeService`.

## Contrainte d'implementation

`shortcutsBySection()` renvoie une `Map`, dont l'ordre d'iteration est celui d'insertion, c'est-a-dire
l'ordre de `ADMIN_SHORTCUTS`. **Ne pas iterer sur la Map dans le template** : boucler sur
`SECTION_ORDER` et lire la Map par cle. Sinon l'ordre d'affichage des groupes depend silencieusement
de l'ordre de declaration du registre.

## Suivi par US

| US | Lot | Claude | PO | E2E | Livre |
|----|-----|--------|----|----|-------|
| [Redecoupage des sections, libelles et icones](us-redecoupage-sections-libelles.md) | 1 | Fait (2026-07-29) | A faire | A faire | A faire |
| [Sidebar en groupes semantiques](us-sidebar-groupes.md) | 2 | Fait (2026-07-31) | A faire | A faire | A faire |
| [Accessibilite et correctifs](us-a11y-correctifs.md) | 3 | Fait (2026-07-31) | A faire | A faire | A faire |
| [Fil d'Ariane derive du registre](us-breadcrumb-registre.md) | 4 | Fait (2026-07-31) | A faire | A faire | A faire |
