# US — Ajouter twitter:site dans index.html

## Role / Action / Benefice

> **En tant que** Twitter / X parsant un partage de page DVG,
> **je veux** voir le handle officiel `@teamdivergentes` (ou autre) dans `twitter:site`,
> **afin que** la card Twitter affiche correctement l'attribution au compte officiel.

## Contexte

`frontend/src/index.html` contient `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` mais **pas** `twitter:site`. Cette balise est recommandee par Twitter pour ameliorer l'attribution.

## Criteres d'acceptation

- [ ] Confirmation prealable du handle officiel avec l'equipe communication / PO
- [ ] Si handle confirme : ajout de `<meta name="twitter:site" content="@teamdivergentes">` dans `index.html`
- [ ] Validation https://cards-dev.twitter.com/validator (si accessible) ou tweet test
- [ ] Si pas de compte X officiel : la US est marquee `Bloque` avec note explicative jusqu'a creation du compte

## Effort estime

XS (≈ 0.1 j) — bloque par decision PO sur l'existence du handle

## Dependances

Validation PO.
