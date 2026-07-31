# US — Afficher le statut `validate-migrations` dans le commentaire PR backend

## Rôle / Action / Bénéfice

> **En tant que** reviewer de PR backend,
> **je veux** voir si le job `validate-migrations` (Prisma) est passé directement dans le commentaire CI,
> **afin de** détecter en un coup d'œil un drift entre le schema et les migrations sans devoir ouvrir l'onglet Actions.

## Critères d'acceptation

- [ ] Dans `backend/.github/workflows/cicd.yml`, le job `pr-report` ajoute `validate-migrations` à son `needs:`
- [ ] Le bloc `env:` du job `pr-report` expose `VALIDATE_MIGRATIONS_STATUS: ${{ needs.validate-migrations.result || 'skipped' }}`
- [ ] `backend/.github/scripts/generate-pr-report.sh` lit `VALIDATE_MIGRATIONS_STATUS` (avec fallback `skipped`)
- [ ] La table « 🔧 Détails du build » contient une ligne `**Validation migrations** | $VALIDATE_MIGRATIONS_STATUS | Prisma migrate diff (drift schema vs migrations)`
- [ ] Une section repliable `<details><summary>🗄️ Migrations Prisma</summary>` est ajoutée :
  - statut explicite (✅ / ❌ / ⏭️)
  - rappel de la règle « les migrations sont immuables » avec lien vers `backend/CLAUDE.md` § Prisma Migrations
  - en cas d'échec, message « Drift détecté, créer une migration corrective »
- [ ] Sur une PR de test où `validate-migrations` échoue, le commentaire reflète l'échec et le statut global passe à `❌ FAILED`

## Effort estimé

S (~1 h)

## Dépendances

- Aucune (autonome)
