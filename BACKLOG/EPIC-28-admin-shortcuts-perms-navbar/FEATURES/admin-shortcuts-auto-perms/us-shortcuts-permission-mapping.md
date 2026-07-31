# US — Mapper chaque raccourci a sa permission requise

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** une source unique de verite qui associe chaque raccourci admin a la (ou les) permission(s) qu'il requiert,
> **afin de** ne plus avoir a dupliquer la logique d'affichage dans plusieurs composants.

## Criteres d'acceptation

- [ ] Nouveau fichier `frontend/src/shared/config/admin-shortcuts.ts` :
  - Exporte une constante `ADMIN_SHORTCUTS: AdminShortcut[]`
  - Chaque entree contient : `key`, `label`, `icon`, `routerLink`, `requiredPermissions: string[]` (mode AND), `section` (groupe navbar).
- [ ] Couvre **tous** les raccourcis actuellement codes en dur dans le frontend (audit prealable necessaire).
- [ ] Au moins 80 % de couverture TU sur le fichier (tableaux + types + serialisation).
- [ ] Documentation JSDoc concise sur la convention de nommage des `key` et `section`.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait | A faire | A faire | A faire |
