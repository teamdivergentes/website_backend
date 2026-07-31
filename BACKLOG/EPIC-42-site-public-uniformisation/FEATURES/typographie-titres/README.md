# Feature — Titres et hierarchie typographique

## Objectif

Arreter de reecrire le meme markup et le meme SCSS de titre a chaque nouvelle page. Une echelle
typographique unique, appliquee par des classes ou des composants partages.

## Etat des lieux

Audit du code au 2026-07-29, sur `src/app/pages`.

**29 combinaisons de classes distinctes** sur les `<h1>`, `<h2>` et `<h3>` du site public.

Les plus repandues :

| Classe | Occurrences | Definie dans |
|--------|-------------|--------------|
| `.title` | 8 | **6 fichiers SCSS differents** |
| `.section-title` | 8 | **4 fichiers SCSS differents** |
| `.section-heading` | 2 | team-detail |
| `.title-section` | 2 | player-detail, coach-detail |

S'y ajoutent une quinzaine de classes a usage unique : `.channel-title`, `.staff-title`,
`.biography-title`, `.team-title`, `.success-title`, `.video-label`, `.streamer-name`,
`.privacy-optout__title`, `.other-channels__title`...

### La duplication est litterale

Trois definitions de `.title` prises au hasard :

```scss
// contact.scss:27          application-form.component.scss:27
.title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 4px;
  line-height: 1.2;
```

```scss
// twitch.component.scss:44
.title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);   // <- seule difference
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 4px;
  line-height: 1.2;
```

**Six lignes identiques sur sept**, la seule variable etant la taille. C'est le meme motif que les
onze `@keyframes skeleton-pulse` de l'EPIC-41 : une valeur qui varie sert de pretexte a recopier
tout le bloc.

### Trois consequences

1. **Toute nouvelle page recopie le bloc.** C'est le point souleve par le PO : le cout n'est pas
   dans le passe, il est a chaque page ajoutee.
2. **Aucune echelle n'existe.** Les tailles observees — `clamp(2rem, 5vw, 3.5rem)`,
   `clamp(2.5rem, 6vw, 4.5rem)` et d'autres — ne suivent aucune progression definie. Chaque page a
   choisi la sienne.
3. **Une correction de charte demande six modifications.** Changer l'interlettrage des titres oblige
   aujourd'hui a editer six fichiers, en esperant n'en oublier aucun.

### Un precedent a ne pas reproduire

`src/styles/_text.scss` existe deja et porte de la typographie globale. Il n'a manifestement pas
suffi a empecher les redefinitions locales — **comprendre pourquoi avant d'y ajouter quoi que ce
soit** est un prerequis.

L'EPIC-41 a rencontre exactement ce cas : `_admin-shared.scss` scopait ses regles sous
`.admin-layout`, hors duquel les overlays sont montes, ce qui obligeait chaque dialogue a redefinir
ses styles localement. La cause etait structurelle, pas culturelle. Verifier s'il en va de meme ici
avant de conclure a de la negligence.

## Perimetre envisage

- Une echelle typographique explicite (niveaux, tailles, `clamp` responsive), documentee dans
  `DESIGN_SYSTEM.md`.
- Des classes ou composants partages appliquant cette echelle.
- Migration des 29 combinaisons vers l'echelle.
- Regle inscrite dans `frontend/CLAUDE.md` : ou vit la typographie, et quand une classe locale est
  legitime.

## A verifier avant de commencer

- **Hierarchie semantique** : les niveaux `<h1>`/`<h2>`/`<h3>` sont-ils corrects, ou choisis pour
  leur rendu ? Un saut de niveau est une erreur d'accessibilite, et la gate Lighthouse SEO du projet
  est bloquante.
- **Un seul `<h1>` par page** — a verifier sur chaque page publique.
- Les titres visuellement masques (`.visually-hidden`, `.sr-only`) doivent rester dans l'echelle.

## Prealable

Depend de l'audit du site public. Les titres sont le point d'entree le plus visible, mais le meme
motif touche probablement les boutons, les espacements et les cartes — mieux vaut le mesurer avant
de decouper les US.

## Suivi par US

Les US seront redigees apres l'audit.
