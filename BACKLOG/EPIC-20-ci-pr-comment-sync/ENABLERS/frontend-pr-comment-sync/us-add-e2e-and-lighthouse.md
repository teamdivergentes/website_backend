# US — Afficher E2E Playwright et Lighthouse dans le commentaire PR frontend

## Rôle / Action / Bénéfice

> **En tant que** Expert QA / SEO,
> **je veux** voir le statut des jobs `e2e` (Playwright) et `lighthouse` (Web Vitals) dans le commentaire PR,
> **afin de** savoir s'ils ont tourné, échoué ou été skipped, et d'accéder aux artefacts en un clic.

## Critères d'acceptation

### Lignes ajoutées dans la table principale

- [ ] `**Tests E2E** | $E2E_STATUS | Playwright (déclenché sur approbation PR ou /run-e2e)`
- [ ] `**Lighthouse** | $LIGHTHOUSE_STATUS | Web Vitals (déclenché sur main ou /run-lighthouse)`

### Section repliable « 🎭 Tests E2E »

- [ ] Statut explicite (✅ / ❌ / ⏭️)
- [ ] Si succès : « Rapport Playwright disponible dans les artifacts du run » avec lien
  `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
- [ ] Si skipped : « Pour déclencher manuellement, commenter `/run-e2e` sur cette PR »
- [ ] Si failure : pointer le lien artifact `playwright-report` (le job uploade déjà cet artifact ligne 197-203 de `cicd.yml`)

### Section repliable « ⚡ Lighthouse »

- [ ] Statut explicite (✅ / ❌ / ⏭️)
- [ ] Note « Non bloquant — Lighthouse est informationnel »
- [ ] Si skipped : « Pour déclencher, commenter `/run-lighthouse` »
- [ ] URLs auditées listées (`http://localhost:4200` et `http://localhost:4200/structure/equipes`, lues depuis le job ou hardcodées)

### Variables d'env

- [ ] Le script lit `E2E_STATUS` et `LIGHTHOUSE_STATUS` (déjà passées par le job `pr-report`)
- [ ] Le script lit `GITHUB_RUN_ID` (à ajouter au bloc `env:` du job `pr-report` : `GITHUB_RUN_ID: ${{ github.run_id }}`)

## Effort estimé

S (~1 h)

## Dépendances

- Aucune

## Note

Ces jobs sont **conditionnels** : `skipped` est un état acceptable, le statut global ne doit pas tomber à FAILED si l'un des deux est skipped. C'est cohérent avec le job `workflow-status` actuel.
