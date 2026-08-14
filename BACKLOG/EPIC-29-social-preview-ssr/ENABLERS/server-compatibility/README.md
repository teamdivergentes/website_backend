# Enabler — Compatibilité serveur du code public (P0 bloquant)

## Contexte

C'est le **préalable bloquant** de l'EPIC-29, et son lot le plus risqué. La configuration SSR elle-même est mécanique ; cet enabler touche du code qui fonctionne aujourd'hui en production.

Deux problèmes distincts, tous deux certains, aucun des deux découvert au moment de l'implémentation : ils ont été identifiés par audit le 2026-07-29.

## Problème 1 — Accès aux API navigateur sans garde

Recherche des accès à `window`, `document`, `localStorage`, `sessionStorage` et `navigator` dans `src/`, hors `admin/`, `auth/` et fichiers de test : **17 fichiers concernés, dont 14 sans garde `isPlatformBrowser`**.

| Fichier | Garde | Gravité |
|---|---|---|
| `src/shared/layouts/main-layout/main-layout.ts` | Non | **Bloquant total** |
| `src/shared/headers/header/header.ts` | Non | Élevée |
| `src/shared/services/cookie-consent.service.ts` | Non | Élevée |
| `src/shared/services/matomo.service.ts` | Non | Élevée |
| `src/shared/services/analytics.service.ts` | Non | Élevée |
| `src/app/app.config.ts` | Non | Élevée |
| `src/app/pages/home.ts` | Non | Moyenne |
| `src/app/pages/boutique/boutique.ts` | Non | Moyenne |
| `src/app/pages/twitch/twitch.component.ts` | Non | Moyenne |
| `src/app/pages/articles/article-detail/article-detail.component.ts` | Non | Moyenne |
| `src/app/shared/components/editor-blocks-renderer/editor-blocks-renderer.component.ts` | Non | Moyenne |
| `src/app/pages/not-found/not-found.ts` | Non | Faible |
| `src/app/pages/legal/retractation/retractation.ts` | Non | Faible |
| `src/app/shared/services/cart.service.ts` | Non, mais `globalThis.localStorage?.` | Déjà sûr |
| `src/app/pages/articles/articles-page.component.ts` | Oui | Conforme |
| `src/app/shared/services/seo.service.ts` | Oui | Conforme |
| `src/shared/services/runtime-config.service.ts` | Oui | Conforme |

Le cas bloquant, `main-layout.ts:25` :

```ts
constructor() {
    if (window.matchMedia('(max-width: 599px)').matches) return;
```

`MainLayout` enveloppe **toutes** les routes publiques et l'appel est dans le constructeur, donc exécuté au rendu serveur de n'importe quelle page. Le même fichier accède ensuite à `document.querySelectorAll`, `document.getElementById`, `window.getComputedStyle` et `window.innerWidth` pour sa logique de scroll-snap.

## Problème 2 — URL de base API relative

`src/environments/environment.prod.ts` définit `apiUrl: ''`, donc `ApiService` construit des URLs relatives (`/api/articles`). En navigateur, Nginx résout. Côté Node, une URL relative n'a pas d'origine : `HttpClient` lève une erreur et le composant rend son état vide.

Conséquence si ce point est manqué : le SSR produit un HTML valide mais **sans contenu**. C'est le problème actuel, en plus coûteux, et avec l'air de fonctionner. C'est pourquoi les tests E2E de l'enabler `social-preview-validation` doivent vérifier la présence de **contenu**, pas seulement du `<title>`.

## Direction technique

**Règle de correction pour le problème 1.** Les comportements purement visuels et interactifs (scroll-snap, `matchMedia`, mesures de layout, injection de scripts d'analytics) ne doivent **pas** s'exécuter au rendu serveur : ils n'ont pas de sens sans navigateur et n'apportent rien au HTML envoyé aux crawlers. Ils sont encadrés par `isPlatformBrowser(inject(PLATFORM_ID))`.

Un polyfill global de type `domino` est **explicitement écarté** : il masquerait les vrais problèmes et produirait un HTML rendu dans un DOM factice, difficile à diagnostiquer.

**Correction pour le problème 2.** Un intercepteur HTTP enregistré **uniquement dans `app.config.server.ts`** préfixe les URLs relatives par une origine absolue lue dans `SSR_API_BASE_URL` (valeur `http://backend:3000` en conteneur). Le comportement navigateur reste strictement inchangé.

## Branche

`feat/epic-29-ssr` (depuis `develop`) — commits séparés par US.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-platform-browser-guards.md](us-platform-browser-guards.md) | A faire | A faire | A faire | A faire |
| [us-server-api-base-url.md](us-server-api-base-url.md) | A faire | A faire | A faire | A faire |

## Validation

- Les deux US sont mergeables **seules, sans SSR actif**, et sans effet de bord observable en navigateur
- Aucune régression sur la suite de tests unitaires existante
- Recette manuelle sur les pages touchées : scroll-snap, header, bannière de consentement, Matomo, panier
- Les tests unitaires ajoutés couvrent les deux branches de chaque garde (serveur et navigateur)
