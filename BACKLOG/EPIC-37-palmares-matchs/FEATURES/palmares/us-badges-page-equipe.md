# US — Badges palmarès sur la page équipe

**Statut Claude** : Fait (2026-06-04)

**En tant que** fan d'une équipe DVG,
**je veux** voir les trophées de l'équipe directement sur sa page,
**afin de** mesurer son niveau d'un coup d'œil (style Gentle Mates, discret).

## Critères d'acceptation

- [x] Ligne de badges compacts sous l'en-tête de la page équipe : médaille + compétition + année (ex : « 🥇 Coupe de France 2025 »)
- [x] Données : `GET /api/trophies?teamId=X` ; si aucun trophée, la section n'apparaît pas du tout
- [x] Clic sur un badge → navigation vers `/structure/palmares`
- [x] Discret : pas de section titrée imposante, intégré au design existant de la page équipe
- [ ] TU composant ; E2E : badge visible sur une équipe seedée avec trophée
