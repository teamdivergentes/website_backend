# US — Mentionner le workflow `e2e-fullstack.yml` dans le commentaire PR frontend

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** que le commentaire PR frontend signale l'existence du workflow `e2e-fullstack.yml` (E2E Docker Compose) et son statut s'il a tourné,
> **afin de** ne pas oublier que ce workflow existe et d'avoir un point d'entrée pour le consulter.

## Critères d'acceptation

### Cas simple (recommandé)

- [ ] Section repliable `<details><summary>🔁 E2E Full-Stack (Docker Compose)</summary>` ajoutée dans `generate-pr-report.sh`
- [ ] Contenu :
  - Description : « Workflow indépendant `e2e-fullstack.yml` qui orchestre Postgres + Backend + Frontend via Docker Compose et lance Playwright sur la stack complète »
  - Déclencheurs : push main, tag, approbation PR, commentaire `/run-e2e`, workflow_dispatch
  - Lien vers l'onglet Actions filtré sur ce workflow :
    `https://github.com/${GITHUB_REPOSITORY}/actions/workflows/e2e-fullstack.yml`
  - Note : « Ce workflow est indépendant de `cicd.yml` et tourne dans son propre run. Pour le déclencher manuellement sur cette PR : commenter `/run-e2e` »

### Cas avancé (optionnel, si effort raisonnable)

- [ ] Récupérer via API GitHub le dernier run de `e2e-fullstack.yml` pour le SHA courant et afficher son statut
  - Endpoint : `GET /repos/{owner}/{repo}/actions/workflows/e2e-fullstack.yml/runs?head_sha=${GITHUB_SHA}`
  - Si non trouvé : afficher `skipped` ou « non exécuté pour ce commit »
- [ ] À ne faire que si le surcoût est faible (curl + jq déjà disponibles dans le job)

## Effort estimé

S (~30 min — version simple) / M (~1 h — version avec API GitHub)

## Dépendances

- Aucune
