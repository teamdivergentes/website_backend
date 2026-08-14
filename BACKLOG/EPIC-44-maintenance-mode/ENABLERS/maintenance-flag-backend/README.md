# ENABLER-1 — Flag de maintenance et refus backend

## Contexte technique

Tout l'existant nécessaire est déjà en place, cet enabler assemble des briques plutôt qu'il n'en crée.

| Brique | Emplacement | Usage ici |
|---|---|---|
| `model Config { key, value }` | `backend/prisma/schema.prisma:37` | Stockage du flag, togglable à chaud |
| `ConfigController` + `public-config-keys.ts` | `backend/src/config/` | Exposition du flag au frontend via l'allowlist publique |
| `Role.permissions String[]` | `backend/prisma/schema.prisma:14` | Porte la permission `maintenance.bypass` |
| `PermissionsGuard` | `backend/src/auth/guards/permissions.guard.ts` | Modèle à suivre pour le nouveau guard |
| `@Public()` | `backend/src/auth/decorators/public.decorator.ts` | Marque déjà les routes anonymes |
| `APP_GUARD` | `backend/src/app.module.ts:78` | Point d'accroche du guard global |

Le `JwtAuthGuard` est déjà enregistré en `APP_GUARD`, suivi du `ThrottlerGuard`. Le guard de maintenance s'ajoute dans cette liste.

## Points d'attention

- **Ordre des guards.** Le guard de maintenance doit s'exécuter **après** `JwtAuthGuard`, sinon `request.user` n'est pas encore résolu et le bypass ne peut pas être évalué. L'ordre de déclaration dans le tableau `providers` de `app.module.ts` détermine l'ordre d'exécution.
- **`@Public()` ne suffit pas comme critère d'exclusion.** La quasi-totalité des routes publiques du site est décorée `@Public()`, y compris celles qu'il faut justement fermer (`GET /api/shop/products`, articles, équipes). Il faut un décorateur distinct, par exemple `@MaintenanceExempt()`, appliqué nommément aux routes de survie.
- **Liste des routes à exempter** : `POST /api/auth/login`, `GET /api/config`, `POST /api/shop/webhook`, la route de healthcheck utilisée par la CI (`deploy-preprod` et `deploy-prod` interprètent un code non-2xx comme un échec de déploiement).
- **`POST /api/shop/checkout`** (`shop.controller.ts:43`) est un cas à trancher avec le PO : le fermer coupe les nouvelles commandes, le laisser ouvert permet de payer un site affiché comme fermé. Recommandation : le fermer, et n'exempter que le webhook, qui traite les paiements déjà engagés avant la bascule.
- **Lecture du flag.** Un accès base à chaque requête est inutilement coûteux. Prévoir un cache court en mémoire (30 à 60 s) et accepter le délai de propagation correspondant, ou une invalidation explicite à l'écriture du flag depuis l'admin.
- **Comportement en cas d'échec de lecture** : `catch` explicite qui laisse passer la requête. Ne jamais laisser une exception Prisma décider de l'ouverture du site.
- **Nommage de la clé** : `MAINTENANCE_MODE`, valeur `'true'` / `'false'`. Le champ `value` de `Config` est un `String`, pas un booléen. Prévoir un parsing strict côté service plutôt qu'un `Boolean(value)` qui rendrait `'false'` vrai.
- **Permission `maintenance.bypass`** : à ajouter au rôle `admin` par migration ou seed. Attention, `Role.isSystem` existe, vérifier que les rôles système sont bien couverts.

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-maintenance-config-flag](us-maintenance-config-flag.md) | A faire | A faire | A faire | A faire |
| [us-maintenance-guard-503](us-maintenance-guard-503.md) | A faire | A faire | A faire | A faire |

## Dépendances

Aucune. Cet enabler est livrable seul, avant EPIC-29, sans effet visible tant que le flag reste à `false`.
