# Boutique — collection 2026, catalogue administrable et flocage

**Date :** 2026-07-28
**Statut :** validé, prêt pour l'implémentation
**Repos concernés :** `website_backend`, `website_frontend`
**Remplace :** [`2026-07-22-boutique-commandes-temporaire-design.md`](2026-07-22-boutique-commandes-temporaire-design.md)

## Rapport à la spec précédente

La spec du 22/07 reste la référence pour tout ce qui touche au **flux d'argent** : invariants
du webhook, idempotence, gestion d'erreurs, workflow de transmission au marchand. Ces parties
sont reprises telles quelles et ne sont pas re-justifiées ici.

Quatre décisions prises le 28/07 la font diverger :

| Sujet | Spec 22/07 | Spec 28/07 |
|---|---|---|
| Catalogue | constante TypeScript backend, modifié par déploiement | **table PostgreSQL, CRUD depuis l'admin** |
| Flocage | absent du périmètre | **personnalisation au pseudo, surcoût paramétrable** |
| Frais de port | `STRIPE_SHIPPING_RATE_ID` en variable d'environnement | **montant en base, éditable depuis l'admin** |
| Assortiment | tout l'ancien catalogue (maillots, hoodies, t-shirts, tapis) | **3 maillots 2026 uniquement** |
| Parcours | achat à l'unité | **panier multi-articles** |

Le déclencheur est simple : les prix, les frais de port et le surcoût de flocage doivent
pouvoir changer sans redéploiement. Un catalogue en dur ne le permet pas.

Par ailleurs, la chaîne cible `merch-gateway` (Stripe Connect → WooCommerce → ShipStation)
est **mise en pause**. Le palier décrit ici — Stripe encaisse pour DVG, l'équipe relance le
fournisseur par mail — reste la solution de production jusqu'à nouvel ordre.

## Contexte

La boutique actuelle (`frontend/src/app/data/shopping-list.ts`) est une liste statique dont
chaque carte renvoie vers `eliminate.fr`. Aucun panier, aucun paiement, aucune commande côté
DVG. Le backend n'a aucun module boutique.

La collection 2026 comporte trois maillots, dont deux aux couleurs des équipes EVA de la
structure :

| Produit | Équipe liée | Visuels au 28/07 |
|---|---|---|
| Maillot 2026 — Team Divergentes | — | aucun |
| Maillot 2026 — DVG × Joker | EVA Joker (`id 1`) | face + dos, fond transparent |
| Maillot 2026 — DVG × Mystic | EVA Mystic (`id 2`) | render 3D seul, pas de dos |

Les visuels arrivent progressivement. Le modèle doit donc tolérer un produit incomplet
plutôt que de supposer un catalogue figé au déploiement.

## Décisions de cadrage

| Sujet | Décision |
|---|---|
| Assortiment | 3 maillots ; l'ancien catalogue est retiré de la vitrine |
| Déclinaisons | tailles `S / M / L / XL / XXL`, rien d'autre |
| Flocage | pseudo seul, optionnel, surcoût paramétrable (0 = offert) |
| Catalogue | table PostgreSQL, CRUD admin, visuels uploadés |
| Paiement | Stripe Checkout hébergé |
| Livraison | **France uniquement**, tarif unifié paramétrable |
| Parcours | panier multi-articles, achat en invité |
| Notification | mail à l'équipe DVG + webhook Discord |
| Envoi marchand | récap + CSV généré par l'admin, envoi du mail manuel |

### Hors périmètre

- Compte client et historique de commandes
- Gestion de stock
- Remboursements déclenchés depuis l'admin (le dashboard Stripe s'en charge ; le statut
  `REFUNDED` reflète l'opération, il ne la provoque pas)
- Livraison hors France
- Coupons et codes promo

## Invariants de conception

Repris de la spec du 22/07, toujours en vigueur, et étendus au flocage :

1. **Le prix ne vient jamais du client.** Le front n'envoie que `productId`, `size`,
   `quantity`, `flockingText`. Le backend résout prix, surcoût de flocage et frais de port
   depuis sa propre base. Sans cela, un client achète un maillot à 0,01 € en éditant la
   requête.
2. **La commande naît du webhook, pas du retour navigateur.** Le retour sur
   `/boutique/merci` est cosmétique : le client peut fermer l'onglet avant. Seul le webhook à
   signature vérifiée fait foi.
3. **Idempotence sur `stripeSessionId`.** Stripe rejoue ses webhooks ; un rejeu ne doit
   jamais produire de commande en double, ni un second mail.
