# US — Refactorer `analytics.service.ts` (678 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Backend NestJS,
> **je veux** scinder `analytics.service.ts` en plusieurs services à responsabilité unique,
> **afin que** la maintenabilité augmente, que la couverture devienne testable par domaine et que Sonar ne flague plus le fichier comme "God class".

## Critères d'acceptation

- [ ] Le fichier originel est remplacé par :
  - `analytics-overview.service.ts` — agrégats globaux (utilisateurs actifs, pages vues)
  - `analytics-pages.service.ts` — métriques par page
  - `analytics-traffic.service.ts` — sources, devices, géoloc
  - `analytics-cache.service.ts` — gestion du cache (clé, TTL, invalidation)
  - `analytics.service.ts` (façade) ou suppression au profit de l'injection directe
- [ ] **Aucune régression fonctionnelle** : endpoints `/api/analytics/*` retournent les mêmes payloads (snapshot tests existants verts)
- [ ] **Aucun fichier > 250 lignes** parmi les nouveaux services
- [ ] Les tests unitaires existants migrent vers les nouveaux fichiers (1 fichier de spec par service)
- [ ] Couverture lignes >= 80 % sur chaque nouveau fichier
- [ ] Couverture branches >= 70 % sur chaque nouveau fichier
- [ ] `npm run lint` propre
- [ ] `npm run build` propre
- [ ] Sonar ne flague plus aucun "God class" / "File has too many lines" sur le module `analytics`

## Effort estimé

L (~2 j)

## Dépendances

- Aucune (peut démarrer en parallèle des autres refacto)
