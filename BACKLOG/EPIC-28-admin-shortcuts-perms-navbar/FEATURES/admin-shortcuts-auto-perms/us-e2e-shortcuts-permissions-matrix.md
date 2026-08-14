# US — Matrice E2E permissions x raccourcis par role

## Role / Action / Benefice

> **En tant que** Expert QA,
> **je veux** une matrice E2E qui couvre la visibilite des raccourcis pour 3 roles distincts,
> **afin de** detecter toute regression d'affichage ou de filtrage des perms.

## Criteres d'acceptation

- [ ] Nouveau fichier de specs Playwright `frontend/tests/e2e/admin-shortcuts.spec.ts` (ou equivalent).
- [ ] Pour chaque role (Admin / CM / Gestionnaire / anonyme) :
  - Login avec un compte de seed dedie.
  - Verifier la liste exacte des raccourcis visibles dans : (a) header public, (b) dashboard admin, (c) navbar admin.
  - Verifier qu'un clic sur chaque raccourci visible mene a une page accessible (pas de 403).
- [ ] Test execute via `npx playwright test` localement et via la CI Playwright.
- [ ] Donnees de seed : verifier que les 3 roles existent ou les ajouter au seed backend.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| QA E2E | A faire | A faire | A faire | A faire |
| Backend (seed roles) | A faire | A faire | A faire | A faire |
