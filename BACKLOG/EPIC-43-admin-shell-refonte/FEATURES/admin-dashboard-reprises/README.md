# Feature — Dashboard "reprises en cours"

## Objectif

Remplacer la grille des 14 liens rapides du dashboard — qui duplique la sidebar — par deux blocs
derives de l'etat reel de la base : "Reprendre" et "A faire".

Le dashboard repond a **ou j'en etais** au lieu de **ou puis-je aller**. La sidebar et la palette
Cmd+K repondent deja a la seconde question.

## Composants impactes

- `backend/src/admin/dashboard/` (nouveau module) — endpoints `resume` et `todo`
- `frontend/src/app/admin/dashboard/components/dashboard-stats/` — remplace par les nouveaux blocs
- `frontend/src/app/shared/services/dashboard.service.ts` (nouveau)

`DashboardTrafficComponent` (metriques GA) et `DashboardRecentComponent` (etat du site) sont
**conserves inchanges**.

## Regle de non-chevauchement

Le seuil de 30 jours est le meme dans les deux blocs : un brouillon est soit dans "Reprendre"
(modifie il y a moins de 30j), soit dans "A faire" (dormant), **jamais dans les deux**.

## Ecarte du perimetre

L'alerte "Palmares non renseigne" envisagee initialement n'est **pas derivable** : la table
`trophies` ne contient que les trophees deja saisis, et il n'existe aucun referentiel des
competitions auxquelles DVG participe ni de dates de fin de saison. Rien ne permet de deduire qu'un
palmares *manque*. La rendre possible exigerait un modele `Competition`/`Season` — chantier backend
hors perimetre.

## Suivi par US

| US | Lot | Claude | PO | E2E | Livre |
|----|-----|--------|----|----|-------|
| [Endpoints dashboard](us-endpoints-dashboard.md) | 6 | A faire | A faire | A faire | A faire |
| [Blocs Reprendre et A faire](us-blocs-reprendre-a-faire.md) | 7 | A faire | A faire | A faire | A faire |
