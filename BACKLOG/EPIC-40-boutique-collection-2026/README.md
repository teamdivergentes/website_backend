# EPIC-40 — Boutique collection 2026

**Statut** : EN REVIEW — les deux PR sont mergées sur `develop` (2026-07-31), la préprod porte donc l'ensemble. La recette PO reste à faire.
**Priorité** : Haute
**Branches** : `feat/boutique-commandes` (backend) / `feat/boutique-collection-2026` (frontend)
**Spec design** : `backend/docs/superpowers/specs/2026-07-28-boutique-collection-2026-design.md`
**Remplace** : la spec du 2026-07-22 sur le catalogue, le flocage, les frais de port et l'assortiment

## Objectif

Rendre la boutique réellement marchande pour la collection 2026 : trois maillots
personnalisables au flocage, achetables sur le site, avec un catalogue et des tarifs
pilotés depuis l'admin sans redéploiement.

Besoin exprimé par Maxime le 2026-07-28. La chaîne cible `merch-gateway`
(Stripe Connect → WooCommerce → ShipStation) est **mise en pause** : DVG encaisse
directement via Stripe et relance le fournisseur par mail.

## Périmètre

- 3 maillots : Team Divergentes, DVG × Joker (`EVA Joker`), DVG × Mystic (`EVA Mystic`)
- Déclinaisons en tailles `S / M / L / XL / XXL` uniquement
- Flocage au pseudo, optionnel, avec surcoût paramétrable (0 = offert)
- Catalogue en base (`shop_products`) avec CRUD admin et upload des visuels
- Frais de port unifiés paramétrables, **France uniquement**
- Panier multi-articles persistant, paiement par Stripe Checkout hébergé
- Retrait de l'ancien catalogue (maillots 2020/2023, hoodies, t-shirts, tapis)

**Hors scope** : compte client, historique de commandes, gestion de stock,
remboursements depuis l'admin, livraison hors France, codes promo.

## Suivi