4. **Les lignes de commande sont des instantanés.** `productName`, `size`, `unitPriceCents`,
   `flockingFeeCents` sont figés à l'achat. Le catalogue étant désormais éditable à chaud,
   c'est devenu indispensable : une commande de mars doit rester lisible avec le prix de
   mars, même si le produit a changé de nom ou a été supprimé depuis.
5. **Le flocage est une donnée non fiable.** C'est du texte saisi par un inconnu qui finira
   imprimé sur un vêtement, affiché dans un mail HTML et exporté en CSV. Il est validé et
   normalisé côté serveur, jamais en confiance.

## Modèle de données

Convention du repo : clé primaire `Int @default(autoincrement())`, `@@map` en snake_case,
index explicites.

```prisma
model ShopProduct {
  id               Int      @id @default(autoincrement())
  slug             String   @unique          // "maillot-2026-joker"
  name             String
  shortDescription String?                    // accroche de la carte
  description      String?  @db.Text          // fiche produit, texte brut
  priceCents       Int
  imageFront       String?                    // chemin d'asset ou /uploads/…
  imageBack        String?
  imageCard        String?
  allowFlocking    Boolean  @default(true)
  flockingFeeCents Int      @default(0)
  flockingTopPct   Float    @default(32)      // position de l'aperçu, en % du dos
  flockingLeftPct  Float    @default(50)
  teamId           Int?                       // FK Team, SetNull
  active           Boolean  @default(false)
  position         Int      @default(0)
  sizes            ShopProductSize[]

  @@map("shop_products")
}

model ShopProductSize {
  id        Int    @id @default(autoincrement())
  productId Int
  label     String                             // "S", "M", …
  position  Int    @default(0)

  @@unique([productId, label])
  @@map("shop_product_sizes")
}

model ShopSettings {                           // singleton, id = 1
  id                Int     @id @default(1)
  shippingFeeCents  Int     @default(590)
  currency          String  @default("eur")
  ordersNotifyEmail String?
  shopEnabled       Boolean @default(false)

  @@map("shop_settings")
}

model ShopOrder {
  id                    Int         @id @default(autoincrement())
  reference             String      @unique    // "DVG-2026-0042"
  stripeSessionId       String      @unique    // clé d'idempotence
  stripePaymentIntentId String?

  customerEmail         String
  customerName          String
  shippingAddress       Json

  subtotalCents         Int
  shippingCents         Int
  totalCents            Int
  currency              String      @default("eur")

  status                OrderStatus @default(PAID)
  sentToMerchantAt      DateTime?
  merchantBatchId       String?
  trackingNumber        String?
  adminNote             String?     @db.Text

  items                 ShopOrderItem[]

  @@index([status])
  @@map("shop_orders")
}

model ShopOrderItem {
  id               Int     @id @default(autoincrement())
  orderId          Int
  productId        Int?                        // SetNull : le produit peut disparaître
  productName      String                      // instantané
  size             String
  flockingText     String?
  quantity         Int
  unitPriceCents   Int                         // instantané, hors flocage
  flockingFeeCents Int                         // instantané
  lineTotalCents   Int

  @@map("shop_order_items")
}

enum OrderStatus {
  PAID
  SENT_TO_MERCHANT
  IN_PRODUCTION
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
```

**`reference`** suit `DVG-{année}-{séquence 4 chiffres}`, alimentée par une **séquence
PostgreSQL dédiée** (`shop_order_reference_seq`) et non par un `COUNT(*)` : deux webhooks
traités en parallèle produiraient sinon la même référence. La séquence n'est pas remise à
zéro chaque année — l'année est un préfixe lisible, pas une contrainte de numérotation.

**`active` vaut `false` par défaut.** Un produit créé sans visuel ne doit pas atterrir en
vitrine par accident. L'activation est un geste explicite dans l'admin.

**`shopEnabled`** permet de fermer la boutique entière sans dépublier chaque produit — utile
tant que les clés Stripe de production ne sont pas en place.

### Position du flocage

`flockingTopPct` / `flockingLeftPct` positionnent l'aperçu du pseudo sur l'image de dos, en
pourcentage. Ces valeurs vivent sur le produit parce que chaque mockup place son emplacement
de flocage différemment. Sur le mockup Joker, le « Nickname » tombe à ~32 % du haut, centré :
ce sont les valeurs par défaut.

C'est un réglage d'**affichage uniquement**. Il ne conditionne ni le prix, ni ce qui est
transmis au fabricant.

## Validation du flocage

Appliquée côté serveur, au checkout, avant tout appel à Stripe :

