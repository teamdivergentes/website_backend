# US — Page de maintenance rendue côté serveur

## User Story

**En tant que** visiteur du site pendant une fermeture,
**je veux** voir une page de maintenance aux couleurs de Team Divergentes m'indiquant que le site revient bientôt,
**afin que** je ne pense ni à une panne, ni à une erreur de ma part, ni à la disparition de la structure.

## Critères d'acceptation

- [ ] **AC1** — Mode actif, `GET /` retourne `503` avec un header `Retry-After`
- [ ] **AC2** — Le HTML retourné **contient le contenu de la page de maintenance** : titre, message, identité visuelle. Un HTML valide mais vide constitue un échec de cette US
- [ ] **AC3** — La page est rendue par le serveur, sans exécution de JavaScript côté client, et reste lisible avec JS désactivé
- [ ] **AC4** — Mode actif, toute route publique (`/`, `/boutique`, `/articles`, `/articles/:slug`, `/structure/equipes`) sert la page de maintenance en `503`
- [ ] **AC5** — Mode actif, `/auth/login` reste accessible et permet de se connecter
- [ ] **AC6** — Mode actif, un compte porteur de `maintenance.bypass` voit le site public normalement, sans page de maintenance
- [ ] **AC7** — Le serveur SSR recevant un `503` du backend ne plante pas et ne produit ni page blanche, ni erreur 500
- [ ] **AC8** — Mode inactif, aucune régression : rendu, previews sociales et codes HTTP identiques à l'état livré par EPIC-29
- [ ] **AC9** — La bascule d'un état à l'autre est visible sans redémarrer le conteneur SSR ni vider un cache manuellement

## Tests

Un test E2E doit couvrir l'AC2 en vérifiant la **présence de contenu** dans le HTML brut, à la manière de `e2e/specs/ssr-meta-tags.spec.ts` livré par EPIC-29. Un test qui se contente d'asserter le code `503` laisserait passer le piège du HTML vide.

L'AC7 mérite un test dédié : couper le backend et vérifier que le SSR dégrade proprement.

## Dépendances

Bloquée par la feature `ssr-infra-integration` d'[EPIC-29](../../../EPIC-29-social-preview-ssr/README.md).
Bloquée par [us-maintenance-guard-503](../../ENABLERS/maintenance-flag-backend/us-maintenance-guard-503.md).

## Statut

| Claude | PO | E2E | Livré |
|--------|----|----|-------|
| A faire | A faire | A faire | A faire |
