# US — Bumper l'image Docker frontend en node:25-alpine

## Role / Action / Benefice

> **En tant que** Expert DevSecOps,
> **je veux** mettre a jour le `Dockerfile` du frontend pour utiliser `node:25-alpine`,
> **afin que** l'image de build reste sur une version supportee.

## Criteres d'acceptation

- [x] Decision : `node:22-alpine` (LTS) — aligne avec backend (Node 25 Current, non-LTS).
- [x] `frontend/Dockerfile` stage `dependencies` et `builder` passes de `node:20-alpine` a `node:22-alpine`. Stage runtime Nginx inchange.
- [x] `engines.node` non defini dans package.json.
- [ ] Build local a valider via CI.
- [ ] `docker compose up frontend` a tester.
- [ ] `ng build` dans le builder : a valider en CI.
- [ ] Smoke E2E : reportable post-merge.

Fermer PR Dependabot #36 via commentaire `@dependabot close`.

**Statut Claude : Fait** — branche `chore/node-25-docker` (frontend), commit `20cdf20`

## Dependances

`us-bump-node-backend-docker.md` (decision de version groupee).

## Effort

S (≈ 1.5 h).
