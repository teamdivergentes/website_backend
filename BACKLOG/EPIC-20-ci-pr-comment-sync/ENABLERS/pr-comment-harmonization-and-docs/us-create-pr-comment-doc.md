# US — Documenter le commentaire PR dans `docs/devsecops/pr-comment.md`

## Rôle / Action / Bénéfice

> **En tant que** nouveau contributeur (humain ou agent IA),
> **je veux** une page de documentation centralisée qui décrit le commentaire PR,
> **afin de** comprendre quel job correspond à quelle ligne, comment debugger un échec, et comment ajouter un nouveau job sans casser le commentaire.

## Critères d'acceptation

- [x] Fichier `docs/devsecops/pr-comment.md` créé à la racine du monorepo (et copié dans backend/ et frontend/ — 3 repos distincts sans repo racine git)
- [x] Sommaire :
  1. Vue d'ensemble (1 paragraphe : à quoi sert le commentaire, qui le génère)
  2. Catalogue des jobs (tableau)
  3. Logique du statut global (les 3 catégories : gating / conditionnel / informationnel)
  4. Sections du commentaire (ordre + description)
  5. Procédure d'ajout d'un nouveau job CI (checklist)
  6. Debugging (où trouver les logs, comment déclencher manuellement les jobs conditionnels)
- [x] Tableau « Catalogue des jobs » avec colonnes : `Nom du job`, `Dépôt`, `Workflow`, `Catégorie` (gating/conditionnel/informationnel), `Déclencheurs`, `Artefacts produits`
- [x] Couvre **tous** les jobs des 2 dépôts plus `e2e-fullstack.yml`, plus `ghcr-cleanup.yml` (mention) et `discord-notify.yml` (workflow réutilisable)
- [x] Section « Procédure d'ajout d'un nouveau job » contient une checklist en 9 points (inclut mise à jour doc + test sur vraie PR)
- [ ] La doc est référencée depuis `backend/CLAUDE.md` (section CI/CD) et `frontend/CLAUDE.md` — à faire lors du merge (hors scope PR harmonisation)
- [ ] Mention dans le `CLAUDE.md` racine du « Known Pitfalls » — à faire lors du merge

## Effort estimé

S (~1 h)

## Dépendances

- Tous les enablers `backend-pr-comment-sync` et `frontend-pr-comment-sync` livrés (pour avoir la liste finale des jobs reflétés)
