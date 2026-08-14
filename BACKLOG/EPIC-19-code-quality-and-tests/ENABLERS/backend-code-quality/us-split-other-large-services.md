# US — Découper les autres services backend > 300 lignes

## Rôle / Action / Bénéfice

> **En tant que** Expert Backend NestJS,
> **je veux** ramener tous les services backend sous 300 lignes,
> **afin que** chaque module respecte le seuil de maintenabilité défini dans `CLAUDE.md` (200-400 lignes typique).

## Périmètre

Fichiers concernés (audit 2026-04-25) :

| Fichier | Lignes actuelles | Stratégie de découpe |
|---------|-----------------|----------------------|
| `recruitment-application.service.ts` | 355 | Extraire `application-notifier.service.ts` (mail + Discord) |
| `articles.service.ts` | 318 | Extraire `article-blocks.util.ts` (rendu des blocs d'éditeur) |
| `teams.service.ts` | 308 | Extraire `team-sort.util.ts` + `team-filter.util.ts` |
| `team-members.service.ts` | 289 | Vérifier — découper si > 250 après refacto teams |
| `games.service.ts` | 259 | Vérifier — laisser tel quel si propre |
| `users.service.ts` | 254 | Vérifier — laisser tel quel si propre |
| `link-meta.service.ts` | 243 | Vérifier — laisser tel quel si propre |

## Critères d'acceptation

- [ ] Tous les services concernés < 300 lignes
- [ ] Les utils extraits sont des fonctions pures, testables sans DI
- [ ] **Aucune régression** : tous les endpoints retournent les mêmes payloads (E2E vert)
- [ ] Tests unitaires existants verts + ajout de TU sur les utils extraits (couverture 100 % sur les utils purs)
- [ ] `npm run lint` + `npm run build` propres
- [ ] Sonar : aucun fichier > 400 lignes sur `dvg-backend`

## Effort estimé

L (~2 j)

## Dépendances

- Aucune (parallélisable avec les deux US précédentes)
