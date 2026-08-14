# US — Redesign page palmarès « Salle des Trophées »

**Statut Claude** : Fait (2026-06-04, validé visuellement PO)

**En tant que** fan de la Team Divergentes,
**je veux** une page palmarès spectaculaire qui met le dernier grand titre en monument,
**afin de** ressentir la fierté du club dès les 3 premières secondes.

> Direction « A — Salle des Trophées » validée PO le 2026-06-04 (session redesign impeccable, mockups visual companion). Remplace le layout A2 v1 (rail scroll-snap) jugé trop plat.

## Critères d'acceptation

- [x] **Hero monument** : le trophée `featured` le plus récent occupe le premier écran — année en watermark géant (Bebas, vert très faible opacité), logo du jeu en filigrane, label « DERNIER TITRE — MOIS ANNÉE », compétition en Bebas monumental (clamp), ligne méta (médaille, logo jeu + équipe, description)
- [x] **Mosaïque** : les autres trophées `featured` en grille responsive (auto-fit minmax, pas de scroll-snap ni hint), cartes avec logo du jeu
- [x] **Historique** : jalons d'année massifs (Bebas, vert), lignes avec logo du jeu + compétition + équipe ; médailles emoji pour 1-3, « Top n » texte au-delà
- [x] **Emojis limités aux médailles 🥇🥈🥉** : aucun emoji décoratif (le 🏆 placeholder et le hint « glisse » disparaissent)
- [x] **Logo du jeu** : API trophies expose `teamGame` (clé du jeu de l'équipe liée) ; le front résout l'image via le catalogue GamesService (fallback logo DVG) — pattern `equipes.ts`
- [x] WCAG AA conservé (contrastes, clavier, ARIA), `prefers-reduced-motion` si animations, responsive mobile
- [x] TU adaptés/complétés verts (backend + frontend), lint + build verts
