# Boutique — solution de commande temporaire

**Date :** 2026-07-22
**Statut :** validé, prêt pour le plan d'implémentation
**Repos concernés :** `website_backend`, `website_frontend`

## Contexte

La boutique actuelle (`frontend/src/app/data/shopping-list.ts`) est une liste statique de
produits dont chaque carte renvoie vers une boutique tierce (`eliminate.fr`). Aucun panier,
aucun paiement, aucune commande côté DVG.

La cible à terme est la chaîne décrite dans le repo `merch-gateway` : Stripe Connect →
middleware NestJS → WooCommerce (Riton Wear) → ShipStation → CustomKit. Cette chaîne n'est
pas prête.

Ce document spécifie le **palier intermédiaire** : le client achète sur le site, Stripe
encaisse, DVG est notifié, et l'équipe transmet manuellement les commandes au marchand une
fois par semaine. Le suivi des commandes se fait depuis l'admin du site.

La PR #56 (`feat/boutique-redesign-responsive`) porte une refonte purement visuelle de la
page boutique. Elle est à 269 commits de retard sur `develop` et en conflit. Son contenu est
récupéré en phase 1, indépendamment du flux commande.

## Décisions de cadrage

| Sujet | Décision |
|---|---|
| Parcours d'achat | Achat à l'unité — pas de panier multi-produits |
| Catalogue | En dur dans le code, **côté backend**, exposé au front par API |
| Paiement | Stripe Checkout Session créée par le backend |
| Livraison | Adresse collectée par Stripe + frais de port forfaitaires |
| Notification équipe | Webhook Discord **et** e-mail à l'équipe DVG |
| Suivi client | Aucun — achat en invité, pas de compte, pas de page de suivi |
| Envoi marchand | L'admin génère un récap + CSV ; l'envoi du mail reste manuel |

### Hors périmètre

- Panier multi-produits
- CRUD produits en admin (catalogue en dur, modifié par déploiement)
- Compte client, historique de commandes, page de suivi publique
- E-mail de confirmation custom au client (le reçu automatique Stripe suffit)
- Gestion de stock
- Remboursements depuis l'admin (à faire dans le dashboard Stripe ; le statut `REFUNDED`
  existe pour refléter l'opération, pas pour la déclencher)

## Architecture

### Flux nominal

```
Client                Frontend           Backend (NestJS)         Stripe
  │  clic "Acheter"      │                     │                    │
  │─────────────────────>│                     │                    │
  │  choix taille/qté    │                     │                    │
  │─────────────────────>│  POST /shop/checkout│                    │
  │                      │────────────────────>│ recalcule le prix  │
  │                      │                     │ depuis le catalogue│
  │                      │                     │───createSession───>│
  │                      │  { url }            │<───session.url─────│
  │                      │<────────────────────│                    │
  │  redirection vers Stripe Checkout ────────────────────────────> │
  │  (carte + adresse de livraison + frais de port)                 │
  │                      │                     │                    │
  │                      │   POST /shop/webhook (signature vérifiée)│
  │                      │                     │<───────────────────│
  │                      │                     │ crée Order (idempotent)
  │                      │                     │   ├─> Discord webhook
  │                      │                     │   └─> mail équipe DVG
  │  <──── redirect /boutique/merci ───────────│                    │
```

### Invariants de conception

1. **Le prix ne vient jamais du client.** Le front n'envoie que `productId`, `size`,
   `quantity`. Le backend résout le prix depuis son propre catalogue. Sans cela, un client
   peut acheter un maillot à 0,01 €.
2. **La commande naît du webhook, pas du retour navigateur.** Le retour sur
   `/boutique/merci` est cosmétique : le client peut fermer l'onglet avant. Seul le webhook
   à signature vérifiée fait foi.
3. **Idempotence sur `stripeSessionId`** (contrainte unique). Stripe rejoue les webhooks ;
   un rejeu ne doit jamais produire de commande en double.
4. **Source unique pour le prix.** Le catalogue vit côté backend et le front le consomme via
   `GET /shop/products`. Le prix affiché et le prix facturé viennent du même endroit.

### Catalogue

Module backend, catalogue en constante TypeScript. Une entrée par produit :

```ts
interface ShopProduct {
  id: string;              // "maillotDvg_2026"
  name: string;            // "MAILLOT 2026"
  priceCents: number;      // 3990
  sizes: string[];         // ["S","M","L","XL","XXL"] ou [] si sans taille
  descKey: string;         // clé i18n, réutilise l'existant
  images: { front: string; back?: string };  // chemins d'assets front
  active: boolean;
}
```

Grille de tailles : `S / M / L / XL / XXL` pour les textiles (maillots, hoodies, t-shirts).
Les produits sans taille (tapis de souris) ont `sizes: []` et le sélecteur n'apparaît pas.

`GET /shop/products` ne renvoie que les produits `active: true`. Les images restent des
assets servis par le front ; le backend ne transporte que leurs chemins.

