# US — Charger automatiquement la periode par defaut a l'ouverture du dashboard

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** voir les donnees analytiques s'afficher des l'ouverture de `/admin/analytics`,
> **afin de** ne pas avoir a changer manuellement la duree pour declencher un chargement.

## Criteres d'acceptation

- [x] Au premier rendu du composant, une requete est emise avec la periode "7 derniers jours" (du J-7 a aujourd'hui, fuseau Europe/Paris).
- [x] Le `app-date-range-picker` est initialise avec cette periode visible par l'utilisateur (cohesion entre l'etat affiche et les donnees chargees).
- [x] Le `loading()` signal est `true` pendant la requete initiale, declenche le skeleton, puis bascule sur les donnees.
- [x] Si la requete echoue, on affiche l'etat d'erreur deja existant (`hasGenericError()`) avec bouton "Reessayer".
- [x] Test unitaire : verifier qu'a l'init, le service backend est appele avec la bonne plage `[J-7, J]`.
- [x] Test E2E : ouvrir `/admin/analytics` → KPIs et graphique presents apres chargement, sans interaction.

## Statut Claude

**Fait** — Implémenté dans `analytics-dashboard.component.ts` via `ngOnInit()` qui appelle `computeDefault7DaysRange()` et déclenche `loadTrigger$`. 6 tests unitaires ajoutés.

## Effort estime

XS (≈ 2 h)
