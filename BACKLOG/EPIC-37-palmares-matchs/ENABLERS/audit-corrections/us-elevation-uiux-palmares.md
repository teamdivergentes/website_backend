# US — Élever le rendu UI/UX du palmarès (premium)

**Sévérité** : 🟡 Amélioration
**Domaine** : UI/UX
**ID audit** : DESIGN-UX

## Rôle / Action / Bénéfice

**En tant que** fan,
**je veux** une page palmarès qui donne une sensation « salle des trophées » soignée et vivante,
**afin de** ressentir le prestige des performances de la structure.

## Contexte

La direction éditoriale (hero monument + watermark année, mosaïque, timeline jalons) est un vrai point fort à **préserver**. Les améliorations visent le *polish premium*, sans casser le zoneless ni l'accessibilité.

## Critères d'acceptation

- [ ] **Hero** : profondeur ajoutée — overlay grain/noise fixe `pointer-events:none`, léger radial-glow vert derrière le titre, watermark année plus imposant. **Mobile** : décaler le watermark pour supprimer le chevauchement avec le titre (constaté sur capture).
- [ ] **Cartes mosaïque** : hover avec ombre tintée verte (pas de noir pur) + micro-`translateY` ; reveal au scroll en cascade via `IntersectionObserver`.
- [ ] **Timeline** : rail vertical subtil reliant les jalons d'année.
- [ ] **Contraste** : labels équipe remontés à ≥ 4.5:1 (WCAG AA) via `$text-dim`.
- [ ] **Motion** : transitions en cubic-bezier « spring » courtes sur les éléments interactifs.
- [ ] **`prefers-reduced-motion`** respecté partout (animations décoratives désactivées).
- [ ] Uniquement `transform`/`opacity` animés (pas de propriété layout). Aucune régression Lighthouse (SEO ≥ 0.9, CLS < 0.1, LCP < 2.5s).

## Dépendance

À réaliser **après** [us-design-system-tokens](us-design-system-tokens.md) (mêmes fichiers SCSS) et les fixes fonctionnels front, dans le même worktree.
