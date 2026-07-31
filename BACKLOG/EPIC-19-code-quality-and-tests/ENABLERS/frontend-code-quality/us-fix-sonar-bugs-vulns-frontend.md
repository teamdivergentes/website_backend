# US — Corriger 100 % des bugs et vulnérabilités Sonar frontend

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team + Frontend Angular,
> **je veux** que `dvg-frontend` ait 0 bug et 0 vulnérabilité sur Sonar,
> **afin que** le Quality Gate `DVG-Strict` soit atteint et que les utilisateurs publics soient protégés (XSS, fuite token, dépendances vulnérables).

## Critères d'acceptation

- [ ] Récupérer la liste exhaustive depuis `/api/issues/search?componentKeys=dvg-frontend&types=BUG,VULNERABILITY` et hotspots
- [ ] Pour chaque issue : corriger / Won't Fix justifié / hotspot reviewé
- [ ] Vigilance particulière sur :
  - `bypassSecurityTrust*` injustifié (lever ou justifier)
  - URLs externes en `target="_blank"` sans `rel="noopener noreferrer"`
  - Appels HTTP sans `withCredentials` quand un cookie session est attendu (cf. EPIC-16)
  - Dépendances npm flaguées vulnérables (`npm audit`)
- [ ] Test unitaire ou E2E ajouté pour chaque correction comportementale (régression)
- [ ] **0 bug** sur `dvg-frontend` (Reliability rating A)
- [ ] **0 vulnérabilité** sur `dvg-frontend` (Security rating A)
- [ ] **100 % security hotspots reviewed**
- [ ] Audit `security` agent passé

## Effort estimé

M (~1.5 j)

## Dépendances

- US `us-capture-sonar-baseline.md`