| Règle | Valeur | Raison |
|---|---|---|
| Longueur | 1 à 12 caractères après trim | Au-delà, le texte ne tient pas sur un dos de maillot |
| Charset | `[A-Za-z0-9 .\-_]` | Un pseudo, pas du HTML ni de l'unicode exotique |
| Espaces | trim, espaces internes réduits à un seul | Évite `"a          b"` |
| Produit | rejeté si `allowFlocking` est faux | Cohérence catalogue |

Un flocage absent, vide ou composé uniquement d'espaces est traité comme **pas de flocage** —
et ne facture donc pas le surcoût. C'est le comportement attendu : « il est également
possible de ne rien mettre ».

Le charset est volontairement restrictif. Ce texte est réinjecté dans un mail HTML et dans un
export CSV : les caractères `<`, `>`, `=`, `+`, `@` et le point-virgule ouvrent
respectivement sur de l'injection HTML et sur de l'injection de formule CSV.

## Calcul du prix

Entièrement serveur, à partir du panier reçu :

```
ligne      = (priceCents + (flocage ? flockingFeeCents : 0)) × quantity
sousTotal  = Σ lignes
port       = shippingFeeCents            (unifié, indépendant du nombre d'articles)
total      = sousTotal + port
```

Bornes : `quantity` entre 1 et 10 par ligne, 20 articles au total. Un panier vide, un produit
inactif ou une taille absente de `sizes` → `400` avant tout appel à Stripe.

## API

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/shop/products` | public | catalogue actif + frais de port |
| `GET` | `/shop/products/:slug` | public | fiche produit |
| `POST` | `/shop/checkout` | public + rate-limit | crée la session Stripe, renvoie l'URL |
| `POST` | `/shop/webhook` | signature Stripe | crée la commande, notifie |
| `GET` | `/admin/shop/products` | `boutique:read` | catalogue complet, inactifs compris |
| `POST` `PATCH` `DELETE` | `/admin/shop/products/:id` | `boutique:write` | CRUD |
| `GET` `PATCH` | `/admin/shop/settings` | `boutique:read` / `write` | port, devise, email, ouverture |
| `GET` | `/admin/shop/orders` | `boutique:read` | liste paginée, filtre par statut |
| `GET` | `/admin/shop/orders/pending-batch` | `boutique:read` | récap texte + CSV du lot |
| `POST` | `/admin/shop/orders/mark-sent` | `boutique:write` | bascule le lot en `SENT_TO_MERCHANT` |
| `PATCH` | `/admin/shop/orders/:id` | `boutique:write` | statut, suivi, note |

Deux permissions nouvelles, `boutique:read` et `boutique:write`, suivant la convention en
place (`<domaine>:read|write|delete`, domaines en français), ajoutées au rôle admin par
migration.

`GET /shop/products` renvoie les frais de port dans la même réponse que le catalogue : le
panier doit afficher le total sans second aller-retour, et surtout afficher **le même
montant** que celui qui sera facturé.

Le webhook doit recevoir le **corps brut** pour que la vérification de signature fonctionne —
le parsing JSON global de NestJS est désactivé sur cette route.

## Parcours client

```
/boutique              grille des 3 maillots (hero vidéo conservé)
/boutique/:slug        fiche produit : galerie face/dos, taille, flocage + aperçu live,
                       prix recalculé, ajout au panier
/boutique/panier       récap, frais de port, acceptation CGV, bouton payer
   └─> Stripe Checkout (carte, adresse de livraison FR, 3DS)
