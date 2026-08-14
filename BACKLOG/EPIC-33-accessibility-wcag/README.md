# EPIC-33 — Accessibilité WCAG 2.1 AA (post-audit prod 2026-05-27)

## Objectif

Mettre le site public en conformité WCAG 2.1 niveau AA. L'audit a relevé plusieurs violations de niveau A (bloquantes) et AA sur la navigation clavier, les contrastes, les labels et la structure sémantique.

## Priorité

**Moyenne** — plusieurs critères de niveau A (skip-link, clavier, labels) sont des manquements de conformité ; enjeu légal (accessibilité numérique) et UX réel pour les utilisateurs d'aides techniques.

## Contexte

Audit mené par l'agent UX/UI sur les composants et SCSS (thème sombre exclusif #0C0D0C, accent #32D299) + rendu live + screenshots. Rapport complet : `audit/RAPPORT-AUDIT-PROD-2026-05-27.md`.

## Enablers / US

| Enabler / US | Critère WCAG | Niveau | Fichier principal | Claude | PO | E2E | Livré |
|--------------|--------------|--------|-------------------|--------|----|----|-------|
| US-1 : skip-link « Aller au contenu » + `<main id>` | 2.4.1 Bypass Blocks | A | layout public, `_a11y.scss` | A faire | A faire | A faire | A faire |
| US-2 : `:focus-visible` global (outline accent) | 2.4.7 Focus Visible | AA | `_a11y.scss` | A faire | A faire | A faire | A faire |
| US-3 : contrastes texte secondaire (footer/contact ≥ 4.5:1) | 1.4.3 Contrast | AA | `footer.scss`, `contact.scss` | A faire | A faire | N/A | A faire |
| US-4 : navigation clavier dropdown Structure (Escape, focus, Tab) | 2.1.1 / 2.1.2 Keyboard | A | `header.html`, `header.ts` | A faire | A faire | A faire | A faire |
| US-5 : labels accessibles (bouton « Détails » boutique, liens `target=_blank`) | 4.1.2 Name/Role/Value | A | `boutique.html` | A faire | A faire | A faire | A faire |
| US-6 : `aria-pressed` sur les chips de sujet du formulaire contact | 4.1.2 Name/Role/Value | A | `contact.html` | A faire | A faire | A faire | A faire |
| US-7 : alt descriptifs (4 images présentation home, logo jeu équipes) | 1.1.1 Non-text Content | A | `home.html`, `equipes.html` | A faire | A faire | N/A | A faire |
| US-8 : hiérarchie titres boutique (H2 collection, H3 produits) | 1.3.1 Info & Relationships | A | `boutique.html` | A faire | A faire | N/A | A faire |
| US-9 : `@media (prefers-reduced-motion)` (animations infinies) | 2.3.3 Animation | AAA | `_a11y.scss` + scss concernés | A faire | A faire | N/A | A faire |
| US-10 : retirer `role=menu`/`menuitem` de la nav (sémantique native) | 4.1.2 | A | `header.html` | A faire | A faire | N/A | A faire |
| US-11 : affordance bouton « Gérer les cookies » (souligné + focus) | 1.4.1 / 2.4.7 | A/AA | `footer.scss` | A faire | A faire | N/A | A faire |

## Priorisation (top quick-wins)

1. US-1 skip-link, US-2 focus-visible global, US-6 aria-pressed chips, US-9 reduced-motion, US-3 contrastes — faible effort, gros gain conformité.
2. US-4 dropdown clavier, US-5 labels, US-8 hiérarchie titres.
3. US-7, US-10, US-11.

## Validation
Vérifier avec un lecteur d'écran (NVDA/VoiceOver) + navigation 100 % clavier. Cible : 0 violation axe-core niveau A/AA sur les pages publiques. Envisager l'intégration d'axe-core dans les tests E2E Playwright.

## Hors scope
- Audit RGAA formel / déclaration d'accessibilité — backlog ultérieur si obligation légale.
