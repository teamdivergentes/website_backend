# US — Contenu éditorial de la page d'adhésion

## Role / Action / Benefice

> **En tant que** visiteur intéressé par la structure,
> **je veux** comprendre pourquoi adhérer, ce que ça m'apporte et combien ça coûte,
> **afin de** décider de devenir membre en confiance.

## Criteres d'acceptation

- [ ] **Hero** : accroche éditoriale forte (rejoindre l'aventure DVG) + CTA vers le formulaire (scroll vers le widget).
- [ ] **Bloc « Pourquoi adhérer »** : mission de l'association, ce que l'adhésion finance/soutient.
- [ ] **Bénéfices membres** : présenter les 3 formules HelloAsso (récupérées 2026-05-27, cf. ci-dessous). Voir aussi le retour marketing : `../../marketing-review-offres.md`.

  **Formules actuelles HelloAsso :**
  - **Membre Adhérent** — 3 €/mois (36 €/an) ou 29,90 €/an : invitation AG, carte d'adhérent, bannière perso (X/Discord), newsletter, événements VIP (jeux + masterclass).
  - **Membre Bienfaiteur** — 5 €/mois (60 €/an) ou 49,90 €/an : avantages Adhérent + -10 % boutique (LMN8), fonds d'écran exclusifs, message d'anniversaire Discord, sessions de brainstorming, accès aux datas de coaching.
  - **Membre Privilégié** — 79,90 €/an : avantages Adhérent + Bienfaiteur + maillot DVG offert, grade VIP Discord, coaching privé, watching privé.
- [ ] **3 cartes d'offres affichées nativement** sur `/adherer` (Adhérent / Bienfaiteur / Privilégié), avec prix, liste d'avantages et CTA « Adhérer » → `/adherer/helloasso`. Données centralisées en source unique (Config admin de préférence). ⚠️ double maintenance avec HelloAsso assumée (cf. README EPIC) — noter « source de vérité paiement = HelloAsso ».
- [ ] **Leviers marketing** appliqués à la présentation (cf. `../../marketing-review-offres.md`) : switch/mention Mensuel↔Annuel + économie annuelle (~17 %), badge « le plus populaire » sur Bienfaiteur, valeur chiffrée du maillot sur Privilégié, jargon clarifié. (Le contenu d'offre HelloAsso lui-même n'est pas modifié pour l'instant.)
- [ ] **FAQ** : 3-6 questions (adhésion = don ? reçu fiscal ? résiliation ? qui peut adhérer ?).
- [ ] **CTA final** vers le widget HelloAsso.
- [ ] Design conforme à la charte DVG (#32D299 / #0C0D0C) et au brief redesign (`docs/brief-redesign-vitrine.md`) : paliers de surface, glow vert discret autorisé.
- [ ] **Accessibilité** : hiérarchie de titres correcte (un seul h1, h2/h3 ordonnés), contrastes ≥ 4.5:1 (cf. EPIC-33), focus visibles.

## Notes

- Contenus rédactionnels (avantages, tarifs, FAQ) à valider/fournir par le PO. Marquer les zones non fournies par un placeholder explicite plutôt que d'inventer.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| UI/UX | A faire | A faire | N/A | A faire |
