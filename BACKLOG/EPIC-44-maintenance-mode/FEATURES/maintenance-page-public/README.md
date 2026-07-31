# FEATURE-1 — Page de maintenance publique — `BLOQUÉE PAR EPIC-29`

## Contexte

L'ENABLER-1 ferme l'API. Cette feature s'occupe de ce que voit un visiteur : une page de maintenance présentable, aux couleurs de la structure, plutôt qu'un JSON `503` brut ou une application Angular vide qui tourne dans le vide.

## Pourquoi elle attend EPIC-29

Aujourd'hui le frontend est une SPA Angular servie en statique par nginx. Une page de maintenance rendue par Angular présente trois défauts, tous rédhibitoires :

1. nginx répond `200 OK` quel que soit l'état applicatif, donc Google indexe la page « en travaux » à la place du contenu réel
2. le header `Retry-After` ne peut pas être émis depuis le client
3. la bascule est cosmétique : le bundle reste téléchargeable, seul le refus backend protège réellement

[EPIC-29](../../../EPIC-29-social-preview-ssr/README.md) introduit un process Node en frontal (`nginx → 127.0.0.1:4000`) qui lève les trois points d'un coup. Coder cette page avant produirait du code à réécrire immédiatement après.

## Point d'attention majeur : le piège du HTML vide

L'architecture cible d'EPIC-29 fait que le serveur SSR appelle `http://backend:3000` pour rendre chaque page.

Quand le mode maintenance est actif, ces appels retournent `503`. Le serveur SSR doit alors **rendre délibérément la page de maintenance**, et non produire un HTML structurellement valide mais vide de contenu, ni planter.

C'est exactement le défaut que l'enabler [social-preview-validation](../../../EPIC-29-social-preview-ssr/ENABLERS/social-preview-validation/README.md) d'EPIC-29 documente sous le nom « piège du HTML vide » : une page qui a l'air de fonctionner et ne contient rien. Les tests doivent vérifier la présence de **contenu**, pas seulement le code HTTP.

## Autres points d'attention

- **Périmètre de rendu.** EPIC-29 laisse `/admin/**`, `/auth/**` et `/profile` en rendu client. La page de maintenance ne concerne donc que les routes publiques, et le parcours de connexion admin reste un flux SPA classique. Rien à réconcilier entre les deux modes de rendu.
- **Le SSR ne doit pas porter le bypass.** La décision d'ouvrir ou de fermer reste au backend. Le serveur SSR se contente de propager le statut reçu, il ne réévalue pas les permissions.
- **Code HTTP.** La page doit être servie en `503`, pas en `200`. C'est le gain principal de l'attente d'EPIC-29, ne pas le perdre à l'implémentation.
- **Contenu de la page** : à cadrer avec le PO. Logo, message court, éventuellement un lien Discord. Pas de compte à rebours sans engagement de délai tenable.

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-maintenance-page-ssr](us-maintenance-page-ssr.md) | A faire | A faire | A faire | A faire |

## Dépendances

Bloquée par [EPIC-29](../../../EPIC-29-social-preview-ssr/README.md), en particulier la feature `ssr-infra-integration`.
Bloquée par l'[ENABLER-1](../../ENABLERS/maintenance-flag-backend/README.md) du présent EPIC.
