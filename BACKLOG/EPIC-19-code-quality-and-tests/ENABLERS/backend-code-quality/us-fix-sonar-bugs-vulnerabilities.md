# US — Corriger 100 % des bugs et vulnérabilités Sonar backend

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team + Backend NestJS,
> **je veux** que `dvg-backend` ait 0 bug et 0 vulnérabilité sur Sonar,
> **afin que** le Quality Gate `DVG-Strict` puisse être atteint et que la production soit sûre.

## Critères d'acceptation

- [ ] Récupérer la liste exhaustive depuis l'API Sonar :
  - Bugs : `/api/issues/search?componentKeys=dvg-backend&types=BUG`
  - Vulnérabilités : `/api/issues/search?componentKeys=dvg-backend&types=VULNERABILITY`
  - Hotspots : `/api/hotspots/search?projectKey=dvg-backend`
- [ ] Pour chaque issue, traiter dans cet ordre :
  - Vraie issue → corriger
  - Faux positif → marquer "Won't Fix" sur Sonar avec justification écrite
  - Hotspot → reviewer (passer à `Safe` ou `Acknowledged`)
- [ ] Test unitaire ajouté pour chaque correction (régression)
- [ ] **0 bug** sur `dvg-backend` (Reliability rating A)
- [ ] **0 vulnérabilité** sur `dvg-backend` (Security rating A)
- [ ] **100 % security hotspots reviewed**
- [ ] Audit `security` agent passé (revue manuelle des corrections)

## Effort estimé

M-L (~1.5-2 j) selon volume d'issues remontées par la baseline

## Dépendances

- US `us-capture-sonar-baseline.md` (pour avoir la liste réelle)
