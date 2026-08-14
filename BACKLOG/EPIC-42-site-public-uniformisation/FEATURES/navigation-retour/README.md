# Feature — Navigation de retour

## Objectif

Une seule mecanique de retour sur les pages de detail du site public, ou une regle explicite si deux
mecaniques doivent coexister.

## Etat des lieux

Six pages de detail, quatre paradigmes :

```
/structure/equipes/dvg-nova
  [<]                                    bouton chevron seul

/structure/equipes/dvg-nova/joueur/xxx
  [<] Voir d'autres joueurs              bouton chevron + libelle

/structure/equipes/dvg-nova/coach/xxx
  [<] Voir d'autres coachs               bouton chevron + libelle

/articles/bienvenue-a-dvg-nova
  Accueil › Articles › Bienvenue a...    fil d'Ariane, separateur ›

/structure/recrutement/12/dev-front
  Retour aux offres                      lien texte (declare deux fois)

/boutique/maillot-2026            (a venir, branche boutique)
  boutique / Maillot 2026 Team...        fil d'Ariane, separateur /
```

## Dette technique associee

| Constat | Emplacement |
|---------|-------------|
| SVG du chevron recopie a l'identique, couleur `#32D299` en dur | `team-detail.html:52`, `player-detail.html:74`, `coach-detail.html:75` |
| Navigation imperative `router.navigate()` au lieu de `routerLink` | `team-detail.ts:103`, `player-detail.ts:136`, `coach-detail.ts` |
| Lien de retour declare deux fois dans le meme fichier | `job-detail.component.html:156` et `:169` |
| `aria-current="page"` present sur une seule des six pages | `article-detail.component.html:75` |
| Deux separateurs (`›` et `/`), deux conventions de capitalisation | article-detail vs produit |

La navigation imperative a une consequence concrete : un bouton ne s'ouvre pas dans un nouvel
onglet, n'affiche pas l'URL cible au survol, et n'est pas suivi par les crawlers.

## Prealable

**Arbitrage PO requis** avant d'ecrire les US : fil d'Ariane partout, bouton partout, ou regle
distinguant les deux. Voir la question ouverte dans le README de l'EPIC.

Cet arbitrage merite un brainstorming, pas une decision en passant : il touche l'ergonomie de six
pages et a une incidence SEO reelle (balisage `BreadcrumbList`, gate Lighthouse bloquante).

## Suivi par US

Les US seront redigees une fois l'arbitrage rendu.