/boutique/merci        confirmation
```

Le panier vit dans un signal Angular persisté en `localStorage`. Il ne contient que des
identifiants et des quantités — **jamais de prix**. Les montants affichés sont recalculés à
partir du catalogue chargé depuis l'API, ce qui garantit qu'un panier laissé ouvert une
semaine ne facture pas un prix périmé.

## Gestion d'erreurs

Repris de la spec du 22/07 :

| Situation | Comportement |
|---|---|
| Webhook à signature invalide | `400`, rien en base, log `warn`. C'est la surface d'attaque principale : sans cette vérification, n'importe qui crée des commandes payées. |
| Webhook rejoué | La contrainte unique sur `stripeSessionId` fait échouer l'insert ; on l'intercepte et on répond `200`, sinon Stripe réessaie en boucle. |
| Discord ou SMTP en échec | **N'annule jamais la commande.** Elle est payée, elle doit exister. Log `error`, réponse `200`. La commande apparaît dans l'admin même si aucune notification n'est partie. |
| Produit inactif, taille inconnue, quantité ou flocage invalides | `400` avant tout appel à Stripe. |
| Stripe injoignable au checkout | `502`, message générique, log `error`. Aucune commande créée. |
| Boutique fermée (`shopEnabled` faux) | `GET /shop/products` renvoie une liste vide, `POST /shop/checkout` renvoie `403`. |

## Tests

L'effort se concentre sur le calcul du prix et sur le webhook.

**Tarification :**
- un `priceCents` envoyé dans le corps de la requête est ignoré, le prix de la base est utilisé
- le surcoût de flocage n'est facturé que si un flocage non vide est fourni
- flocage sur un produit `allowFlocking: false` → `400`
- flocage trop long, ou contenant `<`, `;`, `=` → `400`
- taille absente de `sizes`, produit inactif, quantité hors bornes → `400`
- les frais de port ne sont comptés qu'une fois, quel que soit le nombre d'articles

**Webhook :**
- signature invalide → rejet, aucune écriture
- rejeu du même événement → une seule commande, une seule notification, réponse `200`
- échec Discord et échec SMTP → la commande existe quand même

**Instantanés :** une commande passée conserve son prix après modification du produit.

Le reste (CRUD admin, composants front) suit la couverture habituelle des modules existants.

## Découpage en PR

**PR 1 — Socle catalogue et commandes (backend)**
Modèles Prisma + migration + seed des 3 maillots, module `shop`, tarification, session
Stripe, webhook signé, notifications. Testable de bout en bout en mode test Stripe, sans UI.

**PR 2 — Admin boutique (backend + frontend)**
Permissions, CRUD produits, réglages, API et écrans de suivi des commandes.

**PR 3 — Parcours d'achat public (frontend)**
Grille depuis l'API, fiche produit avec aperçu du flocage, panier, page de confirmation.
Suppression de `shopping-list.ts`.

Comme dans la spec précédente, **le front public est branché en dernier** : jusqu'à la PR 3
la boutique visible reste inchangée, et rien n'est exposé au client tant que la chaîne
complète n'est pas validée.

## Configuration

Répartition existante du projet, respectée.

**Secrets d'infrastructure → variables d'environnement**, lues via `process.env`
(`@nestjs/config` n'est pas installé). À documenter dans `.env.template`.

| Variable | Rôle |
|---|---|
| `STRIPE_SECRET_KEY` | clé API Stripe |
| `STRIPE_WEBHOOK_SECRET` | secret de signature du webhook |
| `SHOP_SUCCESS_URL` / `SHOP_CANCEL_URL` | URLs de retour après paiement |

`STRIPE_SHIPPING_RATE_ID` **disparaît** : les frais de port sont désormais en base, et le
tarif est passé à Stripe en `shipping_options` inline à chaque session.

**Paramètres opérationnels → base de données.** Les montants et l'ouverture de la boutique
vivent dans `ShopSettings`. Le webhook Discord reste dans la table `Config` existante, sous
`shop_discord_webhook`, et ne doit **pas** être ajouté à `src/config/public-config-keys.ts`
qui expose les valeurs via `GET /api/config`.

L'envoi SMTP réutilise l'infrastructure existante (`contact_smtp_*` en base), avec le pattern
de `recruitment/services/application-notifier.service.ts`.

## Points ouverts, non bloquants

Ces éléments manquent au 28/07. L'implémentation avance avec des valeurs provisoires ; ils
sont modifiables depuis l'admin sans redéploiement.

- Prix des trois maillots, frais de port, surcoût de flocage
- Guide des tailles (mesures en cm) — principal levier sur le taux de retour
- Délai annoncé entre commande et réception
- Grammage 2026 et confirmation de la certification Oeko-Tex

## Obligations légales

Deux points relèvent d'une décision de la structure, pas de l'implémentation.

**CGV.** La vente en ligne à des particuliers les rend obligatoires. La case d'acceptation
est prévue au panier ; le texte reste à rédiger.

**Droit de rétractation.** Un maillot floqué au pseudo du client est un bien personnalisé,
donc **exclu du droit de rétractation de 14 jours** (art. L221-28 3° du code de la
consommation) — mais **uniquement si le client en est informé et l'accepte avant l'achat**.
Sans cette mention explicite, tout maillot floqué renvoyé doit être remboursé. Un maillot
sans flocage, lui, reste soumis au droit de rétractation classique.

## Migration vers la cible

Cette solution reste transitoire. Quand `merch-gateway` reprendra, le point de bascule est le
handler du webhook : au lieu de notifier Discord et l'équipe, il appellera le middleware pour
créer la commande. Les modèles, l'admin et le parcours client restent en place. C'est la
raison pour laquelle l'effort porte sur le flux d'argent et le catalogue, pas sur l'UI de
paiement.
