# FEATURE — Conformité légale de la boutique

**Branches** : `feat/boutique-collection-2026` (frontend) / `feat/boutique-commandes` (backend)
**Origine** : audit légal du 2026-07-29, demandé par Maxime sur le code produit

## Contexte

La boutique est techniquement prête mais l'habillage juridique de la vente à distance
est presque absent. Le panier fait cocher « J'accepte les conditions générales de vente »
alors qu'aucune page de CGV n'existe. Tant que cette feature n'est pas livrée, la boutique
ne peut pas ouvrir au public : une vente conclue sans CGV, sans confirmation de commande
et sans information sur la rétractation expose l'association à devoir rembourser tout
maillot renvoyé, flocage compris.

## Routes ajoutées

| Route | Contenu |
|---|---|
| `/conditions-generales-de-vente` | CGV complètes, dont garanties légales et médiation |
| `/retractation` | Avis d'information et formulaire type (annexe art. R221-1) |

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [CGV et droit de rétractation](us-cgv-retractation.md) | Fait | A faire | A faire | A faire |
| [Mentions légales et RGPD boutique](us-mentions-legales-rgpd.md) | Fait | A faire | A faire | A faire |
| [Mentions obligatoires sur la fiche produit](us-fiche-produit-conformite.md) | Fait | A faire | A faire | A faire |
| [Confirmation de commande au client](us-confirmation-commande-client.md) | Fait | A faire | A faire | A faire |
| [Rétention des données et modération du flocage](us-retention-moderation.md) | Fait | A faire | A faire | A faire |

## Données à fournir par le PO

Aucune de ces valeurs ne peut être inventée : elles engagent contractuellement.
Elles sont centralisées dans `frontend/src/app/pages/legal/legal-info.ts` et rendues
à l'écran avec un marqueur « À COMPLÉTER » tant qu'elles valent `null`.

| Donnée | Pourquoi | Statut |
|---|---|---|
| Téléphone de l'association | Le vendeur à distance doit être joignable rapidement (art. L221-5) | A fournir |
| Statut TVA : n° intracommunautaire ou franchise en base | Affichage des prix et factures | A fournir |
| Médiateur de la consommation retenu | Adhésion obligatoire (art. L612-1) | A souscrire |
| Adresse de retour des produits rétractés | Exercice du droit de rétractation | A fournir |
| Délai d'expédition et délai transporteur | Engagement contractuel (art. L216-1) | A fournir |
| Identifiant unique ADEME (filière REP Textiles, Refashion) | Mise sur le marché de vêtements sous marque propre | A souscrire |

## Démarche Refashion (filière REP Textiles)

Une seule adhésion débloque deux points bloquants : l'identifiant unique ADEME des
mentions légales, et le pictogramme Triman officiel de la fiche produit.

| Ressource | Lien |
|---|---|
| Test d'assujettissement, environ 2 minutes | https://izt1p6796el.typeform.com/to/AxwnbyyF |
| Plateforme d'adhésion | https://adherent.refashion.fr/inscription |
| Ligne dédiée metteurs en marché | 01 89 16 94 06, du lundi au vendredi, 9h-17h |
| FAQ metteurs en marché | https://faq.refashion.fr/hc/fr/categories/7257388759709 |

Aucun seuil de quantité ni de chiffre d'affaires, aucune exemption pour les
associations : le critère est la mise sur le marché français, pas la taille.
L'adhésion impose de régulariser les 4 années précédentes, d'où la question à
trancher en amont : des textiles ont-ils déjà été vendus contre paiement avant 2026,
via l'ancien catalogue (maillots 2020/2023, hoodies, t-shirts) ou en main propre ?

## Hors scope de cette feature

Points relevés par l'audit mais qui ne relèvent pas du code :

- Contrat de sous-traitance au sens de l'art. 28 RGPD avec le fabricant, qui reçoit
  nom, adresse et texte de flocage pour produire et expédier
- Adhésion effective à un médiateur de la consommation et à la filière REP Textiles
- Logo officiel Triman, à intégrer comme asset une fois obtenu
