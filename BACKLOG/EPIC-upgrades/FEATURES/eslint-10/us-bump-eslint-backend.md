# US — Bumper ESLint 10 cote backend

## Role / Action / Benefice

> **En tant que** Expert Backend NestJS,
> **je veux** mettre a jour `eslint` et `@eslint/js` vers la version 10,
> **afin que** le linter reste aligne sur la stack supportee et beneficie des nouvelles regles.

## Criteres d'acceptation

- [x] `package.json` met `eslint` a `^10.1.0` et `@eslint/js` a `^10.0.1`.
- [x] Flat config deja en place (`eslint.config.mjs`), aucune migration necessaire.
- [x] typescript-eslint@8.56.1 compatible ESLint 10 (peer: `^8.57.0 || ^9.0.0 || ^10.0.0`).
- [x] eslint-plugin-prettier@5.5.5 et eslint-config-prettier@10.1.8 compatibles.
- [x] npm install passe (ESLint 10.3.0 installe).
- [x] `npm run lint` passe avec 0 erreur (1 erreur `no-unnecessary-type-assertion` auto-fixee).

**Statut Claude : Fait** — branche `chore/eslint-10-upgrade` (backend), commit `abc3985`

## Dependances

Aucune.

## Effort

S (≈ 2 h).
