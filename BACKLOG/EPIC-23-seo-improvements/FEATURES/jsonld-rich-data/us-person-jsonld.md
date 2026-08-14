# US — JSON-LD Person sur les fiches joueurs

## Role / Action / Benefice

> **En tant que** fan cherchant un joueur DVG sur Google,
> **je veux** voir une fiche enrichie avec photo, role et equipe,
> **afin que** je puisse identifier le joueur d'un coup d'oeil dans les resultats.

## Contexte

`frontend/src/app/pages/equipes/player-detail/player-detail.ts` (l. 85-90) emet uniquement les meta classiques. Aucun schema `Person` n'est genere — alors meme que la page contient toutes les donnees pour le faire (nom, role, equipe, photo, reseaux sociaux si presents).

## Criteres d'acceptation

- [x] Ajouter `getPersonJsonLd(player: Player, team: Team): object` dans `seo.service.ts` retournant :
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "{player.name}",
    "jobTitle": "{player.role}",
    "image": "{player.image en URL absolue}",
    "memberOf": {
      "@type": "SportsTeam",
      "name": "{team.name}",
      "sport": "{team.game}"
    }
  }
  ```
  Note : `sameAs` non inclus (champ socials non expose directement dans le helper ; le composant peut l'etendre si besoin futur)
- [x] Appel a `seoService.setJsonLd([breadcrumbList, person])` dans `player-detail.ts` apres chargement du joueur
- [x] Si le joueur n'a pas d'image, l'attribut `image` est omis (pas de chaine vide)
- [x] Test unitaire Jasmine `player-detail.spec.ts` validant le JSON-LD emis (18 tests GREEN)
- [ ] Validation https://validator.schema.org/ : aucune erreur sur le schema Person
- [x] Pas de regression sur la fiche joueur (976/976 tests verts)

## Effort estime

S (≈ 0.5 j)

## Dependances

- US `us-breadcrumb-equipes` (combine dans le meme `setJsonLd([])`)
- Verifier dans le modele `Player` (`shared/models/team.ts` ou equivalent) si les reseaux sociaux sont exposes ; si non, l'attribut `sameAs` est simplement omis.
