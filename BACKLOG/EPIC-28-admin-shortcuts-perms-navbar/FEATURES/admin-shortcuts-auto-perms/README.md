# Feature — Raccourcis admin auto perms-aware

## Objectif

Générer dynamiquement la liste des raccourcis admin (header public, dashboard, menus rapides) à partir des permissions de l'utilisateur authentifié. Plus aucune liste codée en dur dans le frontend.

## Composants impactes

- Backend : exposer un endpoint `/api/auth/me` (ou enrichir l'existant) renvoyant les permissions effectives de l'utilisateur — verifier qu'il les remonte deja correctement.
- Frontend :
  - `frontend/src/shared/services/permissions.service.ts` (ou equivalent) : helper `canShortcut(key)` / `availableShortcuts()`.
  - Nouveau registre central : `frontend/src/shared/config/admin-shortcuts.ts` qui mappe chaque raccourci a sa(ses) permission(s) requise(s).
  - Composants impactes : header public (bouton "Administration"), `admin-dashboard.component.ts` (cards de raccourcis), navbar admin.

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Mapper chaque raccourci a sa permission requise](us-shortcuts-permission-mapping.md) | Fait | A faire | A faire | A faire |
| [Generer dynamiquement les raccourcis dans le frontend](us-generate-shortcuts-dynamically.md) | Fait | A faire | A faire | A faire |
| [Matrice E2E permissions x raccourcis par role](us-e2e-shortcuts-permissions-matrix.md) | A faire | A faire | A faire | A faire |
