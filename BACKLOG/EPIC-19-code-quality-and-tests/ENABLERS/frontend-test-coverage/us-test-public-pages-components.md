# US — Tester les composants des pages publiques (>= 80 %)

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** que les pages publiques aient une couverture lignes >= 80 %,
> **afin que** l'expérience utilisateur (visiteurs) soit protégée contre les régressions.

## Périmètre

| Page | Composant principal | Effort |
|------|---------------------|--------|
| Home | `home.component.ts` (hero + carousel) | M |
| Contact | `contact.component.ts` (formulaire) | S |
| Login | `auth/login.component.ts` | S |
| Sponsors | `pages/sponsors.component.ts` | S |
| Équipes (liste + détail) | `equipes.component.ts`, `team-detail.component.ts` | M |
| Recrutement (liste + détail + formulaire) | `recrutement.component.ts`, `job-detail.component.ts`, `application-form.component.ts` | M |
| Profile | `profile.component.ts` | S |
| Shop | `shop.component.ts` | S |
| 404 | `not-found.component.ts` | XS |
| Layout public | `main-layout.component`, `header.component`, `footer.component` | M |
| Composants partagés | `slider`, `shop-item`, `icon-svg`, `icon-link`, `image-upload`, `editor-blocks-renderer` | M |

## Critères d'acceptation

- [ ] Pour chaque composant : fichier `*.spec.ts`
- [ ] Tests des interactions clés :
  - Rendu correct (sélecteurs présents)
  - Soumission formulaires (succès + erreur)
  - Navigation (clic sur lien → bonne route)
  - Skeleton loading affiché pendant le chargement
- [ ] Couverture lignes >= **80 %** par composant
- [ ] **Accessibilité** : test au moins du label des boutons et des `alt` images
- [ ] Tests rapides : ne pas dépasser 90 sec en mode CI

## Effort estimé

L (~3-4 j)

## Dépendances

- US `us-karma-coverage-config-and-helpers.md`
