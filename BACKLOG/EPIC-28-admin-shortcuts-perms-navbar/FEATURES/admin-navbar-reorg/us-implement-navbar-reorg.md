# US — Implementer la nouvelle structure de la navbar admin

## Role / Action / Benefice

> **En tant qu**'utilisateur admin,
> **je veux** une navbar admin reorganisee selon la structure validee,
> **afin de** trouver plus facilement les sections que j'utilise au quotidien.

## Criteres d'acceptation

- [ ] Implementation conforme a la maquette / structure validee dans l'US d'audit.
- [ ] La navbar s'appuie sur `ADMIN_SHORTCUTS` (registre central de la 1re feature) et le `section` definit le regroupement.
- [ ] Aucune permission n'est codee en dur dans le template de la navbar : tout passe par `visibleShortcuts()`.
- [ ] Animations / transitions identiques ou ameliorees par rapport a la version actuelle.
- [ ] Responsive : la navbar reste utilisable < 1024 px (collapse / drawer) — pas de regression.
- [ ] Tests unitaires : rendu pour 4 roles (admin, CM, gestionnaire, anonyme), assertions sur les sections / items visibles.
- [ ] Audit accessibilite : focus visible, `aria-current="page"` sur l'item actif, navigation clavier.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| UI/UX | A faire | A faire | A faire | A faire |
