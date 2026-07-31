# US — Dettes mineures backend EPIC-37

**Sévérité** : 🟢 Mineur
**Domaine** : Backend
**ID audit** : BACK-min + SEC-EPIC37-02

## Rôle / Action / Bénéfice

**En tant qu'** équipe backend,
**je veux** solder les petites incohérences relevées,
**afin de** maintenir le niveau de qualité et de cohérence du module.

## Critères d'acceptation

- [ ] **create-trophy.dto.spec.ts** : ajouté (comme `create-match.dto.spec.ts`), couvre regex `image`, `MaxLength`, bornes `Min/Max` sur `placement`.
- [ ] **teamId query param** : `parseOptionalIntegerQueryParam(teamId, ..., { min: 1 })` sur les controllers `matches` **et** `trophies` (cohérence avec `@Min(1)` du DTO).
- [ ] **assertScoresPaired** (SEC-EPIC37-02) : traite `null` explicite comme « renseigné » (`!== undefined && !== null`) → un `PATCH { scoreDvg: null, scoreOpponent: 5 }` est rejeté. Test associé.
- [ ] **Rôle Gestionnaire** : décision PO tracée — soit ajouter les permissions `matches:*`/`trophies:*` au rôle dans `seed.ts`, soit documenter explicitement l'exclusion ici. *(Par défaut : documenter l'exclusion, ne pas élargir sans validation PO.)*
- [ ] `npm run lint` + `npm run test` verts.

## Hors scope (à tracer séparément)

- **Audit-trail sur les `delete`** (SEC-EPIC37-03, INFO) : dette transverse projet (aucun module `AuditLog`) → US Enabler dédiée « Journalisation des actions sensibles », hors EPIC-37.
