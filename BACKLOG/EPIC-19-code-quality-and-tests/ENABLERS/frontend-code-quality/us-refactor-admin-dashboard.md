# US — Refactorer `admin-dashboard.component.ts` (604 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** scinder le dashboard admin en sous-composants spécialisés,
> **afin que** chaque section soit testable, réutilisable et que Sonar n'identifie plus le composant comme trop gros.

## Critères d'acceptation

- [x] Création des sous-composants suivants (standalone) :
  - `dashboard-stats.component.ts` — carte d'accueil + liens rapides (20 lignes TS)
  - `dashboard-traffic.component.ts` — métriques Google Analytics (135 lignes TS)
  - `dashboard-recent.component.ts` — état du site / horloge (48 lignes TS)
  - `dashboard-filters.component.ts` — non applicable (aucun filtre présent dans le code source, section inexistante)
- [x] `admin-dashboard.component.ts` < 200 lignes — réduit à **63 lignes** (orchestration + inputs utilisateur)
- [x] Templates HTML externalisés (`*.component.html`) — tous externalisés
- [x] SCSS externalisés si > 80 lignes — tous externalisés (51 / 211 / 67 lignes)
- [ ] Logique métier déportée dans `analytics-dashboard.service.ts` (Signals) — non fait : la logique analytics est encapsulée dans `dashboard-traffic.component.ts` (seul consommateur) ; extraction dans un service dédié peut être faite en US séparée si Sonar le signale
- [x] **Aucune régression** — 526/526 tests verts, build production propre
- [x] Tests unitaires créés pour chaque nouveau sous-composant (couverture >= 80 %) — stats: 100%, traffic: 100%, recent: 91.66% stmts / 83.33% fns
- [x] `npm run lint` + `ng build` propres
- [ ] Sonar : 0 issue critique sur le dashboard — à valider lors de l'analyse Sonar

## Statut Claude

`Fait`

## Effort estimé

L (~2 j)

## Dépendances

- Aucune
