# US — Rendre les erreurs de chargement visibles

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** savoir quand une liste n'a pas pu etre chargee,
> **afin de** ne pas conclure que la base est vide alors que l'API est en panne.

## Contexte — le defaut

Dans `users`, `roles` et `twitch-channels`, quand le chargement echoue :

1. `loading` passe a `false` ;
2. la collection reste vide ;
3. un snackbar s'affiche **3 secondes** puis disparait ;
4. l'ecran affiche ensuite **en permanence** "Aucun role cree" / "Aucune chaine Twitch configuree." /
   "Aucun resultat pour cette recherche".

Un administrateur qui rate le snackbar conclut que la base est vide — **et peut recreer des entites
en double**. Aucun de ces trois modules n'expose de signal `error` persistant.

References : `users.component.ts:122-126`, `roles.component.ts:232-235`,
`twitch-channels.component.ts:563-566`.

Par ailleurs, **10 modules sur 11 n'offrent aucun moyen de reessayer** : la seule remediation est un
rechargement complet de la page, qui fait perdre filtres, pagination et tri. Seul `analytics`
expose un bouton de reessai (`analytics-dashboard.component.html:75-83`) — c'est le modele a
generaliser.

## Criteres d'acceptation

- [ ] Chaque page-liste expose un signal `error` persistant, distinct de l'etat vide.
- [ ] Quand `error` est renseigne, la page affiche un bandeau d'erreur **et non** l'etat vide. Les
      deux ne sont jamais visibles en meme temps.
- [ ] Le bandeau porte `role="alert"`.
- [ ] Le bandeau propose un bouton "Reessayer" qui relance le chargement **sans rechargement de
      page**, en preservant filtres, tri et pagination.
- [ ] Le snackbar d'erreur de chargement est supprime : il faisait doublon avec un bandeau
      persistant et disparaissait trop vite.
- [ ] Applique aux 11 modules, en prenant `analytics` comme reference.
- [ ] Tests unitaires : pour chaque module, une erreur de chargement rend le bandeau et **pas**
      l'etat vide ; le bouton Reessayer rappelle bien le loader.
- [ ] Test E2E : couper l'API sur une page-liste, verifier que le message d'erreur reste affiche et
      que Reessayer fonctionne.

## Note d'implementation

Cette US introduit le besoin du composant `<app-error-state>` de la feature "primitives". Deux
options : le creer ici et le generaliser ensuite, ou corriger d'abord les 3 modules critiques puis
generaliser. **Preferer la premiere** : ecrire trois fois le meme bandeau pour le remplacer la
semaine suivante n'a pas de sens.

## Livraison Claude (2026-07-29)

Commits `d1be247` (composant) et `ad4275f` (cablage) sur `feat/admin-shell-refonte`.

- Nouveau `<app-error-state>` dans `src/app/admin/shared/` : message, `role="alert"`, bouton
  Reessayer desactivable, option `retryable` pour les erreurs non transitoires. 6 tests.
- Les 3 modules critiques exposent un signal `error` persistant et rendent le bandeau **a la place**
  de l'etat vide : `@else if (error())` avant la branche collection vide.
- Snackbar de chargement supprime dans les 3 modules.
- `console.error` passes sous garde `environment.production`.
- Methode `retryLoad()` publique sur chacun, qui reinitialise `error` avant de recharger.

**Verifications** : 1273 tests OK (+11), lint `--max-warnings=0` propre, `ng build` OK.

### Note sur un test existant

`roles.component.spec.ts` avait un test `should handle load error` qui verifiait l'appel au
snackbar : **il encodait le comportement bogue**. Reecrit pour verifier le signal `error`.

### Reste a faire sur cette US

Les 8 autres modules (articles, games, teams, recruitment, sponsors, staff, config, analytics)
n'ont pas encore de bandeau. Ils sont moins critiques — leur etat d'erreur est deja un bandeau
inline persistant, pas un snackbar ephemere — mais ils doivent converger vers le composant partage
et gagner le bouton Reessayer. A traiter avec la feature "primitives transverses".

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | En cours (3 modules critiques faits sur 11) | A faire | A faire | A faire |
| UI/UX | Fait (2026-07-29) | A faire | A faire | A faire |
