# US — Page publique /structure/palmares (layout A2)

**Statut Claude** : Fait (2026-06-04)

**En tant que** fan de la Team Divergentes,
**je veux** une page palmarès mettant en avant les plus beaux trophées de la structure,
**afin de** suivre et partager les accomplissements de mes équipes.

## Critères d'acceptation

- [x] Composant standalone `PalmaresComponent` routé sur `/structure/palmares`, données via `trophies.service.ts` (Signals)
- [x] Accroche éditoriale en haut de page (« Divergentes, une véritable découverte. » — texte ajustable facilement)
- [x] Rail horizontal des trophées `featured` : `overflow-x: auto` + `scroll-snap-type: x mandatory`, **aucune lib carrousel**, cartes avec image, médaille (🥇🥈🥉 si placement ≤ 3, sinon « Top n »), compétition, description, équipe (`team.name` ou `teamLabel`) + date
- [x] Le scroll vertical de la page n'est jamais détourné (pas de scroll hijacking)
- [x] Historique complet groupé par année, lignes compactes, tri antichronologique
- [x] Accessibilité : cartes focusables au clavier, navigation possible sans souris (WCAG, cohérent EPIC-33)
- [x] CLS maîtrisé : dimensions d'images réservées, lazy loading sous la ligne de flottaison (cohérent EPIC-32)
- [x] Entrée menu Structure réactivée (`active: true`) **uniquement si** `page_palmares_visible` est vrai (pattern `PageVisibilityService` existant)
- [x] Meta tags via `SeoService` + route ajoutée au sitemap backend
- [x] Responsive mobile : le rail se swipe naturellement
- [ ] TU composant + service ; E2E Playwright : la page affiche rail + historique avec des données seedées
