# US — Bumper ESLint 10 cote frontend

## Role / Action / Benefice

> **En tant que** Expert Frontend Angular,
> **je veux** mettre a jour `eslint` vers la version 10 sur le repo frontend,
> **afin que** le linter Angular reste aligne sur la stack supportee.

## Criteres d'acceptation

- [x] `package.json` met `eslint` a `^10.1.0` et `@eslint/js` a `^10.0.1`.
- [x] @typescript-eslint/eslint-plugin@8.58.0 et parser@8.56.0 supportent ESLint 10 (peer: `^8.57.0 || ^9.0.0 || ^10.0.0`). Pas d'@angular-eslint/* dans le projet (non utilise).
- [x] Flat config deja en place (`eslint.config.js`), aucune migration necessaire.
- [x] npm install passe (ESLint 10.3.0 installe).
- [x] `npm run lint` passe avec 0 erreur (1 erreur `no-useless-assignment` corrigee dans editor-blocks-renderer).
- [ ] CI lint vert a verifier apres push.

**Statut Claude : Fait** — branche `chore/eslint-10-upgrade` (frontend), commit `70c7959`

## Dependances

`us-bump-eslint-backend.md` (pour aligner les versions des plugins partages).

## Effort

S (≈ 2 h).
