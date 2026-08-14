# US — Assainir le design system bas niveau (tokens)

**Sévérité** : 🟠 Majeur (dette design system)
**Domaine** : UI/UX (SCSS / tokens)
**ID audit** : DESIGN-D1..D6

## Rôle / Action / Bénéfice

**En tant qu'** équipe design/dev,
**je veux** un système de tokens unique et sémantique,
**afin d'** éviter la dérive des couleurs/rayons en dur et garantir la cohérence de la charte DVG.

## Constats (preuves)

- **D1** — Emoji médailles `🥇🥈🥉` (`trophy-placement.ts`) : rendu OS-dépendant, couleurs hors charte (bronze rendu en bleu sur Chrome). *Tell* low-end très visible.
- **D2** — Couleurs ad-hoc non tokenisées : 11×`#888`, 5×`#e05c5c`, 5×`#999`, 3×`#aaa`, `#1a1c1a` + statuts admin `#164763/#56b7df/#5a4600/#d7aa25`. Aucun token `text-muted`, `border-subtle`, `win/loss/draw`, `info/warning`.
- **D3** — Double système désaligné : `$vars` SCSS (public) vs custom props `--green/--gray` (admin), fallbacks incohérents (`var(--gray, #999)` alors que `$gray = #D3D3D3`).
- **D4** — Rayons incohérents : DESIGN.md dit « 10px cartes / 20px blocs » mais on trouve 8/10/11/12px.
- **D5** — Placeholder image mosaïque vide (bande ~100px quasi-vide, logo 32px @0.6) → paraît cassé (net sur mobile).
- **D6** — `prefers-reduced-motion` manquant sur le skeleton admin `matches-admin` (présent côté public).

## Critères d'acceptation

- [ ] **D1** : les médailles emoji sont remplacées par un traitement maison (pastille de rang tintée or/argent/bronze désaturée en Bebas Neue, ou SVG monochrome teinté). `placementLabel`/`placementAria` conservent leur contrat ; le test anti-régression emoji `🏆` reste vert et un test anti-régression `🥇` est ajouté.
- [ ] **D2** : échelle de tokens sémantiques ajoutée à `_variables.scss` (`$text-muted`, `$text-dim`, `$border-subtle`, `$result-win/loss/draw`, `$status-info/warning`) ; toutes les valeurs hex ad-hoc des composants EPIC-37 (palmares, match-strip, matches-admin) migrées vers ces tokens.
- [ ] **D3** : les custom props CSS admin sont générées depuis les `$vars` (source unique) ; suppression des fallbacks hex divergents.
- [ ] **D4** : tokens `$radius-sm/md/lg` définis et appliqués sur les composants EPIC-37, conformes à DESIGN.md.
- [ ] **D5** : placeholder mosaïque enrichi (gradient tinté + logo plus grand / filigrane) ou zone masquée si pas d'image.
- [ ] **D6** : guard `prefers-reduced-motion` ajouté au skeleton admin.
- [ ] `DESIGN.md` mis à jour pour refléter les nouveaux tokens (rayons, statuts, texte).
- [ ] `npm run lint` + `ng build` verts, aucune régression visuelle sur l'instance Docker.

## Compétences à mobiliser

Skills design : `redesign-existing-projects` (anti-patterns : emoji, grays ad-hoc, rayons uniformes), `high-end-visual-design` (tokens, cohérence). Charte DVG : accent unique `#32D299`, dark `#0C0D0C`, polices Bebas/Athiti/Asar.
