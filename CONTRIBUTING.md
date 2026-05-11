# CONTRIBUTING — Backend NestJS

Merci de contribuer au projet Team Divergentes. Ce document décrit les conventions à respecter pour maintenir la qualité du pipeline CI/CD.

## Prérequis

- Node.js 22+
- Docker + Docker Compose
- Accès au runner self-hosted (ou utiliser les actions GitHub sur fork)

## Workflow de contribution

1. Créer une branche depuis `develop` : `feat/`, `fix/`, `chore/`, `refactor/`
2. Implémenter le code avec tests unitaires (Jest, couverture >= 80 %)
3. Lancer `npm run lint && npm run test` localement avant de pousser
4. Ouvrir une PR vers `develop`
5. Le pipeline CI commente automatiquement la PR avec le statut de chaque job

## Lors de l'ajout d'un nouveau job CI

Toute PR qui ajoute ou modifie un job dans `.github/workflows/cicd.yml` **doit** cocher cette checklist dans la description de PR :

```markdown
- [ ] Job ajouté dans `.github/workflows/cicd.yml`
- [ ] `needs:` du job `workflow-status` mis à jour si gating
- [ ] `needs:` du job `pr-report` mis à jour
- [ ] Variable `<JOB>_STATUS` ajoutée au bloc `env:` de `pr-report`
- [ ] Ligne ajoutée dans la table principale de `generate-pr-report.sh`
- [ ] Section repliable ajoutée si artefacts produits
- [ ] Calcul `OVERALL_STATUS` mis à jour selon la catégorie (gating / conditionnel / informationnel)
- [ ] Doc `docs/devsecops/pr-comment.md` mise à jour (catalogue + section pertinente)
- [ ] Testé sur une PR : le commentaire reflète bien le nouveau job
```

La procédure détaillée est disponible dans [`docs/devsecops/pr-comment.md`](../docs/devsecops/pr-comment.md) (section « Procédure d'ajout d'un nouveau job CI »).

## Commits

Format Conventional Commits obligatoire : `feat(scope):`, `fix(scope):`, `chore(scope):`, etc.

Commits atomiques — un commit = une responsabilité.

## Conventions de code

- DTOs validés avec `class-validator`
- Routes protégées par défaut (`JwtAuthGuard` global) — utiliser `@Public()` explicitement
- Jamais de secrets dans le code source
- Migrations Prisma immuables — toujours créer une nouvelle migration
