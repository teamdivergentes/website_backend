# US — Bandeau d'information sur le biais "consent cookie"

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** voir un bandeau d'information explicitant que les statistiques GA ne couvrent que les visiteurs ayant consenti aux cookies,
> **afin de** ne pas mal interpreter les chiffres comme un trafic exhaustif.

## Criteres d'acceptation

- [x] En haut du dashboard, sous le `page-header`, un bandeau discret affiche le message :
  > "Ces statistiques se basent uniquement sur les visiteurs ayant accepte les cookies. La couverture reelle du trafic est superieure aux chiffres ici presentes. Voir l'EPIC-18 pour une solution CNIL-friendly (Matomo)."
- [x] Le bandeau est dismissable (croix) avec persistance `localStorage` cle `dvg_admin_analytics_consent_banner_dismissed=true` → ne reapparait pas une fois ferme.
- [x] Bouton "Reafficher l'info" via clic sur le `page-subtitle` → reset.
- [x] Tests unitaires : afficher / dismisser / persister.

## Statut Claude

**Fait** — Signal `consentBannerVisible`, méthodes `dismissConsentBanner()` / `resetConsentBanner()` dans le composant. Bandeau `.consent-banner` avec bouton close et persistance localStorage. 11 tests unitaires ajoutés. 6 tests E2E ajoutés (non-bloquants si Docker inactif).

## Effort estime

XS (≈ 2 h)
