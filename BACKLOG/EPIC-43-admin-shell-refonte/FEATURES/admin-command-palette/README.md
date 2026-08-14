# Feature — Palette de commandes admin

## Objectif

Offrir un acces clavier instantane a toutes les destinations et actions de creation du panel admin,
via un overlay declenche par `Cmd/Ctrl+K`.

## Pourquoi

C'est la seule reponse **structurelle** a "la liste va continuer de grossir" : le cout de recherche
est constant quel que soit le nombre d'entrees, la ou une sidebar se degrade lineairement.

C'est aussi le remede au mode replie : plus besoin de deviner un pictogramme, on tape trois lettres.

La palette se pose **par-dessus** la navigation, jamais a sa place : on ne cherche que ce qu'on sait
deja exister. Un utilisateur occasionnel a besoin de voir la liste.

## Composants impactes

- `frontend/src/app/admin/components/admin-command-palette.component.ts` (nouveau)
- `frontend/src/app/admin/components/admin-header.component.ts` — champ de recherche et hint `⌘K`
- `frontend/src/app/admin/layout/admin-layout.component.ts` — montage de l'overlay

## Socle technique

Le CDK Material deja installe fournit `Overlay`, `cdkTrapFocus` et `ListKeyManager` (roving tabindex
clavier). Aucune dependance nouvelle.

## Suivi par US

| US | Lot | Claude | PO | E2E | Livre |
|----|-----|--------|----|----|-------|
| [Palette de commandes Cmd+K](us-command-palette.md) | 5 | A faire | A faire | A faire | A faire |
