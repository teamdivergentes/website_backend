# US — Réduire la dépendance du CI aux runners self-hosted

**Priorité** : 🟠 2
**Fichier** : `.github/workflows/cicd.yml` (backend + frontend)

## Rôle / Action / Bénéfice

**En tant qu'** équipe de développement,
**je veux** que les jobs n'ayant pas besoin du VPS tournent sur des runners GitHub-hosted,
**afin que** la CI reste utilisable même si les runners self-hosted tombent, et que la file cesse d'être saturée.

## Problème constaté

| Repo | Jobs sur self-hosted | Jobs sur `ubuntu-latest` |
|---|---|---|
| Backend | **10** / 16 | 6 |
| Frontend | **10** / 16 | 6 |

Soit potentiellement ~20 jobs concurrents pour **2 runners**, partagés entre les deux repos. Conséquences observées : file de 5+ runs en attente, et surtout **gel total de la CI** lors de l'incident 1.

Or `lint`, `test-unit`, `semgrep`, `sonarqube`, `mutation-test` n'ont aucun besoin du contexte VPS.

## Critères d'acceptation

- [ ] Basculés sur `ubuntu-latest` : `lint`, `test-unit`, `semgrep`, `sonarqube`, `mutation-test`.
- [ ] Restent sur self-hosted (justifié par le contexte VPS) : `docker` (cache buildx local), `scan-image`, `smoke-release`, `test-e2e` / `e2e-fullstack`.
- [ ] Le job `build` est évalué : s'il ne sert qu'à compiler/mettre en cache `node_modules`, il bascule aussi sur `ubuntu-latest`. Justifier le choix retenu en commentaire.
- [ ] Adaptation des dépendances de cache : les jobs GitHub-hosted ne partagent plus le cache local du VPS → utiliser `actions/cache` ou `actions/setup-node` avec `cache: npm`. **Vérifier qu'aucun job ne dépend implicitement d'un `node_modules` produit sur le VPS.**
- [ ] Aucune régression : la CI complète passe au vert sur une PR de test.
- [ ] Appliqué de façon symétrique dans les 2 repos.

## Bénéfice attendu

File 2-3× plus rapide, et une panne de runner ne bloque plus que la partie build/deploy au lieu de l'intégralité du pipeline.
