# Enabler — Validation E2E et validateurs sociaux (P1)

> **MAJ 2026-07-29** : adapté au pivot SSR. Un critère décisif a été ajouté — vérifier la présence de **contenu**, pas seulement des meta tags. Voir « Le piège du HTML vide » ci-dessous.

## Contexte technique

Le rendu serveur ne sert à rien s'il n'est pas vérifié. Cet enabler couvre la vérification automatique (E2E) et manuelle (validateurs officiels) que les meta tags et le contenu sont bien présents dans le HTML brut tel que le lisent les bots sociaux.

Sans cette boucle, une régression silencieuse — un composant qui casse le rendu d'une route, une route publique ajoutée sans entrée dans `app.routes.server.ts` — passerait inaperçue jusqu'au prochain partage cassé.

## Le piège du HTML vide

Si l'URL de base API côté serveur est mal résolue (voir enabler `server-compatibility`), le SSR produit un HTML **structurellement correct mais vide de données**. Les meta tags statiques peuvent être présents alors que le corps de la page ne contient aucun contenu réel.

Un test qui ne vérifie que le `<title>` passerait au vert dans ce cas. **Les tests de cet enabler doivent donc assert sur du contenu métier** : le titre de l'article dans le corps, le nom du joueur, le prix du produit.

## Direction technique

1. **Tests E2E Playwright sans navigateur** : `request.get(url)` et non `page.goto`, pour récupérer le HTML brut tel qu'un bot le lit, sans exécution de JavaScript ni hydratation.
2. **Un échantillon par catégorie** : une route statique, un article, une fiche joueur, une fiche coach, un produit boutique.
3. **Assertions sur les meta tags et sur le contenu** — les deux, pour les raisons ci-dessus.
4. **Job CI dédié** après le déploiement en preprod, bloquant pour la promotion en production.
5. **Checklist manuelle** `validators-checklist.md` : outils à passer après chaque release majeure (Facebook Debugger, LinkedIn Post Inspector, Twitter Card Validator, partage Discord réel).
6. **Test de fraîcheur** : publier un article via l'admin et vérifier que sa preview est correcte **sans redéploiement ni redémarrage de conteneur**. C'est le gain propre au SSR par rapport au prerendering, et rien d'autre ne le couvre.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-e2e-ssr-meta-tags.md](us-e2e-ssr-meta-tags.md) | A faire | A faire | A faire | A faire |
| [us-social-validators-checklist.md](us-social-validators-checklist.md) | A faire | A faire | A faire | A faire |

## Validation

- Les tests E2E passent sur preprod et bloquent la promotion en production si une route perd ses meta tags **ou son contenu**
- Le document `validators-checklist.md` est utilisé au moins une fois sur preprod avant promotion
- Une régression simulée est détectée : retirer volontairement une route de `app.routes.server.ts` doit faire échouer le test correspondant
- Une seconde régression simulée est détectée : neutraliser l'intercepteur d'URL de base serveur doit faire échouer les assertions de contenu
- Le test de fraîcheur passe : un article publié dans l'admin est correctement prévisualisé sans redéploiement