**Les descriptions produit restent côté front.** Elles vivent dans
`frontend/src/app/data/details-shopping-list.ts` (`DETAILS_SHOP_LIST`), sous forme de HTML
injecté par `[innerHTML]` dans `shop-item.component`. Les faire transiter par l'API
transformerait cet `innerHTML` en vecteur XSS. Le backend n'expose donc que `descKey`, et le
front résout la description localement. L'API ne transporte aucun HTML.

## Modèle de données

Le modèle suit la convention du repo : clé primaire `Int @default(autoincrement())`,
`@@map` en snake_case, index explicites.

```prisma
model Order {
  id                    Int          @id @default(autoincrement())
  reference             String       @unique   // "DVG-2026-0042"
  stripeSessionId       String       @unique   // clé d'idempotence
  stripePaymentIntentId String?

  productId             String       // clé du catalogue
  productName           String       // figé à l'achat
  size                  String?      // null pour les produits sans taille
  quantity              Int
  unitPriceCents        Int          // figé à l'achat
  shippingCents         Int
  totalCents            Int
  currency              String       @default("eur")

  customerEmail         String
  customerName          String
  shippingAddress       Json         // tel que renvoyé par Stripe

  status                OrderStatus  @default(PAID)
  sentToMerchantAt      DateTime?
  merchantBatchId       String?      // regroupe un envoi hebdomadaire
  trackingNumber        String?
  adminNote             String?      @db.Text

  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@map("orders")
}

enum OrderStatus {
  PAID              // payée, pas encore transmise au marchand
  SENT_TO_MERCHANT  // incluse dans un envoi hebdomadaire
  IN_PRODUCTION     // le marchand a confirmé la prise en charge
  SHIPPED           // expédiée, numéro de suivi saisi
  DELIVERED
  CANCELLED
  REFUNDED
}
```

**Dénormalisation assumée :** `productName` et `unitPriceCents` sont figés au moment de
l'achat. Le catalogue étant en dur, il changera au prochain déploiement ; une commande de
mars doit rester lisible avec le libellé et le prix de mars.

**`merchantBatchId`** permet de retrouver un lot hebdomadaire, de savoir exactement ce qui a
été transmis et quand, et de rejouer un récap si un mail s'est perdu.

**`reference`** est de la forme `DVG-{année}-{séquence sur 4 chiffres}`, générée à la
création de la commande. C'est l'identifiant communiqué au marchand et au client.

La séquence est portée par une **séquence PostgreSQL dédiée** (`order_reference_seq`), pas
par un `COUNT(*)` : deux webhooks traités en parallèle produiraient sinon la même référence.
La séquence n'est pas remise à zéro chaque année — l'année dans la référence est un préfixe
lisible, pas une contrainte de numérotation.

