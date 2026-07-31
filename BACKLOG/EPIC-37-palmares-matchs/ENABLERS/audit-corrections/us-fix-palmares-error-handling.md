# US — Corriger la gestion d'erreur du chargement palmarès

**Sévérité** : 🔴 Bloquant (code mort / état jamais atteignable)
**Domaine** : Frontend (`palmares.ts`)
**ID audit** : FRONT-B4

## Rôle / Action / Bénéfice

**En tant que** visiteur,
**je veux** voir un état d'erreur clair si le palmarès ne charge pas,
**afin de** comprendre qu'il s'agit d'un incident temporaire et non d'un palmarès vide.

## Contexte technique

`palmares.ts#loadData()` : chaque flux interne du `forkJoin` a déjà un `catchError(() => of([]))`, donc le bloc `error:` du `subscribe()` est **inatteignable** → `.error-state` du template n'est jamais affiché (code mort). Actuellement une panne API se traduit par un `empty-state` trompeur (« Le palmarès arrive bientôt »).

## Critères d'acceptation

- [ ] Stratégie d'erreur revue : distinguer « chargement échoué » (afficher `.error-state`) de « aucune donnée » (afficher `.empty-state`). Ex. : ne pas catcher en interne, ou remonter un flag d'échec.
- [ ] Le bloc de gestion d'erreur est réellement atteignable et testé.
- [ ] Test unitaire `palmares.spec.ts` couvrant le rendu de `.error-state` sur échec réel du chargement.
- [ ] Aucun code mort résiduel dans `loadData()`.
