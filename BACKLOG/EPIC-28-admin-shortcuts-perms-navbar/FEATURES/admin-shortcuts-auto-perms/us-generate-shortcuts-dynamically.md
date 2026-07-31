# US — Generer dynamiquement les raccourcis dans le frontend

## Role / Action / Benefice

> **En tant qu**'administrateur (ou CM, ou gestionnaire),
> **je veux** voir uniquement les raccourcis correspondant a mes permissions,
> **afin de** ne pas etre confronte a des liens qui mènent a une 403 ou a une page vide.

## Criteres d'acceptation

### Service permissions

- [ ] `PermissionsService` (ou equivalent) expose :
  - `hasAll(perms: string[]): boolean`
  - `hasAny(perms: string[]): boolean`
  - `visibleShortcuts(): Signal<AdminShortcut[]>` qui combine `ADMIN_SHORTCUTS` et les permissions de l'utilisateur courant.
- [ ] Le service reactif (Signals) : si les permissions changent (login/logout/refresh), la liste se met a jour automatiquement.

### Composants

- [ ] Bouton "Administration" du header public (EPIC-21) lit `visibleShortcuts()` plutot que sa propre condition `role === 'admin'`.
- [ ] Dashboard admin (`admin-dashboard.component.ts`) : la liste des cards est generee a partir de `visibleShortcuts()`.
- [ ] Navbar admin : items generes a partir de `visibleShortcuts()` regroupes par `section`.
- [ ] Aucun `*ngIf="role === ..."` ou `[hidden]="!isAdmin"` ne subsiste pour gerer les raccourcis (audit + remplacement).

### Tests

- [ ] Test unitaire `PermissionsService` : `visibleShortcuts()` retourne le bon sous-ensemble pour 4 cas (admin full, CM articles only, gestionnaire teams only, anonyme).
- [ ] Test unitaire dashboard : rendu avec 0 / 1 / N raccourcis.
- [ ] Aucune regression sur les guards (le filtre raccourcis ne remplace pas les guards de route).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait | A faire | A faire | A faire |
| UI/UX | A faire | A faire | A faire | A faire |
