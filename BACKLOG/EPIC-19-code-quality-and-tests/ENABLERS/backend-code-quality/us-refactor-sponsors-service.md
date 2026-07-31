# US — Refactorer `sponsors.service.ts` (486 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Backend NestJS,
> **je veux** sortir la gestion des `SponsorImage` et `SponsorLink` dans des services dédiés,
> **afin que** chaque service ait une responsabilité unique et que le code soit testable de manière isolée.

## Critères d'acceptation

- [ ] Création de `sponsor-images.service.ts` (CRUD images + association sponsor)
- [ ] Création de `sponsor-links.service.ts` (CRUD links + association sponsor)
- [ ] `sponsors.service.ts` ne gère plus que la racine `Sponsor` et délègue aux deux nouveaux services
- [ ] Le module `SponsorsModule` expose les trois services (DI propre)
- [ ] **Aucune régression** : les endpoints `/api/sponsors/*` retournent les mêmes payloads (E2E vert)
- [ ] **Aucun fichier > 250 lignes**
- [ ] Tests unitaires migrés et couverture >= 80 %
- [ ] `npm run lint` + `npm run build` propres
- [ ] Sonar : 0 issue critique sur le module `sponsors`

## Effort estimé

M (~1 j)

## Dépendances

- Aucune
