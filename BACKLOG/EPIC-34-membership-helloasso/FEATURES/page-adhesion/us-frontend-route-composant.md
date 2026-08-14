# US — Route, composant et navigation de la page d'adhésion

## Role / Action / Benefice

> **En tant que** visiteur du site,
> **je veux** accéder facilement à une page « Adhérer » depuis la navigation,
> **afin de** comprendre comment rejoindre l'association et passer à l'action.

## Criteres d'acceptation

- [ ] Route publique `/adherer` (slug **figé** — reco SEO 2026-05-27) → composant vitrine.
- [ ] Sous-route `/adherer/helloasso` → composant souscription (widget).
- [ ] Composants standalone (zoneless, Signals, `ChangeDetectionStrategy.OnPush`).
- [ ] Entrée « Adhérer » ajoutée dans la navbar publique et dans le footer (→ `/adherer`).
- [ ] Au moins un CTA « Adhérer » depuis la home (bloc présentation/hero) (→ `/adherer`).
- [ ] CTA « Adhérer » sur chaque carte d'offre de `/adherer` → `/adherer/helloasso`.
- [ ] Responsive desktop + mobile conforme à la charte DVG.
- [ ] Lien actif/état visité géré (cohérent avec les autres entrées de nav).

## Notes techniques

- Suivre les patterns des pages publiques existantes (`/contact`, `/boutique`).
- Lazy-load de la route si cohérent avec le découpage actuel.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
