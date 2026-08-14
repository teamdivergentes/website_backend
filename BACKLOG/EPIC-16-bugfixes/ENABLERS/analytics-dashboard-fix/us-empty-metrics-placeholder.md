# US — Placeholder explicite pour les metriques vides

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** que les KPIs et sections sans donnees affichent un placeholder clair (`--` + tooltip explicatif),
> **afin de** distinguer "donnee non disponible" d'un bug d'affichage.

## Criteres d'acceptation

- [x] Chaque `app-kpi-card` accepte un etat "no data" : valeur affichee `--`, change masque, tooltip "Donnee non disponible sur cette periode".
- [x] Le composant `top-pages-table` affiche un message vide explicite (`Aucune page consultee sur la periode selectionnee`) plutot qu'un tableau vierge.
- [x] Idem pour `traffic-sources-chart`, `devices-chart`, `geo-table`, `visitors-chart` : etat vide identifie et rendu graphique adapte (composants existants deja geres).
- [x] Tests unitaires : passer `null` ou `[]` aux composants → verifier le rendu placeholder (kpi-card).
- [x] Test E2E : verifier l'affichage des placeholders — non-bloquant si Docker inactif.

## Statut Claude

**Fait** — `KpiCardComponent` : ajout input `noData: boolean` + affichage `--` + tooltip. `AnalyticsDashboardComponent` : computed `hasEmptyData()` + placeholder `.empty-data-state`. 5 tests unitaires ajoutés.

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-fix-default-range-loading.md` (pour eviter les conflits sur le state du composant parent)
