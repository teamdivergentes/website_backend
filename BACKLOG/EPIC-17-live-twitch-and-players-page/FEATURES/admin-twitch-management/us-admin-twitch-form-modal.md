# US — Modal create/edit chaine Twitch

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** ajouter ou modifier une chaine Twitch via une modal claire avec preview de l'URL et selection du joueur lie,
> **afin de** maintenir le catalogue des streamers Divergentes.

## Criteres d'acceptation (maquette validee 2026-04-25)

### Champs du formulaire

- [ ] **Pseudo Twitch** (obligatoire) : input texte, regex `^[a-zA-Z0-9_]{4,25}$` (regle Twitch).
  - Sous-label live : "URL generee : twitch.tv/{pseudo}".
- [ ] **Display name** (optionnel) : input texte, placeholder "laisser vide = pseudo".
- [ ] **Jeu principal** (optionnel) : input texte (ex: "League of Legends").
- [ ] **Description courte** (optionnel) : textarea (max 280 chars).
- [ ] **Joueur lie** (optionnel) : select avec options
  - "— aucun —" (default)
  - Liste de tous les `TeamMember` actifs avec format `{equipe} · {role} — {pseudo}`
  - Recherche tappable dans le select si > 20 items
- [ ] **Ordre d'affichage** (numerique) : input number, default 0.
- [ ] **Chaine active** : checkbox, default true. Label "Chaine active (visible sur la page En Live)".

### Validation

- [ ] Pseudo : requis, regex Twitch, unique (verifie cote backend → 400 si conflict, message clair "Ce pseudo est deja enregistre").
- [ ] Tous les autres champs valides cote DTO backend.

### Comportement

- [ ] Modal Material Dialog identique au pattern existant (TeamMember).
- [ ] En **edit** : pre-remplir les champs avec la chaine existante.
- [ ] En **create** : reinitialiser apres soumission reussie.
- [ ] Toast de succes apres save / delete / reorder.
- [ ] Toast d'erreur en cas d'echec API.

### Tests

- [ ] Test unitaire : validation, soumission OK, soumission KO.
- [ ] Test E2E : creer une chaine, modifier, verifier qu'elle apparait sur la page `/twitch` (statut OFFLINE jusqu'a vrai live).

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-admin-twitch-page-list.md`
