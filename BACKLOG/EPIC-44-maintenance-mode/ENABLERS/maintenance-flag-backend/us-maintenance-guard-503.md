# US — Guard global de maintenance renvoyant 503

## User Story

**En tant que** visiteur anonyme,
**je veux** obtenir une réponse claire indiquant que le site est temporairement fermé,
**afin que** je comprenne qu'il s'agit d'une interruption passagère et non d'une panne ou d'une disparition du site.

Et **en tant que** membre de l'équipe disposant du bypass, **je veux** continuer à naviguer normalement, **afin de** vérifier le travail en cours pendant que le site est fermé au public.

## Critères d'acceptation

### Refus

- [ ] **AC1** — Mode actif, `GET /api/shop/products` sans authentification retourne `503 Service Unavailable`
- [ ] **AC2** — La réponse `503` porte un header `Retry-After`
- [ ] **AC3** — Le corps de la réponse ne divulgue aucune donnée métier ni détail technique
- [ ] **AC4** — Mode inactif, toutes les routes se comportent exactement comme aujourd'hui, sans surcoût de latence mesurable

### Bypass

- [ ] **AC5** — Mode actif, un compte porteur de `maintenance.bypass` accède normalement à toutes les routes
- [ ] **AC6** — Mode actif, un compte authentifié **sans** cette permission reçoit `503` comme un anonyme
- [ ] **AC7** — Le bypass repose sur la permission, jamais sur un test du nom de rôle

### Routes de survie

- [ ] **AC8** — Mode actif, `POST /api/auth/login` répond normalement et permet d'obtenir un JWT
- [ ] **AC9** — Mode actif, `GET /api/config` répond normalement
- [ ] **AC10** — Mode actif, `POST /api/shop/webhook` traite un événement Stripe normalement, signature vérifiée, commande mise à jour
- [ ] **AC11** — Mode actif, la route de healthcheck utilisée par la CI répond `2xx` et les jobs `deploy-preprod` / `deploy-prod` restent verts
- [ ] **AC12** — Mode actif, le `sitemap` est neutralisé (pas de liste d'URLs répondant `503`)

### Robustesse

- [ ] **AC13** — Base de données injoignable, le guard laisse passer la requête et journalise l'erreur
- [ ] **AC14** — Le guard s'exécute après `JwtAuthGuard`, `request.user` est disponible au moment de l'évaluation du bypass

## Notes d'implémentation

Nouveau guard enregistré en `APP_GUARD` dans `backend/src/app.module.ts:78`, après `JwtAuthGuard`. Nouveau décorateur `@MaintenanceExempt()` pour les routes de l'AC8 à l'AC11.

Ne pas réutiliser `@Public()` comme critère d'exclusion : ce décorateur marque déjà la majorité des routes publiques du site, dont celles qu'il faut précisément fermer. Voir le README de l'enabler.

L'AC10 est le point le plus coûteux en cas d'oubli : un webhook Stripe refusé produit des paiements encaissés sans commande correspondante, sans erreur visible côté site.

Arbitrage à confirmer avec le PO sur `POST /api/shop/checkout` : recommandation de le **fermer**, seul le webhook restant ouvert pour finaliser les paiements engagés avant la bascule.

## Dépendances

Bloquée par [us-maintenance-config-flag](us-maintenance-config-flag.md).

## Statut

| Claude | PO | E2E | Livré |
|--------|----|----|-------|
| A faire | A faire | A faire | A faire |
