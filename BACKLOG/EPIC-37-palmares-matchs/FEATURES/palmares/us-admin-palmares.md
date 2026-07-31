# US — Admin palmarès (CRUD CM)

**Statut Claude** : Fait (2026-06-04)

**En tant que** Community Manager,
**je veux** gérer les trophées depuis le panel admin,
**afin de** tenir le palmarès à jour sans intervention technique.

## Critères d'acceptation

- [x] Page admin Material (pattern table + dialog existant, cf. `twitch-channels`) : colonnes compétition, placement, équipe, date, à la une, actif
- [x] Toggle « à la une » (`featured`) actionnable directement dans la table
- [x] Dialog création/édition : compétition, placement (≥ 1), date, équipe (sélecteur optionnel) ou `teamLabel` libre, description, image (composant upload existant), actif
- [x] Visible uniquement avec la permission `trophies:read` (raccourcis admin perms-aware EPIC-28 compatibles)
- [x] Toggle `page_palmares_visible` ajouté à la page de config admin existante
- [ ] TU composants ; E2E : un CM crée un trophée à la une → il apparaît dans le rail de `/structure/palmares`
