# US — Durcir le seuil Lighthouse SEO en CI

## Role / Action / Benefice

> **En tant que** mainteneur du projet,
> **je veux** que toute regression SEO majeure (perte de meta tag, alt manquant, tag deprecie) bloque la PR,
> **afin que** la qualite SEO ne derive pas au fil des merges.

## Contexte

`frontend/.lighthouserc.json` actuel :

```json
"categories:seo": ["warn", {"minScore": 0.8}]
```

Un seuil `warn` n'est pas bloquant. Une fois tous les quickfixes P0 + JSON-LD livres, le score SEO doit etre >= 90 sur toutes les pages auditees par Lighthouse CI.

## Criteres d'acceptation

- [x] `"categories:seo": ["error", {"minScore": 0.9}]` dans `.lighthouserc.json`
- [x] URLs auditees : `/`, `/articles`, `/structure/equipes`, `/structure/recrutement` (4 URLs)
- [x] Le job `lighthouse` est declenche sur push `develop`, push `main`, tag, PR approuvee, `/run-lighthouse`, `workflow_dispatch`
- [x] Documentation ajoutee dans `frontend/CLAUDE.md` (notes 11 et 12)
- [ ] La PR doit etre mergee **apres** que toutes les autres US de l'EPIC-23 soient livrees — SEQUENCEMENT STRICT

**Statut Claude : Fait** — branche `chore/epic-23-seo-ops`, commit `1c56201`
IMPORTANT : merger EN DERNIER dans EPIC-23

## Effort estime

XS (≈ 0.25 j) — mais sequencement strict en derniere position

## Dependances

Toutes les autres US de l'EPIC-23 doivent etre livrees avant celle-ci.
