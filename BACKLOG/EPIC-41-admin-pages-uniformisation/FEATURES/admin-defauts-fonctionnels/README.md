# Feature — Defauts fonctionnels des pages admin

## Objectif

Corriger les 7 defauts releves par l'audit du 2026-07-29. Ils existent independamment de toute
decision d'uniformisation et sont a traiter en premier : cout faible, risque faible, valeur
immediate.

## Pourquoi en premier

Trois de ces defauts peuvent conduire un administrateur a prendre une mauvaise decision sur la base
de ce que l'ecran affiche :

- une panne d'API se presente comme une base vide (defaut 1) ;
- les articles au-dela du centieme sont inaccessibles sans aucun signal (defaut 2) ;
- une suppression irreversible n'est confirmee par rien (defaut 6).

Les primitives de la feature suivante s'appuieront sur ces correctifs, pas l'inverse.

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Rendre les erreurs de chargement visibles](us-erreurs-visibles.md) | En cours (3/11) | A faire | A faire | A faire |
| [Paginer la liste des articles](us-pagination-articles.md) | Fait (2026-07-29) | A faire | A faire | A faire |
| [Retour utilisateur sur les actions destructives](us-retour-actions.md) | Fait (2026-07-29) | A faire | A faire | A faire |
| [Corriger la specificite des en-tetes de page](us-specificite-page-header.md) | Fait (2026-07-29) | A faire | A faire | A faire |
