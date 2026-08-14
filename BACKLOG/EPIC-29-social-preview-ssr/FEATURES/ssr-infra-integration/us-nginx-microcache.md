# US — Microcache Nginx sur le HTML rendu

**En tant que** DevSecOps
**Je veux** que Nginx mette brièvement en cache le HTML produit par le SSR
**Afin qu'une rafale de crawlers ne déclenche pas autant de rendus que de requêtes

## Contexte

Sans microcache, chaque passage de bot déclenche un rendu Angular complet plus les appels backend associés. Un article partagé sur Discord, LinkedIn et X en même temps produit autant de rendus que de scrapers, sur un VPS mutualisé avec neuf autres services.

## Acceptance criteria

- [ ] Une zone `proxy_cache` dédiée au HTML SSR est déclarée, distincte de `uploads_cache`
- [ ] Les réponses 200 du serveur SSR sont mises en cache 60 secondes
- [ ] Les réponses 404 et 5xx ne sont pas mises en cache au-delà d'une durée très courte
- [ ] La clé de cache inclut l'URI complète : deux articles distincts ne partagent jamais une entrée
- [ ] `proxy_cache_use_stale` sert la version périmée en cas d'erreur ou de timeout du serveur SSR
- [ ] Les pages qui dépendent de l'état utilisateur ne sont pas mises en cache — à vérifier explicitement sur `/boutique/panier` et `/boutique/merci`
- [ ] Un en-tête de diagnostic expose le statut du cache, sur le modèle du `X-Cache-Status` déjà utilisé pour `/uploads/`
- [ ] Mesure avant/après en preprod : temps de réponse sur un second appel à la même URL
- [ ] La fenêtre de 60 secondes est documentée dans la PR, avec son effet : un article modifié dans l'admin peut mettre jusqu'à une minute à apparaître à jour

## Dépendances

Bloquée par `us-nginx-ssr-proxy.md`.