| Élément | Claude | PO | E2E | Livré |
|---------|--------|----|----|-------|
| [ENABLER — Catalogue en base](ENABLERS/catalogue-en-base/README.md) | Fait | A faire | A faire | A faire |
| [FEATURE — Parcours d'achat](FEATURES/parcours-achat/README.md) | Fait | A faire | A faire | A faire |
| [FEATURE — Admin boutique](FEATURES/admin-boutique/README.md) | Fait | A faire | A faire | A faire |
| [FEATURE — Conformité légale](FEATURES/conformite-legale/README.md) | En cours | A faire | A faire | A faire |
| [FEATURE — Pilotage financier](FEATURES/pilotage-financier/README.md) | A faire | A faire | A faire | A faire |

## Points ouverts (bloquants pour l'ouverture au public)

| Sujet | Nature | Statut |
|---|---|---|
| Compte Stripe DVG (`sk_*`, `whsec_*`) | Action humaine | A faire |
| Prix des 3 maillots, frais de port, surcoût de flocage | Donnée métier | **Arrêté** le 2026-07-29, cf. [US Grille tarifaire](ENABLERS/catalogue-en-base/us-grille-tarifaire-2026.md) |
| Coût unitaire de lancement : 19 € ou 26 € | Donnée métier | **A trancher**. Les postes communiqués donnent 16 + 3 = 19 € hors commission partenaire, mais la note annonce 26 € hors partenaire. Soit un 4e poste de 7 € manque, soit la commission est déjà comptée dans les 26 €. Implémenté à 19 €, modifiable dans Réglages sans déploiement |
| Coût fournisseur du flocage | Donnée métier | Provisionné à 0 €, à demander à CustomKit |
| **Déploiement préprod bloqué** | Action humaine | Le quality gate SonarQube échoue sur `new_security_hotspots_reviewed` : **1 hotspot à revoir sur chaque projet**. `docker` exige un Sonar vert, donc `scan-image` et `deploy-preprod` sont sautés. À traiter dans l'interface : [dvg-backend](https://sonarqube.tellebma.fr/security_hotspots?id=dvg-backend&inNewCodePeriod=true) et [dvg-frontend](https://sonarqube.tellebma.fr/security_hotspots?id=dvg-frontend&inNewCodePeriod=true), puis `gh run rerun <id> --failed`. Le token d'analyse n'a pas la permission de lister ni de marquer les hotspots |
| Bande-son de la vidéo du hero | Design | `hero-boutique.mp4` est **sans piste audio**. Le bouton de son est donc masqué. Il réapparaîtra seul dès qu'une version sonore remplacera le fichier. Le montage source `Motion_Final_Team_Divergentes.mov` en possède une |
| Guide des tailles (mesures en cm) | Donnée métier | Valeurs de la maquette en ligne, à confirmer par le fournisseur |
| Délai annoncé commande → réception | Donnée métier | Manquant, affiché « A COMPLETER » à l'écran. Le fournisseur annonce jusqu'à 25 jours ouvrés, cf. Fournisseur ci-dessous |
| Téléphone de l'association | Juridique | A fournir |
| Statut TVA : n° intracommunautaire ou franchise en base | Juridique | A fournir |
| Adresse de retour des produits rétractés | Juridique | A fournir |
| Médiateur de la consommation | Juridique | **Adhésion à souscrire** (art. L612-1) |
| Identifiant unique ADEME, filière REP Textiles (Refashion) | Juridique | **Adhésion à souscrire**, sans seuil ni exemption pour les petites structures. Débloque à la fois l'IDU des mentions légales et le pictogramme Triman de la fiche produit. Attention : l'adhésion impose de régulariser les 4 années précédentes, donc à vérifier si des textiles ont déjà été vendus avant 2026 |
| Contrat de sous-traitance RGPD avec le fabricant | Juridique | A signer (art. 28 RGPD) |
| CGV, rétractation, confirmation de commande | Juridique | En cours — [FEATURE](FEATURES/conformite-legale/README.md) |
| Visuels DVG classique (face + dos) et Mystic (dos) | Design | En attente du designer |
| Aperçu du flocage sur le visuel de dos | Produit | **Non planifié** — [US](FEATURES/parcours-achat/us-apercu-flocage-sur-visuel.md) tracée, la boutique part sans |

**Rétractation** : un maillot floqué est un bien personnalisé, donc exclu du droit de
rétractation de 14 jours (art. L221-28 3° du code de la consommation) — **uniquement si
le client en est informé et l'accepte avant l'achat**. Attention à la lecture inverse :
un maillot **sans** flocage ouvre bien les 14 jours, la fabrication à la commande ne
supprime pas ce droit. Les deux cas sont traités par la
[FEATURE Conformité légale](FEATURES/conformite-legale/README.md).

**Audit du 2026-07-29** : la revue du code produit a montré que le manque dépassait les
seules CGV, la boutique n'ayant ni confirmation de commande au client, ni médiateur, ni
mentions AGEC, ni durée de conservation des données. Voir la feature dédiée.

## Fournisseur

**CustomKit** ([customkit.eu](https://customkit.eu/)), nom commercial de **SIA SWL**,
Satekles iela 2c, Riga, Lettonie. Fabrication interne en Lettonie, matières sourcées
dans l'Union, pas de quantité minimale de commande.

Relevé de leurs conditions le 2026-07-29, chaque ligne ayant un effet direct sur nos
propres engagements :

| Constat | Conséquence pour DVG |
|---|---|
| Livraison annoncée « up to 25 working days of the order placement » | Avec notre batch hebdomadaire, le pire cas approche 30 jours ouvrés. Le délai annoncé au client doit être large, et il ne peut pas rester implicite : le régime supplétif de 30 jours calendaires serait déjà dépassé |
| « No liability to you for any delay in the delivery » | Le retard annoncé au client est porté seul, sans recours en amont |
| Retours exclus sur les couleurs, les détails imprimés et la qualité des visuels fournis | La garantie légale de conformité due au client sur 2 ans reste à notre charge sans recours. Renforce l'intérêt du contrôle humain du flocage avant transmission |
| Port de 10 EUR (petit colis) à 30 EUR (20+ pièces) | Coût réel retenu : 9 € en standard, 12 € en rapide, saisis dans les réglages. Le port facturé au client (5 € / 10 €) ne les couvre pas : arbitrage commercial assumé, mesuré par le panneau Livraison |
| Options express disponibles sur demande | **Retenue** : mode rapide FedEx, 2 à 3 jours ouvrés après production, facturé 10 € |
| Livraison Europe possible | Le fournisseur expédie hors France. Le périmètre reste France au lancement : la grille tarifaire, les CGV et les mentions fiscales ne couvrent qu'un pays. Ouverture à tracer en US dédiée |

À clarifier avec eux : les 25 jours ouvrés vont-ils jusqu'à notre porte ou jusqu'à celle
du client final, le flocage allonge-t-il ce délai, et quelles sont leurs périodes de
fermeture.

## Décisions

| Date | Décision |
|---|---|
| 2026-07-29 | Les visuels produit passent de trois colonnes fixes à une collection `shop_product_images`. L'admin gère un nombre libre de vues, leur libellé, leur ordre, et désigne la vignette de vitrine. Débloque le dos floqué et les photos portées, qui n'avaient aucune colonne où se ranger |
| 2026-07-29 | La franchise de port devient un argument affiché tout au long du parcours (fiche, pastille, panier) et non une découverte au moment de payer. Une jauge accompagne le montant restant : un montant seul ne dit pas si l'on est proche du seuil |
| 2026-07-29 | `hero-boutique.mp4` était **sans piste audio**. La vidéo a été réencodée avec la bande-son du montage source, dont elle partage exactement la durée : l'image n'est pas retouchée, seul l'audio est ajouté |
| 2026-07-29 | Plus d'image d'attente (`poster`) sur la vidéo du hero : c'était un second téléchargement pour montrer autre chose que la vidéo. Le navigateur affiche sa première image, le fond de section tient le cadre jusque-là |
| 2026-07-29 | Le bouton de son n'apparaît qu'au mouvement du pointeur ou au focus clavier, et seulement quand le hero est à l'écran. La vidéo est mise en pause hors écran : décoder des images que personne ne regarde coûte du processeur pour rien |
| 2026-07-29 | La détection de piste audio ne conclut à l'absence de son que sur une réponse négative certaine (`mozHasAudio`, `audioTracks`). Le compteur d'octets décodés de Chrome reste à zéro sur une vidéo muette, qu'elle ait une bande-son ou non : s'y fier masquait le bouton partout |
| 2026-07-29 | Le hero de la boutique s'ouvre sur la seule vidéo : le titre se révèle au premier défilement, et un bouton rend le son disponible sans jamais l'imposer |
| 2026-07-29 | Grille tarifaire arrêtée : maillot 40 €, flocage 5 €, port 5 € / 10 €, offert dès 120 €. Deux modes de livraison au lieu d'un tarif unique. Les coûts internes passent en base avec un interrupteur pour la commission partenaire, inactive au lancement |
| 2026-07-29 | La marge est calculée à partir de coûts **figés sur la commande** et non des réglages courants. Un tarif fournisseur qui bouge ne doit pas réécrire la marge des commandes passées |
| 2026-07-29 | Le port est vendu à perte de façon assumée (5 € facturés pour 9 € réels) : c'est un argument commercial financé par la marge du maillot. Un indicateur le signale plutôt que de le laisser découvrir en fin d'exercice |
| 2026-07-29 | Origine produit corrigée en « matières et fabrication européennes ». La fiche annonçait « sublimé et floqué en France » alors que le fabricant produit en Lettonie : allégation d'origine inexacte (art. L121-4 C. conso). Un test verrouille la régression |
| 2026-07-28 | `merch-gateway` mis en pause : Stripe direct + relance fournisseur par mail |
| 2026-07-29 | Dos Joker livré en deux versions alignées (avec et sans nom), zone de flocage mesurée, police identifiée (Bebas Neue). L'aperçu superposé est **mis en pause** : la boutique part avec l'aperçu typographique actuel |
| 2026-07-29 | Refonte graphique livrée : angles nets (chanfrein), sections narratives, fiche de specs. Grammage corrigé à 135 g/m² d'après la fiche fabricant |
| 2026-07-28 | Catalogue en base plutôt qu'en dur : les prix doivent changer sans redéploiement |
| 2026-07-28 | Panier multi-articles (la spec du 22/07 prévoyait l'achat à l'unité) |
| 2026-07-28 | Livraison France uniquement, tarif unifié |
| 2026-07-28 | Statut `PENDING` : la commande est persistée dès le checkout, les métadonnées Stripe (500 caractères) ne pouvant pas porter un panier |
