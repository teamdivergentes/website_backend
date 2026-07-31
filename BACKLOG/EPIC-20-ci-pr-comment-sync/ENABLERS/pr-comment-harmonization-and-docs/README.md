# Enabler — PR comment harmonization & docs

## Contexte technique

Une fois les enablers `backend-pr-comment-sync` et `frontend-pr-comment-sync` livrés, les deux scripts `generate-pr-report.sh` partageront beaucoup de logique commune (table de jobs, sections repliables Trivy, calcul du statut global) mais resteront dans deux dépôts indépendants. Sans documentation et sans checklist, la dérive constatée aujourd'hui se reproduira au prochain ajout de job.

## Objectif

1. **Harmoniser** la structure et le format des deux commentaires (mêmes sections, mêmes emojis, même ordre).
2. **Documenter** chaque job : à quoi il sert, quand il tourne, comment debugger un échec, où trouver les rapports.
3. **Verrouiller** la maintenance : checklist explicite à remplir avant tout ajout de job CI.

## Direction technique

- Créer `docs/devsecops/pr-comment.md` à la racine du dépôt monorepo (`/home/tellebma/DEV/DVG/WEB/docs/`) — fichier unique référencé depuis les README backend et frontend
- Catalogue des jobs sous forme de tableau : nom, dépôt, gating/conditionnel/informationnel, déclencheurs, artefacts produits, lien vers le YAML
- Section « Procédure d'ajout d'un nouveau job CI » avec étapes ordonnées (workflow YAML → variable env dans `pr-report` → ligne dans la table → section repliable si pertinent → mise à jour `OVERALL_STATUS` → documentation)
- Mettre à jour les `CONTRIBUTING.md` (ou créer si absent) backend et frontend avec une checklist « Avant de merger un nouveau job CI »
- Harmoniser visuellement les deux commentaires : mêmes emojis (🔧 / 🐳 / 🚀 / 🔍 / 🎭 / ⚡ / 🗄️), même ordre des sections, même style Markdown

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-harmonize-script-format.md](us-harmonize-script-format.md) | Fait | A faire | A faire | A faire |
| [us-create-pr-comment-doc.md](us-create-pr-comment-doc.md) | Fait | A faire | A faire | A faire |
| [us-add-contributing-checklist.md](us-add-contributing-checklist.md) | Fait | A faire | A faire | A faire |

## Critères de validation enabler

- Les deux commentaires PR ont la même structure (section par section, table identique en colonnes)
- `docs/devsecops/pr-comment.md` existe, liste 100 % des jobs des deux workflows + `e2e-fullstack.yml`
- Les README backend et frontend pointent vers cette doc
- La checklist « ajout d'un nouveau job » est présente dans `CONTRIBUTING.md` (backend + frontend)
- Sur une PR de test, les commentaires backend et frontend sont visuellement cohérents

## Note

Cet enabler **dépend** de la livraison de `backend-pr-comment-sync` et `frontend-pr-comment-sync`. Le livrer en dernier évite les conflits de rebase et garantit une harmonisation sur du code stable.
