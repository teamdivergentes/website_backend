# EPIC-44 — Mode maintenance du site public — `A FAIRE`

> Créé le 2026-07-31 sur demande PO (Maxime). Aucune ligne de code écrite à ce jour.

## Objectif

Pouvoir fermer le site public à chaud, sans redéploiement, tout en laissant l'équipe disposant du bypass naviguer normalement. Cas d'usage : refonte visible en cours, migration de données, incident, préparation d'un lancement boutique.

Le mode est piloté depuis l'admin, pas depuis un fichier d'infra : le PO doit pouvoir l'activer et le désactiver seul.

## Périmètre

- Un flag persistant, togglable à chaud, source de vérité unique
- Un refus applicatif propre (`503`) sur les routes publiques quand le flag est actif
- Un bypass basé sur les permissions du rôle, pas sur un nom de rôle en dur
- Une page « site en maintenance » servie aux visiteurs

## Hors périmètre

- **Protection de la preprod** : déjà traitée par [EPIC-38](../EPIC-38-preprod-protection/README.md) (Basic Auth Traefik, `EN REVIEW`). Ce sont deux besoins distincts, ne pas les fusionner.
- Coupure au niveau Traefik ou nginx : rejetée, voir « Décision d'architecture » ci-dessous
- Page de maintenance par service (boutique seule, articles seuls) : granularité non demandée
- Bandeau d'information non bloquant (« maintenance prévue à 22h ») : sujet différent, à ouvrir séparément si besoin

## Décision d'architecture

**Le flag vit dans le backend, pas dans nginx ni dans Traefik.**

Trois raisons :

1. **Toggle à chaud.** Le modèle `Config` (`prisma/schema.prisma:37`, clé/valeur unique) existe déjà et alimente `GET /api/config`. Un flag Ansible ou une variable d'environnement imposerait un redéploiement à chaque bascule.
2. **Compatibilité avec l'architecture cible d'EPIC-29.** Le SSR prévoit que nginx route « tout le reste » vers `127.0.0.1:4000`. Une règle nginx qui servirait une page maintenance en dur entrerait en conflit frontal avec cette règle. Le backend comme source de vérité survit au pivot SSR.
3. **Couverture des données.** Une bascule purement frontend serait cosmétique : l'application est aujourd'hui une SPA Angular servie en statique par nginx. Le bundle JS reste téléchargeable et l'API reste appelable directement. Seul un refus côté backend ferme réellement le site.

## Dépendance à EPIC-29

L'EPIC se découpe en deux lots dont un seul est livrable immédiatement :

| Lot | Dépendance | Livrable |
|---|---|---|
| [ENABLER-1 — Flag et refus backend](ENABLERS/maintenance-flag-backend/README.md) | Aucune | Immédiatement |
| [FEATURE-1 — Page de maintenance publique](FEATURES/maintenance-page-public/README.md) | [EPIC-29](../EPIC-29-social-preview-ssr/README.md) | Après le SSR |

Raison du séquencement : sans SSR, une page de maintenance rendue par Angular renvoie `200 OK` avec un HTML vide pour les crawlers. Google indexerait la page « site en travaux » à la place du contenu réel. Le `503` + `Retry-After` correct exige un rendu serveur. Coder la page avant EPIC-29 produirait du code à réécrire dans la foulée.

L'ENABLER-1 est donc à faire **maintenant**, la FEATURE-1 **après** EPIC-29.

## Points de vigilance transverses

Ces cinq points valent pour l'ensemble de l'EPIC et sont repris en critères d'acceptation dans les US concernées.

### 1. Ne pas s'enfermer dehors

`POST /api/auth/login` et `GET /api/config` doivent rester joignables quand le mode est actif. Sinon plus personne ne peut se connecter pour désactiver le flag, et le seul recours devient un accès direct à la base de production.

C'est le risque numéro un de cet EPIC.

### 2. Webhooks entrants

`POST /api/shop/webhook` (`src/shop/shop.controller.ts:51`, décoré `@Public()`) reçoit les événements Stripe. Un `503` sur cette route fait échouer la livraison côté Stripe et des paiements se retrouvent sans commande associée, silencieusement.

Toute route de webhook doit être explicitement exclue du refus. Même vigilance pour HelloAsso si [EPIC-34](../EPIC-34-membership-helloasso/README.md) est livré entre-temps.

### 3. SEO

Le refus doit être un `503` accompagné d'un header `Retry-After`, jamais un `200`. Un `200` sur une page « en travaux » entraîne son indexation à la place du contenu réel.

Le module `sitemap` doit également être neutralisé pendant la maintenance : un sitemap qui référence des URLs répondant `503` dégrade la confiance du crawler.

### 4. Cache

`GET /api/config` doit répondre avec `Cache-Control: no-store` sur la clé de maintenance. Sans cela, nginx ou le navigateur continue de servir l'état précédent après la bascule, dans les deux sens.

### 5. Panne de base de données

Si le flag est lu en base et que PostgreSQL est indisponible, le comportement par défaut doit être **de ne pas bloquer**. Sinon une panne de base se transforme en panne totale doublée d'un mode maintenance impossible à désactiver, puisque la désactivation elle-même passe par la base.

## Enablers et features

| Lot | Priorité | Claude | PO | E2E | Livré |
|---|---|---|---|---|---|
| [ENABLER-1 — Flag et refus backend](ENABLERS/maintenance-flag-backend/README.md) | Moyenne | A faire | A faire | A faire | A faire |
| [FEATURE-1 — Page de maintenance publique](FEATURES/maintenance-page-public/README.md) | Moyenne (bloquée EPIC-29) | A faire | A faire | A faire | A faire |

## Branche

`feat/epic-44-maintenance-mode` sur les deux repos (backend et frontend), depuis `develop`.

## Critères de validation EPIC

- [ ] Le PO active et désactive le mode depuis l'admin, sans redéploiement ni redémarrage de conteneur
- [ ] Mode actif, un visiteur anonyme obtient une page de maintenance en `503` avec `Retry-After`
- [ ] Mode actif, un compte porteur de `maintenance.bypass` navigue sur le site public normalement
- [ ] Mode actif, `POST /api/auth/login` et `GET /api/config` répondent toujours
- [ ] Mode actif, un événement Stripe envoyé sur `POST /api/shop/webhook` est traité normalement
- [ ] Base de données injoignable, le site ne bascule **pas** en maintenance
- [ ] La preprod reste couverte par la Basic Auth d'EPIC-38, indépendamment de ce flag

## Statut

`A FAIRE` — créé le 2026-07-31. ENABLER-1 démarrable immédiatement, FEATURE-1 bloquée par EPIC-29.
