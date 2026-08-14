# EPIC-34 — Page d'adhésion à l'association (HelloAsso)

## Objectif

Permettre aux visiteurs d'**adhérer à l'association Team Divergentes** directement depuis le site public, via une **page dédiée éditoriale** intégrant le **formulaire d'adhésion HelloAsso embarqué (iframe)**.

## Valeur métier

- Convertir l'audience (fans, communauté) en **membres** de la structure associative.
- Crédibiliser la démarche associative (loi 1901) avec une page qui explique le pourquoi, les avantages et les modalités.
- Centraliser l'adhésion via HelloAsso (paiement, reçus fiscaux, gestion des membres) sans développer de tunnel de paiement maison.

## Décisions produit (2026-05-27)

| Décision | Choix retenu |
|----------|-------------|
| Intégration HelloAsso | **Widget embarqué (iframe)** du formulaire d'adhésion dans la page |
| Contenu de la page | **Page éditoriale complète** : hero + bénéfices + paliers/tarifs + FAQ + widget |
| Backend | **Aucune intégration API** (pas de webhook, pas de modèle BDD). HelloAsso gère les membres/paiements |
| URL HelloAsso | Externalisée (idéalement éditable depuis l'admin via la table `Config`, sinon variable de build) |
| Slug d'URL | **`/adherer`** (figé 2026-05-27, reco SEO : court, sans accent, mot-clé, pas de cannibalisation avec `/structure/recrutement`) |

## Ressources HelloAsso (fournies PO 2026-05-27)

- **Campagne d'adhésion** : `https://www.helloasso.com/associations/team-divergentes/adhesions/adhesion-team-divergentes-1`
- **URL d'embed widget (iframe)** : `https://www.helloasso.com/associations/team-divergentes/adhesions/adhesion-team-divergentes-1/widget` (suffixe `/widget`). À stocker dans `Config` (`helloasso_membership_url`).
- **Fallback** lien externe : la campagne ci-dessus (sans `/widget`).
- Domaine CSP à autoriser : `https://www.helloasso.com` (frame-src).

## Architecture en 2 pages (décision PO 2026-05-27)

Séparation présentation / souscription, pour maîtriser le marketing **sans dépendre** d'une modification HelloAsso (que le PO ne peut pas faire dans l'immédiat) :

| Route | Rôle | Contenu |
|-------|------|---------|
| **`/adherer`** | Présentation (vitrine) | Page éditoriale + **les 3 offres affichées nativement** (nos propres cartes/design), avec leviers marketing maîtrisés (économie annuelle, « le plus populaire », maillot chiffré…). CTA « Adhérer » sur chaque carte → `/adherer/helloasso`. |
| **`/adherer/helloasso`** | Souscription | **Widget HelloAsso embarqué (iframe)** pour le choix de la formule + paiement. |

> Les offres affichées sur `/adherer` reflètent les **formules HelloAsso actuelles** (cf. `marketing-review-offres.md`). Les améliorations d'offre (switch mensuel/annuel propre, déduction fiscale, etc.) restent des actions PO côté HelloAsso, **différées** ; notre page peut déjà mieux les présenter en l'état.

## Périmètre

- 2 routes publiques : **`/adherer`** et **`/adherer/helloasso`** (sous-route).
- Composant(s) standalone (zoneless, Signals, OnPush — standards frontend DVG).
- Entrée de navigation (navbar + footer) et CTA depuis la home et/ou `/structure` → pointent vers `/adherer`.
- **Offres affichées nativement** sur `/adherer` (données centralisées, idéalement éditables via `Config` pour rester synchro avec HelloAsso sans redéploiement — sinon fichier de données unique avec note « source de vérité = HelloAsso »).
- Design conforme à la charte DVG (#32D299 / #0C0D0C) et au brief redesign vitrine (`docs/brief-redesign-vitrine.md`).
- Widget HelloAsso embarqué sur `/adherer/helloasso` (CSP, titre iframe a11y, responsive, fallback lien externe).
- SEO : `/adherer` indexable (meta, JSON-LD, sitemap) ; `/adherer/helloasso` en **`noindex`** + canonical vers `/adherer` (page transactionnelle, contenu mince).

## ⚠️ Trade-off assumé (double maintenance)
Afficher les offres sur `/adherer` duplique l'information présente dans HelloAsso (risque d'incohérence si les tarifs changent). Mitigation : centraliser les offres dans une **source unique** (Config admin de préférence) + note explicite « tenir synchro avec la campagne HelloAsso ». La **source de vérité du paiement** reste HelloAsso.

## Hors périmètre

- Intégration API HelloAsso (compteur de membres, webhook, OAuth) → backlog ultérieur si besoin de données côté site.
- Tunnel de paiement maison, gestion des membres en base DVG.
- Page de remerciement custom post-adhésion (HelloAsso gère la confirmation).

## Découpage

| Élément | Type | Dossier | Claude | PO | E2E | Livré |
|---------|------|---------|--------|----|----|-------|
| Pages d'adhésion `/adherer` (vitrine + offres) et `/adherer/helloasso` (widget), SEO | Feature | [FEATURES/page-adhesion](FEATURES/page-adhesion/README.md) | A faire | A faire | A faire | A faire |
| Autoriser HelloAsso dans la CSP (frame-src) | Enabler | [ENABLERS/csp-helloasso](ENABLERS/csp-helloasso/README.md) | A faire | A faire | N/A | A faire |

## Dépendances

- **ENABLER CSP** : prérequis technique au widget iframe. La CSP est gérée à 2 niveaux (Nginx frontend `nginx.conf` + Traefik `dynamic.yml.j2`) — la prod applique la CSP Traefik (cf. audit 2026-05-27, EPIC-32 ENABLER-9 sur la divergence des deux CSP). Synchroniser les deux.
- **EPIC-29 (prerendering)** : la page étant publique et éditoriale, son partage social bénéficiera du prerender. Non bloquant pour la livraison.
- Prérequis métier : disposer d'une **campagne d'adhésion HelloAsso active** + son URL d'embed (à fournir par le PO).

## Priorité

**Moyenne** — feature de conversion à valeur métier directe, effort modéré (essentiellement frontend + CSP), sans dépendance backend.

## Branche

`feat/epic-34-membership-helloasso`
