# US — Fil d'Ariane derive du registre (lot 4)

## Role / Action / Benefice

> **En tant qu'**utilisateur admin,
> **je veux** un fil d'Ariane correct et coherent avec la sidebar sur toutes les pages,
> **afin de** savoir ou je suis, y compris sur les pages ou il est aujourd'hui casse.

## Contexte — bug avere

`admin-header.component.ts` maintient un mapping `routeTitles` code en dur et desynchronise du
registre : il manque `/admin/twitch-channels`, `/admin/trophies` et `/admin/matches`. Sur ces trois
pages, le fil d'Ariane affiche "Admin" au lieu du nom de la page.

C'est une source de verite dupliquee : `ADMIN_SHORTCUTS` contient deja `label` et `route`.

## Criteres d'acceptation

- [ ] `routeTitles` est supprime. Le titre est derive de `ADMIN_SHORTCUTS` par correspondance de
      route.
- [ ] Le groupe est ajoute comme niveau intermediaire : `Admin / Contenu / Articles`.
- [ ] Les entrees de la zone epinglee n'ont pas de niveau intermediaire : `Admin / Dashboard`.
- [ ] Les routes enfants sans entree dans le registre (ex. `/admin/articles/:id/edit`) retombent sur
      le libelle de leur route parente.
- [ ] Tests unitaires : fil d'Ariane correct pour les 14 routes admin, **y compris**
      twitch-channels, trophies et matches (test de regression du bug).
- [ ] Test E2E : `/admin/matches` affiche "Admin / Competition / Matchs" et non "Admin".

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

`routeTitles` est supprime. Le fil est construit par `buildAdminBreadcrumb()` a partir de
`ADMIN_SHORTCUTS` : groupe intercale, zone epinglee sans niveau intermediaire, page parente
cliquable depuis une sous-page. `/admin` est exclu de la correspondance par prefixe, sans quoi
toute route inconnue se serait nommee "Dashboard".

Balisage revu : `nav > ol > li` etiquete, `aria-current="page"` sur le dernier niveau.

21 tests, dont un verrou : **toute** entree du registre doit etre nommee par le fil d'Ariane.

**Reste** : le test E2E sur `/admin/matches` (Docker requis).