## API

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/shop/products` | public | catalogue actif |
| `POST` | `/shop/checkout` | public + rate-limit | crée la session Stripe, renvoie l'URL |
| `POST` | `/shop/webhook` | signature Stripe | crée la commande, notifie |
| `GET` | `/admin/orders` | `commandes:read` | liste paginée, filtre par statut |
| `GET` | `/admin/orders/pending-batch` | `commandes:read` | récap texte + CSV du lot en attente |
| `POST` | `/admin/orders/mark-sent` | `commandes:write` | bascule le lot en `SENT_TO_MERCHANT` |
| `PATCH` | `/admin/orders/:id` | `commandes:write` | `status`, `trackingNumber`, `adminNote` |

`POST /shop/checkout` accepte `{ productId, size, quantity }` et rien d'autre. `quantity` est
borné (1 à 10) pour éviter les commandes aberrantes.

Le webhook doit recevoir le **corps brut** de la requête pour que la vérification de
signature fonctionne — le parsing JSON global de NestJS doit être désactivé sur cette route.

## Partie admin

Route `/admin/commandes`, protégée par les guards existants. Deux permissions nouvelles,
`commandes:read` et `commandes:write`, suivant la convention en place
(`<domaine>:read|write|delete`, domaines en français). Ajoutées au rôle admin par migration.

### Zone haute — lot hebdomadaire

Encart « **N commandes en attente de transmission** » (statut `PAID`), avec deux actions
**délibérément séparées** :

- **Générer le récapitulatif** → modale contenant le texte prêt à copier-coller (une ligne
  par commande : référence, produit, taille, quantité, nom, adresse complète) et un bouton
  **Télécharger le CSV**.
- **Marquer comme transmises** → bascule le lot en `SENT_TO_MERCHANT`, horodate
  `sentToMerchantAt`, assigne un `merchantBatchId` commun.

La séparation est intentionnelle : un bouton unique qui générerait *et* marquerait
basculerait des commandes en « transmises » alors que l'envoi du mail a pu échouer. L'ordre
attendu est : générer → envoyer depuis sa propre boîte → vérifier → marquer.

### Zone basse — liste

Tableau filtrable par statut, trié par date décroissante. Colonnes : référence, date,
produit + taille, client, montant, statut. Le clic sur une ligne ouvre un panneau de détail :
adresse complète, lien vers le paiement dans le dashboard Stripe, et édition de `status`,
`trackingNumber`, `adminNote`.

## Gestion d'erreurs

| Situation | Comportement |
|---|---|
| Webhook à signature invalide | `400`, rien en base, log `warn`. Surface d'attaque principale : sans cette vérification, n'importe qui peut créer des commandes payées. |
| Webhook rejoué | La contrainte unique sur `stripeSessionId` fait échouer l'insert ; on l'intercepte et on répond `200`, sinon Stripe réessaie en boucle. |
| Discord ou SMTP en échec | **N'annule jamais la commande.** Elle est déjà payée, elle doit exister. Log `error`, réponse `200` à Stripe. La commande apparaît dans l'admin même si aucune notification n'est partie. |
| Produit inconnu, taille invalide, quantité hors bornes | `400` avant tout appel à Stripe. |
| Stripe injoignable au checkout | `502`, message générique côté client, log `error`. Aucune commande créée. |

## Tests

Le webhook est le point critique et concentre l'effort :

- signature invalide → rejet, aucune écriture
- rejeu du même événement → une seule commande en base, réponse `200`
- échec Discord et échec SMTP → la commande existe quand même

Le service de checkout :

- un prix envoyé dans le corps de la requête est ignoré, le prix du catalogue est utilisé
- `productId` inconnu, taille absente de `sizes`, quantité hors bornes → `400`

Le reste (API admin, composants front) suit la couverture habituelle des modules existants.

## Découpage en PR

**PR 1 — Refonte visuelle boutique** *(reprise de #56, repo frontend)*
La branche `feat/boutique-redesign-responsive` a 269 commits de retard pour 1 commit utile
(`212136d`). Plutôt qu'un rebase de 269 commits, on crée une branche neuve depuis `develop`
et on y **cherry-pick `212136d`**, en résolvant les conflits sur `boutique.scss` (~1100
lignes ajoutées) et `shop-item.component.*`. Vérification visuelle desktop et mobile. La PR
#56 est ensuite fermée en référençant la nouvelle. Indépendante des PR suivantes.

**PR 2 — Socle commandes backend**
Modèle Prisma + migration, catalogue serveur, `GET /shop/products`, `POST /shop/checkout`,
webhook signé, notifications Discord et mail. Testable de bout en bout en mode test Stripe,
sans aucune UI.

**PR 3 — Admin commandes**
API admin (liste, lot, mise à jour), permissions, écran `/admin/commandes`.

**PR 4 — Branchement du front boutique**
La page boutique consomme `GET /shop/products`, le bouton « Acheter » remplace les liens
sortants vers `eliminate.fr`, sélecteur taille/quantité, page `/boutique/merci`. Suppression
de `shopping-list.ts`.

Cet ordre fait que **le front n'est branché qu'en dernier** : jusqu'à la PR 4, la boutique
publique reste inchangée et fonctionnelle. Rien n'est visible du client tant que la chaîne
complète n'est pas validée en environnement de test.

## Configuration

Le projet répartit la configuration en deux endroits, et cette répartition est suivie :

**Secrets d'infrastructure → variables d'environnement** (comme `JWT_SECRET`,
`TWITCH_CLIENT_SECRET`), lues via `process.env` — `@nestjs/config` n'est pas installé.
À documenter dans `.env.template`.

| Variable | Rôle |
|---|---|
| `STRIPE_SECRET_KEY` | clé API Stripe |
| `STRIPE_WEBHOOK_SECRET` | secret de signature du webhook |
| `STRIPE_SHIPPING_RATE_ID` | tarif de port forfaitaire créé dans Stripe |
| `SHOP_SUCCESS_URL` / `SHOP_CANCEL_URL` | URLs de retour après paiement |

**Paramètres opérationnels → table `Config` en base**, lus via `ConfigService.getValue()`,
comme `contact_smtp_host` et `contact_discord_webhook`. Éditables depuis l'admin sans
déploiement.

| Clé | Rôle |
|---|---|
| `shop_discord_webhook` | salon de notification DVG |
| `shop_team_email` | destinataire de la notification équipe |

Ces deux clés ne doivent **pas** être ajoutées à `src/config/public-config-keys.ts` :
cette allow-list expose les valeurs via `GET /api/config`.

L'envoi SMTP réutilise l'infrastructure existante : credentials SMTP déjà en base
(`contact_smtp_host`, `contact_smtp_port`, `contact_smtp_user`, `contact_smtp_pass`),
pattern de service repris de `recruitment/services/application-notifier.service.ts`.

## Migration vers la cible

Cette solution est explicitement transitoire. Quand `merch-gateway` sera prêt, le point de
bascule est le handler du webhook : au lieu de notifier Discord et l'équipe, il appellera le
middleware pour créer la commande WooCommerce. Le modèle `Order`, l'admin et le parcours
client restent en place. C'est la raison pour laquelle l'effort a été volontairement
concentré sur le flux d'argent et non sur l'UI de paiement.
