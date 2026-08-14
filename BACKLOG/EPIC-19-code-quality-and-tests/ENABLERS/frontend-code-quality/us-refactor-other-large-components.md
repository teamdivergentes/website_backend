# US — Découper les autres composants frontend > 350 lignes

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** ramener tous les composants frontend sous 350 lignes,
> **afin que** la maintenabilité soit homogène et que Sonar ne flague aucun composant comme trop gros.

## Périmètre

| Composant | Lignes actuelles | Stratégie de découpe |
|-----------|------------------|----------------------|
| `sponsor-links-dialog.component.ts` | 400 | Extraire `sponsor-link-form` + `sponsor-link-row` |
| `editor-blocks-renderer.component.ts` | 397 | Découper par type de bloc (`block-text`, `block-image`, `block-list`, etc.) + un util `block-renderer.ts` |
| `recruitment-form-dialog.component.ts` | 373 | Extraire `recruitment-form` (réutilisable côté public + admin) |
| `recruitment.component.ts` (admin) | 360 | Vérifier — extraire la liste si nécessaire |
| `teams.component.ts` (admin) | 357 | Vérifier — extraire la table |

## Critères d'acceptation

- [ ] Tous les composants concernés < 350 lignes
- [ ] Sous-composants standalone, OnPush, testables isolément
- [ ] Externalisation HTML / SCSS si > 80 lignes
- [ ] **Aucune régression** : E2E couvrant ces écrans verts
- [ ] Tests unitaires sur chaque sous-composant (>= 80 %)
- [ ] `npm run lint` + `ng build` propres

## Effort estimé

L (~2 j)

## Dépendances

- Aucune (parallélisable)
