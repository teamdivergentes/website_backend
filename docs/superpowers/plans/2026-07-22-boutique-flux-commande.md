# Flux de commande boutique (solution temporaire) — Plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUIS — utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** permettre au client d'acheter un article sur le site avec paiement Stripe, notifier l'équipe DVG à chaque commande payée, et piloter la transmission hebdomadaire au marchand depuis l'admin.

**Architecture :** le backend expose le catalogue et crée une Stripe Checkout Session en recalculant le prix côté serveur. Stripe héberge le paiement et collecte l'adresse. Un webhook à signature vérifiée crée la commande en base de façon idempotente, puis notifie Discord et l'équipe par mail. L'admin liste les commandes, génère un récapitulatif hebdomadaire et suit les statuts.

**Tech Stack :** NestJS 11, Prisma (client généré dans `generated/prisma`), PostgreSQL, Stripe SDK Node, Jest côté backend — Angular 20 standalone zoneless, Angular Material, Jasmine + Karma côté frontend.

**Spec :** `docs/superpowers/specs/2026-07-22-boutique-commandes-temporaire-design.md`

**Repos :**
- Backend — `/home/tellebma/DEV/DVG/WEB/backend`
- Frontend — `/home/tellebma/DEV/DVG/WEB/frontend`

## Contraintes globales

Ces règles s'appliquent à **toutes** les tâches.

**Backend**
- `@nestjs/config` n'est **pas** installé : les variables d'environnement se lisent via `process.env` avec fallback `??`. Toute nouvelle variable est documentée dans `.env.template` avec un commentaire OBLIGATOIRE/OPTIONNEL.
- Les paramètres opérationnels (webhook Discord, mail équipe) vont dans la table `Config` en base, lus via `ConfigService.getValue(key)`. Ils ne doivent **pas** être ajoutés à `src/config/public-config-keys.ts`.
- `@Controller()` est déclaré **sans argument** ; le chemin complet est porté par chaque méthode (`@Get('api/shop/products')`).
- `JwtAuthGuard` est global via `APP_GUARD`. Les routes publiques s'y soustraient avec `@Public()`. `PermissionsGuard` n'est jamais global : `@UseGuards(PermissionsGuard)` + `@RequirePermission(PERMISSIONS.X)` par méthode.
- Les routes publiques touchant la base portent `@Throttle({ default: { limit: 20, ttl: 60000 } })`.
- `PrismaService` est redéclaré comme provider dans chaque module (pas de `PrismaModule` global).
- Le client Prisma s'importe depuis `../../generated/prisma`, jamais `@prisma/client`.
- Erreurs Prisma : utiliser `isPrismaNotFoundError` / `isPrismaForeignKeyError` de `src/common/utils/prisma-errors.ts`, jamais de `findUnique` préalable.
- DTO update : `PartialType` de `@nestjs/mapped-types`, jamais `@nestjs/swagger`.
- Messages de validation et libellés `it(...)` des tests **en français**.
- `ValidationPipe` global avec `whitelist: true, forbidNonWhitelisted: true, transform: true` — tout champ non déclaré au DTO renvoie 400.
- Logger : `private readonly logger = new Logger(MaClasse.name);`. Les erreurs sont narrowées : `const message = error instanceof Error ? error.message : 'Unknown error';`.
- **Les migrations déjà commitées sont immuables.** Toute correction passe par une nouvelle migration.

**Frontend**
- Composants `standalone: true` avec `ChangeDetectionStrategy.OnPush`, dépendances via `inject()`, jamais de constructeur.
- État local en `readonly x = signal(...)`, données exposées par le service en signal readonly.
- Aucun `catchError` dans les services : l'erreur remonte au composant qui affiche un `MatSnackBar`.
- URL API : `${environment.apiUrl}/api/<ressource>` — le `/api` est ajouté par le service, pas par l'environnement.
- Templates en control flow natif (`@if`, `@for (x of y; track x.id)`).
- Modales : Angular Material `MatDialog`, composant standalone à template et styles **inline**.
- Tests : Jasmine + Karma, `provideZonelessChangeDetection()` obligatoire, services remplacés par `jasmine.createSpyObj` (les signals passent par le 3e argument « propriétés »), jamais de mock de `HttpClient` dans les specs de composant.
- Aucun système i18n : libellés en français en dur.

**Sécurité — non négociable**
- Le prix n'est **jamais** lu depuis le corps de la requête client. Il vient toujours du catalogue serveur.
- La commande n'est créée que par le webhook à signature vérifiée, jamais par le retour navigateur.
- Aucun HTML ne transite par l'API vers `[innerHTML]`.

**Commandes**

```bash
# Backend
cd /home/tellebma/DEV/DVG/WEB/backend
npm test                      # jest
npx jest src/shop/xxx.spec.ts # un fichier
npm run lint                  # eslint --max-warnings=0

# Frontend
cd /home/tellebma/DEV/DVG/WEB/frontend
npm test                      # ng test (watch)
npm run test:coverage         # headless + seuils bloquants
npm run lint
```

---

## PR 2 — Socle commandes backend

### Task 1 : Modèle de données Order

**Fichiers :**
- Modifier : `prisma/schema.prisma`
- Créer : `prisma/migrations/<timestamp>_add_order_model/migration.sql` (généré)
- Créer : `prisma/migrations/<timestamp>_add_order_reference_sequence/migration.sql` (manuel)

**Interfaces :**
- Consomme : rien
- Produit : le modèle Prisma `Order` et l'enum `OrderStatus`, importables depuis `../../generated/prisma`. La séquence PostgreSQL `order_reference_seq`.

- [ ] **Étape 1 : Ajouter le modèle au schéma**

Dans `prisma/schema.prisma`, à la suite des modèles existants :

```prisma
model Order {
  id                    Int         @id @default(autoincrement())
  reference             String      @unique
  stripeSessionId       String      @unique
  stripePaymentIntentId String?

  productId             String
  productName           String
  size                  String?
  quantity              Int
  unitPriceCents        Int
  shippingCents         Int
  totalCents            Int
  currency              String      @default("eur")

  customerEmail         String
  customerName          String
  shippingAddress       Json

  status                OrderStatus @default(PAID)
  sentToMerchantAt      DateTime?
  merchantBatchId       String?
  trackingNumber        String?
  adminNote             String?     @db.Text

  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  @@index([status])
  @@index([merchantBatchId])
  @@index([createdAt])
  @@map("orders")
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

- [ ] **Étape 2 : Générer la migration**

```bash
cd /home/tellebma/DEV/DVG/WEB/backend
npx prisma migrate dev --name add_order_model
```

Attendu : création du dossier `prisma/migrations/<timestamp>_add_order_model/` et régénération du client dans `generated/prisma`.

- [ ] **Étape 3 : Créer la séquence de référence**

La référence commande doit être générée sans condition de course : deux webhooks traités en parallèle ne doivent jamais produire la même. Un `COUNT(*)` le ferait — une séquence PostgreSQL non.

Créer le dossier `prisma/migrations/20260722100000_add_order_reference_sequence/` et le fichier `migration.sql` :

```sql
-- Sequence dediee a la generation des references de commande (DVG-AAAA-NNNN).
-- Une sequence garantit l'unicite meme si deux webhooks Stripe sont traites en parallele.
CREATE SEQUENCE IF NOT EXISTS order_reference_seq START WITH 1 INCREMENT BY 1;
```

- [ ] **Étape 4 : Appliquer la migration**

```bash
npx prisma migrate dev
```

Attendu : `Applying migration '20260722100000_add_order_reference_sequence'` puis `Your database is now in sync with your schema.`

- [ ] **Étape 5 : Vérifier que la séquence existe**

```bash
npx prisma db execute --stdin <<< "SELECT nextval('order_reference_seq');"
```

Attendu : la commande s'exécute sans erreur.

- [ ] **Étape 6 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(shop): ajouter le modele Order et la sequence de reference"
```

---

### Task 2 : Catalogue produits et endpoint public

**Fichiers :**
- Créer : `src/shop/shop-catalog.ts`
- Créer : `src/shop/shop-catalog.spec.ts`
- Créer : `src/shop/shop.controller.ts`
- Créer : `src/shop/shop.controller.spec.ts`
- Créer : `src/shop/shop.module.ts`
- Modifier : `src/app.module.ts`

**Interfaces :**
- Consomme : rien
- Produit :
  - `interface ShopProduct { id: string; name: string; priceCents: number; sizes: string[]; descKey: string; images: { front: string; back: string | null }; active: boolean }`
  - `const SHOP_CATALOG: readonly ShopProduct[]`
  - `findActiveProduct(id: string): ShopProduct | undefined`
  - `getActiveProducts(): ShopProduct[]`
  - `GET /api/shop/products`

- [ ] **Étape 1 : Écrire le test du catalogue**

Créer `src/shop/shop-catalog.spec.ts` :

```ts
import { SHOP_CATALOG, findActiveProduct, getActiveProducts } from './shop-catalog';

describe('shop-catalog', () => {
  it('contient les 11 produits du catalogue', () => {
    expect(SHOP_CATALOG).toHaveLength(11);
  });

  it('exprime tous les prix en centimes entiers', () => {
    for (const product of SHOP_CATALOG) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  it("n'a aucun identifiant produit en double", () => {
    const ids = SHOP_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('donne des tailles aux textiles et aucune au tapis de souris', () => {
    expect(findActiveProduct('maillotDvg_2023')?.sizes).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(findActiveProduct('tapisSourisDvg')?.sizes).toEqual([]);
  });

  it('retourne undefined pour un identifiant inconnu', () => {
    expect(findActiveProduct('produit-inexistant')).toBeUndefined();
  });

  it('ne retourne que les produits actifs', () => {
    expect(getActiveProducts().every((p) => p.active)).toBe(true);
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/shop-catalog.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './shop-catalog'`.

- [ ] **Étape 3 : Écrire le catalogue**

Créer `src/shop/shop-catalog.ts`. Les prix reprennent exactement ceux de `frontend/src/app/data/shopping-list.ts`, convertis en centimes. Les `descKey` correspondent aux clés de `DETAILS_SHOP_LIST` côté front — le backend ne transporte que la clé, jamais le HTML.

```ts
export interface ShopProduct {
  id: string;
  name: string;
  priceCents: number;
  sizes: string[];
  descKey: string;
  images: { front: string; back: string | null };
  active: boolean;
}

const TEXTILE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const SHOP_CATALOG: readonly ShopProduct[] = [
  {
    id: 'maillotDvg',
    name: 'MAILLOT 2020',
    priceCents: 3990,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMaillot',
    images: {
      front: 'assets/img/shop/2020_maillot_front_light.png',
      back: 'assets/img/shop/2020_maillot_back_light.png',
    },
    active: true,
  },
  {
    id: 'sweatDvg',
    name: 'HOODIE - TEAM DIVERGENTES',
    priceCents: 3500,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsSweat',
    images: {
      front: 'assets/img/shop/2020_hoodie_front_light.png',
      back: 'assets/img/shop/2020_hoodie_back_light.png',
    },
    active: true,
  },
  {
    id: 'T-shirtDvg',
    name: 'T-SHIRT - TEAM DIVERGENTES',
    priceCents: 2090,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsTshirt',
    images: {
      front: 'assets/img/shop/2020_TShirt_front_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tapisSourisDvg',
    name: 'TAPIS DE SOURIS - TEAM DIVERGENTES',
    priceCents: 1750,
    sizes: [],
    descKey: 'detailsTDS',
    images: { front: 'assets/img/shop/2020_tapis_front_light.png', back: null },
    active: true,
  },
  {
    id: 'maillotDvg_2023',
    name: 'MAILLOT 2023',
    priceCents: 3990,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMaillot2023',
    images: {
      front: 'assets/img/shop/2023_maillot_front_light.png',
      back: 'assets/img/shop/2023_maillot_back_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtMenpo_2023',
    name: 'T-SHIRT MENPŌ',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMenpoTShirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_Menpo_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtYinYang_2023',
    name: 'T-SHIRT YIN YANG',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsYinYangTshirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_YinYang_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtKanji_2023',
    name: 'T-SHIRT KANJI',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsKanjiTshirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_Kanji_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieYinYang_2023',
    name: 'HOODIE YIN YANG',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieYinYang',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_YinYang_light.png',
      back: 'assets/img/shop/2023_hoodie_back_YinYang_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieSnake_2023',
    name: 'HOODIE SNAKE',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieSnake',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_Snake_light.png',
      back: 'assets/img/shop/2023_hoodie_back_Snake_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieMenpo_2023',
    name: 'HOODIE MENPŌ',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieMenpo',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_Menpo_light.png',
      back: 'assets/img/shop/2023_hoodie_back_Menpo_light.png',
    },
    active: true,
  },
];

export function getActiveProducts(): ShopProduct[] {
  return SHOP_CATALOG.filter((product) => product.active);
}

export function findActiveProduct(id: string): ShopProduct | undefined {
  return SHOP_CATALOG.find((product) => product.id === id && product.active);
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/shop-catalog.spec.ts
```

Attendu : 6 specs PASS.

- [ ] **Étape 5 : Écrire le test du controller**

Créer `src/shop/shop.controller.spec.ts` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';

describe('ShopController', () => {
  let controller: ShopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
    }).compile();
    controller = module.get<ShopController>(ShopController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('getProducts', () => {
    it('retourne les 11 produits actifs du catalogue', () => {
      expect(controller.getProducts()).toHaveLength(11);
    });

    it('expose descKey mais aucun contenu HTML', () => {
      const [product] = controller.getProducts();
      expect(product.descKey).toBeDefined();
      expect(JSON.stringify(product)).not.toContain('<');
    });
  });
});
```

- [ ] **Étape 6 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/shop.controller.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './shop.controller'`.

- [ ] **Étape 7 : Écrire le controller**

Créer `src/shop/shop.controller.ts` :

```ts
import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ShopProduct, getActiveProducts } from './shop-catalog';

@Controller()
export class ShopController {
  @Get('api/shop/products')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getProducts(): ShopProduct[] {
    return getActiveProducts();
  }
}
```

- [ ] **Étape 8 : Créer le module**

Créer `src/shop/shop.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';

@Module({
  controllers: [ShopController],
})
export class ShopModule {}
```

Puis l'enregistrer dans `src/app.module.ts` : ajouter `import { ShopModule } from './shop/shop.module';` en tête et `ShopModule` au tableau `imports`.

- [ ] **Étape 9 : Lancer les tests**

```bash
npx jest src/shop
```

Attendu : 9 specs PASS.

- [ ] **Étape 10 : Commit**

```bash
git add src/shop src/app.module.ts
git commit -m "feat(shop): exposer le catalogue produits sur GET /api/shop/products"
```

---

### Task 3 : Création de la session de paiement Stripe

**Fichiers :**
- Modifier : `package.json` (dépendance `stripe`)
- Modifier : `.env.template`
- Créer : `src/shop/stripe.service.ts`
- Créer : `src/shop/dto/create-checkout.dto.ts`
- Créer : `src/shop/dto/create-checkout.dto.spec.ts`
- Créer : `src/shop/shop-checkout.service.ts`
- Créer : `src/shop/shop-checkout.service.spec.ts`
- Modifier : `src/shop/shop.controller.ts`, `src/shop/shop.controller.spec.ts`, `src/shop/shop.module.ts`

**Interfaces :**
- Consomme : `findActiveProduct` (Task 2)
- Produit :
  - `StripeService.createCheckoutSession(params: CheckoutSessionParams): Promise<{ id: string; url: string }>` où `CheckoutSessionParams = { productName: string; unitPriceCents: number; quantity: number; metadata: Record<string, string> }`
  - `StripeService.constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event` (utilisé en Task 4)
  - `ShopCheckoutService.createCheckout(dto: CreateCheckoutDto): Promise<{ url: string }>`
  - `CreateCheckoutDto { productId: string; size?: string; quantity: number }`
  - `POST /api/shop/checkout`

- [ ] **Étape 1 : Installer le SDK Stripe**

```bash
cd /home/tellebma/DEV/DVG/WEB/backend
npm install stripe
```

- [ ] **Étape 2 : Documenter les variables d'environnement**

Ajouter à la fin de `.env.template` :

```
# Boutique / Stripe
# OBLIGATOIRE si la boutique est activee : cle secrete API Stripe (sk_test_... ou sk_live_...)
STRIPE_SECRET_KEY=
# OBLIGATOIRE si la boutique est activee : secret de signature du webhook (whsec_...)
STRIPE_WEBHOOK_SECRET=
# OBLIGATOIRE si la boutique est activee : identifiant du tarif de port forfaitaire cree dans Stripe (shr_...)
STRIPE_SHIPPING_RATE_ID=
# OPTIONNEL : URL de retour apres paiement reussi (defaut http://localhost:4200/boutique/merci)
SHOP_SUCCESS_URL=
# OPTIONNEL : URL de retour apres annulation (defaut http://localhost:4200/boutique)
SHOP_CANCEL_URL=
```

- [ ] **Étape 3 : Écrire le test du DTO**

Créer `src/shop/dto/create-checkout.dto.spec.ts` :

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCheckoutDto } from './create-checkout.dto';

const validBase = { productId: 'maillotDvg_2023', size: 'M', quantity: 1 };

describe('CreateCheckoutDto', () => {
  it('accepte un payload valide', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepte un payload sans taille (produit sans déclinaison)', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { productId: 'tapisSourisDvg', quantity: 1 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('refuse une quantité nulle', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase, quantity: 0 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse une quantité supérieure à 10', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase, quantity: 11 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse un productId absent', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { size: 'M', quantity: 1 });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/dto/create-checkout.dto.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './create-checkout.dto'`.

- [ ] **Étape 5 : Écrire le DTO**

Créer `src/shop/dto/create-checkout.dto.ts` :

```ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Le produit est obligatoire' })
  @MaxLength(100, { message: "L'identifiant produit ne peut pas dépasser 100 caractères" })
  productId: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'La taille ne peut pas dépasser 10 caractères' })
  size?: string;

  @IsInt({ message: 'La quantité doit être un entier' })
  @Min(1, { message: 'La quantité minimum est 1' })
  @Max(10, { message: 'La quantité maximum est 10' })
  quantity: number;
}
```

Le `ValidationPipe` global ayant `forbidNonWhitelisted: true`, tout champ supplémentaire — un `price` envoyé par un client malveillant, par exemple — provoque un 400 avant d'atteindre le service.

- [ ] **Étape 6 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/dto/create-checkout.dto.spec.ts
```

Attendu : 5 specs PASS.

- [ ] **Étape 7 : Écrire le service Stripe**

Ce service est une fine enveloppe autour du SDK : il isole l'appel réseau pour que `ShopCheckoutService` soit testable sans toucher à Stripe.

Créer `src/shop/stripe.service.ts` :

```ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface CheckoutSessionParams {
  productName: string;
  unitPriceCents: number;
  quantity: number;
  metadata: Record<string, string>;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  private getClient(): Stripe {
    if (!this.client) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        this.logger.error('STRIPE_SECRET_KEY absente : la boutique ne peut pas fonctionner');
        throw new InternalServerErrorException('Paiement indisponible');
      }
      this.client = new Stripe(secretKey);
    }
    return this.client;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ id: string; url: string }> {
    const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID;
    const successUrl = process.env.SHOP_SUCCESS_URL ?? 'http://localhost:4200/boutique/merci';
    const cancelUrl = process.env.SHOP_CANCEL_URL ?? 'http://localhost:4200/boutique';

    const session = await this.getClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: params.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: params.unitPriceCents,
            product_data: { name: params.productName },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU', 'DE', 'ES', 'IT'] },
      ...(shippingRateId ? { shipping_options: [{ shipping_rate: shippingRateId }] } : {}),
      metadata: params.metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Session de paiement invalide');
    }
    return { id: session.id, url: session.url };
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET absente : les webhooks ne peuvent pas être vérifiés');
      throw new InternalServerErrorException('Webhook non configuré');
    }
    return this.getClient().webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
```

- [ ] **Étape 8 : Écrire le test du service de checkout**

C'est le test le plus important de cette tâche : il verrouille le fait que le prix vient du serveur.

Créer `src/shop/shop-checkout.service.spec.ts` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopCheckoutService } from './shop-checkout.service';
import { StripeService } from './stripe.service';

describe('ShopCheckoutService', () => {
  let service: ShopCheckoutService;

  const mockStripe = { createCheckoutSession: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopCheckoutService, { provide: StripeService, useValue: mockStripe }],
    }).compile();
    service = module.get<ShopCheckoutService>(ShopCheckoutService);
  });

  describe('createCheckout', () => {
    it("utilise le prix du catalogue serveur et ignore tout prix envoyé par le client", async () => {
      mockStripe.createCheckoutSession.mockResolvedValue({ id: 'cs_1', url: 'https://stripe/cs_1' });

      // Le DTO n'expose pas de prix, mais on simule un client hostile qui en injecterait un.
      await service.createCheckout({
        productId: 'maillotDvg_2023',
        size: 'M',
        quantity: 1,
        priceCents: 1,
      } as never);

      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ unitPriceCents: 3990 }),
      );
    });

    it('transmet le produit, la taille et la quantité en métadonnées', async () => {
      mockStripe.createCheckoutSession.mockResolvedValue({ id: 'cs_1', url: 'https://stripe/cs_1' });

      await service.createCheckout({ productId: 'maillotDvg_2023', size: 'L', quantity: 2 });

      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 2,
          metadata: expect.objectContaining({
            productId: 'maillotDvg_2023',
            size: 'L',
            quantity: '2',
          }),
        }),
      );
    });

    it("retourne l'URL de paiement renvoyée par Stripe", async () => {
      mockStripe.createCheckoutSession.mockResolvedValue({ id: 'cs_1', url: 'https://stripe/cs_1' });

      const result = await service.createCheckout({
        productId: 'tapisSourisDvg',
        quantity: 1,
      });

      expect(result).toEqual({ url: 'https://stripe/cs_1' });
    });

    it('lève BadRequestException pour un produit inconnu', async () => {
      await expect(
        service.createCheckout({ productId: 'inconnu', size: 'M', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockStripe.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("lève BadRequestException si la taille n'est pas au catalogue", async () => {
      await expect(
        service.createCheckout({ productId: 'maillotDvg_2023', size: 'XXXL', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockStripe.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si une taille est requise mais absente', async () => {
      await expect(
        service.createCheckout({ productId: 'maillotDvg_2023', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si une taille est fournie pour un produit sans taille', async () => {
      await expect(
        service.createCheckout({ productId: 'tapisSourisDvg', size: 'M', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Étape 9 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/shop-checkout.service.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './shop-checkout.service'`.

- [ ] **Étape 10 : Écrire le service de checkout**

Créer `src/shop/shop-checkout.service.ts` :

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { findActiveProduct } from './shop-catalog';
import { StripeService } from './stripe.service';

@Injectable()
export class ShopCheckoutService {
  constructor(private readonly stripe: StripeService) {}

  async createCheckout(dto: CreateCheckoutDto): Promise<{ url: string }> {
    const product = findActiveProduct(dto.productId);
    if (!product) {
      throw new BadRequestException('Produit introuvable ou indisponible');
    }

    const requiresSize = product.sizes.length > 0;
    if (requiresSize && !dto.size) {
      throw new BadRequestException('La taille est obligatoire pour ce produit');
    }
    if (!requiresSize && dto.size) {
      throw new BadRequestException('Ce produit ne se décline pas en tailles');
    }
    if (dto.size && !product.sizes.includes(dto.size)) {
      throw new BadRequestException('Taille indisponible pour ce produit');
    }

    // Le prix vient du catalogue serveur, jamais de la requête.
    const session = await this.stripe.createCheckoutSession({
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: dto.quantity,
      metadata: {
        productId: product.id,
        productName: product.name,
        size: dto.size ?? '',
        quantity: String(dto.quantity),
        unitPriceCents: String(product.priceCents),
      },
    });

    return { url: session.url };
  }
}
```

- [ ] **Étape 11 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/shop-checkout.service.spec.ts
```

Attendu : 7 specs PASS.

- [ ] **Étape 12 : Exposer la route**

Dans `src/shop/shop.controller.ts`, ajouter les imports et la méthode :

```ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopProduct, getActiveProducts } from './shop-catalog';

@Controller()
export class ShopController {
  constructor(private readonly checkoutService: ShopCheckoutService) {}

  @Get('api/shop/products')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getProducts(): ShopProduct[] {
    return getActiveProducts();
  }

  @Post('api/shop/checkout')
  @Public()
  // Limite basse : créer une session de paiement appelle Stripe, c'est coûteux et abusable.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createCheckout(@Body() dto: CreateCheckoutDto): Promise<{ url: string }> {
    return this.checkoutService.createCheckout(dto);
  }
}
```

Mettre à jour `src/shop/shop.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [ShopController],
  providers: [ShopCheckoutService, StripeService],
})
export class ShopModule {}
```

- [ ] **Étape 13 : Mettre à jour le spec du controller**

Dans `src/shop/shop.controller.spec.ts`, le controller a maintenant une dépendance. Remplacer le `beforeEach` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';

describe('ShopController', () => {
  let controller: ShopController;

  const mockCheckoutService = { createCheckout: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [{ provide: ShopCheckoutService, useValue: mockCheckoutService }],
    }).compile();
    controller = module.get<ShopController>(ShopController);
  });
```

Puis ajouter un spec :

```ts
  describe('createCheckout', () => {
    it('délègue au service et retourne son résultat', async () => {
      mockCheckoutService.createCheckout.mockResolvedValue({ url: 'https://stripe/cs_1' });
      const dto = { productId: 'maillotDvg_2023', size: 'M', quantity: 1 };

      await expect(controller.createCheckout(dto)).resolves.toEqual({
        url: 'https://stripe/cs_1',
      });
      expect(mockCheckoutService.createCheckout).toHaveBeenCalledWith(dto);
    });
  });
```

- [ ] **Étape 14 : Lancer tous les tests du module**

```bash
npx jest src/shop
```

Attendu : tous les specs PASS.

- [ ] **Étape 15 : Commit**

```bash
git add package.json package-lock.json .env.template src/shop
git commit -m "feat(shop): creer la session de paiement Stripe avec prix recalcule serveur"
```

---

### Task 4 : Webhook Stripe et création de la commande

**Fichiers :**
- Modifier : `src/main.ts`
- Créer : `src/shop/order-reference.service.ts`
- Créer : `src/shop/shop-webhook.service.ts`
- Créer : `src/shop/shop-webhook.service.spec.ts`
- Modifier : `src/shop/shop.controller.ts`, `src/shop/shop.controller.spec.ts`, `src/shop/shop.module.ts`

**Interfaces :**
- Consomme : `StripeService.constructWebhookEvent` (Task 3), le modèle `Order` (Task 1)
- Produit :
  - `OrderReferenceService.generate(): Promise<string>` → `"DVG-2026-0042"`
  - `ShopWebhookService.handleEvent(payload: Buffer, signature: string): Promise<void>`
  - `POST /api/shop/webhook`

- [ ] **Étape 1 : Activer le corps brut des requêtes**

La vérification de signature Stripe calcule un HMAC sur les octets exacts du corps. Si NestJS parse le JSON avant, la signature ne correspond plus.

Dans `src/main.ts`, ligne 10, remplacer :

```ts
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
```

par :

```ts
  // rawBody: necessaire a la verification de signature des webhooks Stripe,
  // qui calcule un HMAC sur les octets exacts du corps de la requete.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
```

- [ ] **Étape 2 : Écrire le service de génération de référence**

Créer `src/shop/order-reference.service.ts` :

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrderReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genere une reference unique de la forme DVG-AAAA-NNNN.
   * S'appuie sur une sequence PostgreSQL : deux webhooks traites en parallele
   * ne peuvent pas obtenir le meme numero.
   */
  async generate(): Promise<string> {
    const rows = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('order_reference_seq')`;
    const sequence = Number(rows[0].nextval);
    const year = new Date().getFullYear();
    return `DVG-${year}-${String(sequence).padStart(4, '0')}`;
  }
}
```

- [ ] **Étape 3 : Écrire le test du webhook**

Créer `src/shop/shop-webhook.service.spec.ts` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopWebhookService } from './shop-webhook.service';
import { StripeService } from './stripe.service';
import { OrderReferenceService } from './order-reference.service';
import { ShopNotifierService } from './shop-notifier.service';
import { PrismaService } from '../prisma.service';

describe('ShopWebhookService', () => {
  let service: ShopWebhookService;

  const mockStripe = { constructWebhookEvent: jest.fn() };
  const mockPrisma = { order: { create: jest.fn() } };
  const mockReference = { generate: jest.fn() };
  const mockNotifier = { notifyNewOrder: jest.fn() };

  const payload = Buffer.from('{}');
  const signature = 't=1,v1=abc';

  const completedEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: 'pi_test_1',
        amount_total: 4390,
        currency: 'eur',
        customer_details: {
          email: 'client@example.com',
          name: 'Jean Dupont',
        },
        shipping_cost: { amount_total: 400 },
        // Stripe expose l'adresse sous collected_information depuis l'API 2025+
        collected_information: {
          shipping_details: {
            name: 'Jean Dupont',
            address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
          },
        },
        metadata: {
          productId: 'maillotDvg_2023',
          productName: 'MAILLOT 2023',
          size: 'M',
          quantity: '1',
          unitPriceCents: '3990',
        },
      },
    },
  };

  const createdOrder = { id: 1, reference: 'DVG-2026-0001', customerEmail: 'client@example.com' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopWebhookService,
        { provide: StripeService, useValue: mockStripe },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderReferenceService, useValue: mockReference },
        { provide: ShopNotifierService, useValue: mockNotifier },
      ],
    }).compile();
    service = module.get<ShopWebhookService>(ShopWebhookService);
  });

  it('rejette un événement à signature invalide sans rien écrire', async () => {
    mockStripe.constructWebhookEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    await expect(service.handleEvent(payload, signature)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
  });

  it('ignore les événements autres que checkout.session.completed', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue({ type: 'payment_intent.created', data: {} });

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it('crée la commande à partir des métadonnées de la session', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0001');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: 'DVG-2026-0001',
        stripeSessionId: 'cs_test_1',
        stripePaymentIntentId: 'pi_test_1',
        productId: 'maillotDvg_2023',
        productName: 'MAILLOT 2023',
        size: 'M',
        quantity: 1,
        unitPriceCents: 3990,
        shippingCents: 400,
        totalCents: 4390,
        customerEmail: 'client@example.com',
        customerName: 'Jean Dupont',
        status: 'PAID',
      }),
    });
  });

  it('enregistre size à null pour un produit sans taille', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue({
      ...completedEvent,
      data: {
        object: {
          ...completedEvent.data.object,
          metadata: { ...completedEvent.data.object.metadata, size: '' },
        },
      },
    });
    mockReference.generate.mockResolvedValue('DVG-2026-0002');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ size: null }),
    });
  });

  it("absorbe un rejeu : une violation d'unicité ne remonte pas d'erreur", async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0003');
    mockPrisma.order.create.mockRejectedValue({ code: 'P2002', meta: { target: ['stripeSessionId'] } });

    await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
    expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
  });

  it('notifie après création réussie', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0004');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockNotifier.notifyNewOrder).toHaveBeenCalledWith(createdOrder);
  });

  it("n'échoue pas si la notification échoue : la commande est déjà payée", async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0005');
    mockPrisma.order.create.mockResolvedValue(createdOrder);
    mockNotifier.notifyNewOrder.mockRejectedValue(new Error('Discord indisponible'));

    await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
  });
});
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/shop-webhook.service.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './shop-webhook.service'`.

- [ ] **Étape 5 : Écrire le service webhook**

Créer `src/shop/shop-webhook.service.ts` :

```ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { OrderReferenceService } from './order-reference.service';
import { ShopNotifierService } from './shop-notifier.service';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

@Injectable()
export class ShopWebhookService {
  private readonly logger = new Logger(ShopWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly reference: OrderReferenceService,
    private readonly notifier: ShopNotifierService,
  ) {}

  async handleEvent(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Surface d'attaque principale : sans cette verification, n'importe qui
      // pourrait creer des commandes marquees payees.
      this.logger.warn(`Webhook Stripe a signature invalide rejete: ${message}`);
      throw new BadRequestException('Signature invalide');
    }

    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const order = await this.createOrder(session);
    if (!order) {
      return;
    }

    // Une notification en echec ne doit jamais annuler une commande deja payee.
    try {
      await this.notifier.notifyNewOrder(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Notification de la commande ${order.reference} en echec: ${message}`);
    }
  }

  private async createOrder(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    const quantity = Number(metadata.quantity ?? '1');
    const unitPriceCents = Number(metadata.unitPriceCents ?? '0');
    const shippingCents = session.shipping_cost?.amount_total ?? 0;

    const shipping = (
      session as unknown as {
        collected_information?: { shipping_details?: Record<string, unknown> };
      }
    ).collected_information?.shipping_details;

    try {
      return await this.prisma.order.create({
        data: {
          reference: await this.reference.generate(),
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          productId: metadata.productId ?? 'inconnu',
          productName: metadata.productName ?? 'Produit inconnu',
          size: metadata.size ? metadata.size : null,
          quantity,
          unitPriceCents,
          shippingCents,
          totalCents: session.amount_total ?? unitPriceCents * quantity + shippingCents,
          currency: session.currency ?? 'eur',
          customerEmail: session.customer_details?.email ?? '',
          customerName: session.customer_details?.name ?? '',
          shippingAddress: (shipping ?? {}) as object,
          status: 'PAID',
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Stripe rejoue ses webhooks : un doublon est un succes, pas une erreur.
        this.logger.log(`Webhook rejoue pour la session ${session.id}, commande deja creee`);
        return null;
      }
      throw error;
    }
  }
}
```

- [ ] **Étape 6 : Créer un stub du notifier pour débloquer les tests**

`ShopNotifierService` est implémenté en Task 5. Créer maintenant `src/shop/shop-notifier.service.ts` avec la signature définitive et un corps vide :

```ts
import { Injectable } from '@nestjs/common';
import { Order } from '../../generated/prisma';

@Injectable()
export class ShopNotifierService {
  // Implementation complete en Task 5.
  async notifyNewOrder(_order: Order): Promise<void> {
    return Promise.resolve();
  }
}
```

- [ ] **Étape 7 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/shop-webhook.service.spec.ts
```

Attendu : 7 specs PASS.

- [ ] **Étape 8 : Exposer la route webhook**

Dans `src/shop/shop.controller.ts`, ajouter :

```ts
import {
  BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ShopWebhookService } from './shop-webhook.service';
```

Injecter le service dans le constructeur :

```ts
  constructor(
    private readonly checkoutService: ShopCheckoutService,
    private readonly webhookService: ShopWebhookService,
  ) {}
```

Puis la méthode :

```ts
  @Post('api/shop/webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    if (!signature || !request.rawBody) {
      throw new BadRequestException('Signature manquante');
    }
    await this.webhookService.handleEvent(request.rawBody, signature);
    return { received: true };
  }
```

Enregistrer les nouveaux providers dans `src/shop/shop.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { ShopNotifierService } from './shop-notifier.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ShopController],
  providers: [
    ShopCheckoutService,
    ShopWebhookService,
    ShopNotifierService,
    OrderReferenceService,
    StripeService,
    PrismaService,
  ],
})
export class ShopModule {}
```

- [ ] **Étape 9 : Mettre à jour le spec du controller**

Dans `src/shop/shop.controller.spec.ts`, ajouter le mock du service webhook aux providers :

```ts
  const mockWebhookService = { handleEvent: jest.fn() };
```

```ts
      providers: [
        { provide: ShopCheckoutService, useValue: mockCheckoutService },
        { provide: ShopWebhookService, useValue: mockWebhookService },
      ],
```

Et le spec :

```ts
  describe('handleWebhook', () => {
    it('rejette une requête sans en-tête de signature', async () => {
      const request = { rawBody: Buffer.from('{}') } as never;
      await expect(controller.handleWebhook(request, undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockWebhookService.handleEvent).not.toHaveBeenCalled();
    });

    it('transmet le corps brut et la signature au service', async () => {
      const rawBody = Buffer.from('{"id":"evt_1"}');
      const request = { rawBody } as never;

      await expect(controller.handleWebhook(request, 'sig')).resolves.toEqual({ received: true });
      expect(mockWebhookService.handleEvent).toHaveBeenCalledWith(rawBody, 'sig');
    });
  });
```

Ajouter l'import `import { BadRequestException } from '@nestjs/common';` en tête du spec.

- [ ] **Étape 10 : Lancer tous les tests du module**

```bash
npx jest src/shop && npm run lint
```

Attendu : tous les specs PASS, lint sans warning.

- [ ] **Étape 11 : Commit**

```bash
git add src/main.ts src/shop
git commit -m "feat(shop): creer la commande depuis le webhook Stripe signe et idempotent"
```

---

### Task 5 : Notifications Discord et e-mail équipe

**Fichiers :**
- Remplacer : `src/shop/shop-notifier.service.ts`
- Créer : `src/shop/shop-notifier.service.spec.ts`
- Modifier : `src/shop/shop.module.ts`

**Interfaces :**
- Consomme : le modèle `Order` (Task 1), `ConfigService` de `src/config/config.service.ts`
- Produit : `ShopNotifierService.notifyNewOrder(order: Order): Promise<void>`, plus les helpers purs exportés `buildOrderEmailHtml(order)`, `buildOrderEmailText(order)`, `buildOrderDiscordEmbed(order)`, `formatEuros(cents)`, `formatAddress(address)`

Ce service suit le pattern de `src/recruitment/services/application-notifier.service.ts` : une classe fine qui ne fait que l'I/O, et des helpers purs exportés hors de la classe — testables sans aucun mock.

- [ ] **Étape 1 : Créer les clés de configuration en base**

Les paramètres opérationnels vivent dans la table `Config`, comme `contact_discord_webhook`. Créer le dossier `prisma/migrations/20260722110000_add_shop_config_keys/` et son `migration.sql` :

```sql
-- Cles de configuration de la boutique, editables depuis l'admin.
-- Volontairement absentes de public-config-keys.ts : ne doivent pas etre exposees publiquement.
INSERT INTO config (key, value, "createdAt", "updatedAt")
VALUES
  ('shop_discord_webhook', '', NOW(), NOW()),
  ('shop_team_email', '', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
```

Vérifier au préalable les noms de colonnes réels de la table `config` :

```bash
npx prisma db execute --stdin <<< "\d config"
```

Adapter le SQL si les colonnes diffèrent (par exemple `created_at` au lieu de `"createdAt"`), puis appliquer :

```bash
npx prisma migrate dev
```

- [ ] **Étape 2 : Écrire le test des helpers purs**

Créer `src/shop/shop-notifier.service.spec.ts` :

```ts
import {
  buildOrderDiscordEmbed,
  buildOrderEmailHtml,
  buildOrderEmailText,
  formatAddress,
  formatEuros,
} from './shop-notifier.service';

const order = {
  id: 1,
  reference: 'DVG-2026-0042',
  productName: 'MAILLOT 2023',
  size: 'M',
  quantity: 2,
  unitPriceCents: 3990,
  shippingCents: 400,
  totalCents: 8380,
  customerEmail: 'client@example.com',
  customerName: 'Jean Dupont',
  shippingAddress: {
    name: 'Jean Dupont',
    address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
  },
} as never;

describe('shop-notifier helpers', () => {
  describe('formatEuros', () => {
    it('convertit les centimes en euros avec deux décimales', () => {
      expect(formatEuros(3990)).toBe('39.90');
      expect(formatEuros(1750)).toBe('17.50');
      expect(formatEuros(0)).toBe('0.00');
    });
  });

  describe('formatAddress', () => {
    it('assemble les composants de l’adresse sur une ligne', () => {
      expect(formatAddress(order.shippingAddress)).toBe('1 rue du Test, 75001 Paris, FR');
    });

    it('retourne un libellé explicite si l’adresse est absente', () => {
      expect(formatAddress(null)).toBe('Adresse non renseignée');
      expect(formatAddress({})).toBe('Adresse non renseignée');
    });
  });

  describe('buildOrderEmailText', () => {
    it('contient la référence, le produit, la taille et le total', () => {
      const text = buildOrderEmailText(order);
      expect(text).toContain('DVG-2026-0042');
      expect(text).toContain('MAILLOT 2023');
      expect(text).toContain('M');
      expect(text).toContain('83.80');
    });
  });

  describe('buildOrderEmailHtml', () => {
    it('échappe le HTML présent dans les données client', () => {
      const hostile = { ...order, customerName: '<script>alert(1)</script>' } as never;
      const html = buildOrderEmailHtml(hostile);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('buildOrderDiscordEmbed', () => {
    it('construit un embed avec le titre et les champs attendus', () => {
      const embed = buildOrderDiscordEmbed(order);
      expect(embed.title).toContain('DVG-2026-0042');
      expect(embed.color).toBe(0x32d299);
      const names = embed.fields.map((f) => f.name);
      expect(names).toEqual(
        expect.arrayContaining(['Produit', 'Client', 'Total', 'Adresse de livraison']),
      );
    });
  });
});
```

- [ ] **Étape 3 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/shop-notifier.service.spec.ts
```

Attendu : ÉCHEC — les helpers ne sont pas exportés.

- [ ] **Étape 4 : Écrire le service et ses helpers**

Remplacer intégralement `src/shop/shop-notifier.service.ts` :

```ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Order } from '../../generated/prisma';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ShopNotifierService {
  private readonly logger = new Logger(ShopNotifierService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Notifie l'equipe d'une nouvelle commande payee, par mail et sur Discord.
   * Chaque canal a son propre try/catch : un canal en echec n'empeche pas l'autre.
   * La methode ne rejette que si les deux canaux echouent.
   */
  async notifyNewOrder(order: Order): Promise<void> {
    const results = { email: false, discord: false };

    try {
      await this.sendEmail(order);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Mail de commande ${order.reference} en echec: ${message}`);
    }

    try {
      await this.sendDiscord(order);
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook Discord pour ${order.reference} en echec: ${message}`);
    }

    if (!results.email && !results.discord) {
      throw new Error(`Aucune notification envoyee pour la commande ${order.reference}`);
    }
    if (!results.email || !results.discord) {
      const failed = !results.email ? 'email' : 'Discord';
      this.logger.warn(`Commande ${order.reference} enregistree mais notification ${failed} en echec`);
    }
  }

  private async sendEmail(order: Order): Promise<void> {
    const [host, port, user, pass, recipient] = await Promise.all([
      this.config.getValue('contact_smtp_host'),
      this.config.getValue('contact_smtp_port'),
      this.config.getValue('contact_smtp_user'),
      this.config.getValue('contact_smtp_pass'),
      this.config.getValue('shop_team_email'),
    ]);

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing in database');
    }
    const to = recipient || user;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '587', 10),
      secure: port === '465',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to,
      subject: `Nouvelle commande boutique ${order.reference}`,
      text: buildOrderEmailText(order),
      html: buildOrderEmailHtml(order),
    });
  }

  private async sendDiscord(order: Order): Promise<void> {
    const webhookUrl = await this.config.getValue('shop_discord_webhook');
    if (!webhookUrl) {
      throw new Error('Discord webhook not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [buildOrderDiscordEmbed(order)] }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Discord webhook responded ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Pure helper functions (no DI)

export function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface StripeAddress {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export function formatAddress(shippingAddress: unknown): string {
  const address = (shippingAddress as { address?: StripeAddress } | null)?.address;
  if (!address?.line1) {
    return 'Adresse non renseignée';
  }
  const locality = [address.postal_code, address.city].filter(Boolean).join(' ');
  return [address.line1, address.line2, locality, address.country].filter(Boolean).join(', ');
}

function describeItem(order: Order): string {
  const size = order.size ? ` — taille ${order.size}` : '';
  return `${order.productName}${size} × ${order.quantity}`;
}

export function buildOrderEmailText(order: Order): string {
  return [
    `Nouvelle commande ${order.reference}`,
    '',
    `Produit  : ${describeItem(order)}`,
    `Client   : ${order.customerName} <${order.customerEmail}>`,
    `Adresse  : ${formatAddress(order.shippingAddress)}`,
    `Port     : ${formatEuros(order.shippingCents)} €`,
    `Total    : ${formatEuros(order.totalCents)} €`,
  ].join('\n');
}

export function buildOrderEmailHtml(order: Order): string {
  const row = (label: string, value: string): string =>
    `<tr><td style="padding:4px 12px 4px 0;"><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`;

  return `<h2>Nouvelle commande ${escapeHtml(order.reference)}</h2>
<table>
${row('Produit', describeItem(order))}
${row('Client', `${order.customerName} <${order.customerEmail}>`)}
${row('Adresse', formatAddress(order.shippingAddress))}
${row('Port', `${formatEuros(order.shippingCents)} €`)}
${row('Total', `${formatEuros(order.totalCents)} €`)}
</table>`;
}

export interface DiscordEmbed {
  title: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
}

export function buildOrderDiscordEmbed(order: Order): DiscordEmbed {
  return {
    title: `🛒 Nouvelle commande ${order.reference}`,
    color: 0x32d299,
    fields: [
      { name: 'Produit', value: describeItem(order) },
      { name: 'Client', value: `${order.customerName} (${order.customerEmail})` },
      { name: 'Total', value: `${formatEuros(order.totalCents)} €`, inline: true },
      { name: 'Adresse de livraison', value: formatAddress(order.shippingAddress) },
    ],
  };
}
```

- [ ] **Étape 5 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/shop-notifier.service.spec.ts
```

Attendu : 8 specs PASS.

- [ ] **Étape 6 : Brancher ConfigModule**

`ShopNotifierService` dépend de `ConfigService`. Dans `src/shop/shop.module.ts`, ajouter l'import du module :

```ts
import { ConfigModule } from '../config/config.module';
```

et l'ajouter au décorateur :

```ts
@Module({
  imports: [ConfigModule],
  controllers: [ShopController],
  // providers inchanges
})
```

- [ ] **Étape 7 : Lancer tous les tests**

```bash
npx jest src/shop && npm run lint
```

Attendu : tous PASS, lint sans warning.

- [ ] **Étape 8 : Vérification manuelle de bout en bout**

C'est le point où la chaîne se valide réellement. Sans cette étape, on ne sait pas si le webhook fonctionne.

```bash
# Terminal 1 : lancer le backend
cd /home/tellebma/DEV/DVG/WEB/backend
npm run start:dev

# Terminal 2 : rediriger les webhooks Stripe en local
stripe listen --forward-to localhost:3000/api/shop/webhook
```

Le CLI affiche un secret `whsec_...` : le placer dans `.env` sous `STRIPE_WEBHOOK_SECRET`, puis redémarrer le backend.

Créer une session de paiement :

```bash
curl -X POST http://localhost:3000/api/shop/checkout \
  -H 'Content-Type: application/json' \
  -d '{"productId":"maillotDvg_2023","size":"M","quantity":1}'
```

Ouvrir l'URL retournée, payer avec la carte de test `4242 4242 4242 4242` (date future, CVC quelconque).

Vérifier ensuite :

```bash
npx prisma studio   # la commande doit apparaitre dans la table orders, statut PAID
```

Contrôler que la référence est de la forme `DVG-2026-0001`, que l'adresse de livraison est remplie, et que le montant correspond bien à 39,90 € plus le port.

Tester enfin l'idempotence — rejouer l'événement depuis le dashboard Stripe (« Renvoyer ») et vérifier qu'**aucune deuxième commande** n'apparaît.

Tester le rejet de signature :

```bash
curl -i -X POST http://localhost:3000/api/shop/webhook \
  -H 'stripe-signature: t=1,v1=faux' \
  -H 'Content-Type: application/json' \
  -d '{"type":"checkout.session.completed"}'
```

Attendu : `HTTP/1.1 400 Bad Request` et aucune commande créée.

- [ ] **Étape 9 : Commit et ouverture de la PR 2**

```bash
git add prisma/migrations src/shop
git commit -m "feat(shop): notifier l'equipe par mail et Discord a chaque commande payee"
git push -u origin feat/shop-backend
gh pr create --base develop --title "feat(shop): socle commandes backend (Stripe + webhook + notifications)" --body "$(cat <<'EOF'
Premiere brique de la solution de commande temporaire. Aucun changement visible cote
public : la page boutique n'est pas encore branchee.

## Contenu

- Modele `Order` + enum `OrderStatus` + sequence PostgreSQL pour les references
- Catalogue produits serveur (11 produits) expose sur `GET /api/shop/products`
- `POST /api/shop/checkout` : cree une Stripe Checkout Session avec le prix
  **recalcule cote serveur**, jamais celui envoye par le client
- `POST /api/shop/webhook` : signature verifiee, creation de commande idempotente
  sur `stripeSessionId`
- Notifications Discord + mail equipe, sans jamais faire echouer une commande payee

## Verifie manuellement

- Paiement de bout en bout en mode test Stripe
- Rejeu de webhook : aucune commande en double
- Signature invalide : 400, aucune ecriture

Spec : `docs/superpowers/specs/2026-07-22-boutique-commandes-temporaire-design.md`

https://claude.ai/code/session_016wgAvfhXFiX7HFnnhnUMw1
EOF
)"
```

---

## PR 3 — Admin commandes

### Task 6 : Permissions commandes

**Fichiers :**
- Modifier : `src/common/constants/permissions.ts`
- Créer : `prisma/migrations/<timestamp>_add_commandes_permissions/migration.sql`

**Interfaces :**
- Consomme : rien
- Produit : `PERMISSIONS.COMMANDES_READ` (`'commandes:read'`), `PERMISSIONS.COMMANDES_WRITE` (`'commandes:write'`)

- [ ] **Étape 1 : Déclarer les permissions**

Dans `src/common/constants/permissions.ts`, ajouter à l'objet `PERMISSIONS` :

```ts
  COMMANDES_READ: 'commandes:read',
  COMMANDES_WRITE: 'commandes:write',
```

Il n'y a volontairement **pas** de `commandes:delete` : une commande payée ne se supprime pas, elle passe en `CANCELLED`.

Puis les rattacher dans `ROLE_PERMISSIONS`. Le rôle `admin` reçoit déjà `ALL_PERMISSIONS`, donc rien à faire pour lui. Ajouter les deux permissions au rôle qui doit traiter les commandes — à décider avec l'équipe ; par défaut, ne les donner qu'à `admin` en ne modifiant aucun autre rôle.

- [ ] **Étape 2 : Écrire la migration de seed**

Suivre le modèle de `20260603210548_add_trophies_matches_permissions`. Inspecter d'abord son contenu pour reprendre la forme exacte :

```bash
cat prisma/migrations/20260603210548_add_trophies_matches_permissions/migration.sql
```

Créer `prisma/migrations/20260722120000_add_commandes_permissions/migration.sql` en calquant la syntaxe observée. La logique à exprimer : ajouter `'commandes:read'` et `'commandes:write'` au tableau `permissions` du rôle `admin`, sans doublon.

```sql
-- Ajoute les permissions boutique au role admin, sans doublon.
UPDATE roles
SET permissions = array_cat(
  permissions,
  ARRAY(
    SELECT p FROM unnest(ARRAY['commandes:read', 'commandes:write']) AS p
    WHERE NOT (p = ANY(permissions))
  )
),
"updatedAt" = NOW()
WHERE name = 'admin';
```

- [ ] **Étape 3 : Appliquer et vérifier**

```bash
npx prisma migrate dev
npx prisma db execute --stdin <<< "SELECT name, permissions FROM roles WHERE name = 'admin';"
```

Attendu : le tableau contient `commandes:read` et `commandes:write`, chacun une seule fois.

- [ ] **Étape 4 : Commit**

```bash
git add src/common/constants/permissions.ts prisma/migrations
git commit -m "feat(shop): ajouter les permissions commandes:read et commandes:write"
```

---

### Task 7 : API admin des commandes

**Fichiers :**
- Créer : `src/shop/dto/update-order.dto.ts`
- Créer : `src/shop/orders-admin.service.ts`
- Créer : `src/shop/orders-admin.service.spec.ts`
- Créer : `src/shop/orders-admin.controller.ts`
- Créer : `src/shop/orders-admin.controller.spec.ts`
- Modifier : `src/shop/shop.module.ts`

**Interfaces :**
- Consomme : le modèle `Order` (Task 1), `PERMISSIONS.COMMANDES_*` (Task 6), `formatEuros` / `formatAddress` (Task 5)
- Produit :
  - `OrdersAdminService.findAll(status?: OrderStatus): Promise<Order[]>`
  - `OrdersAdminService.getPendingBatch(): Promise<{ count: number; orders: Order[]; recapText: string; csv: string }>`
  - `OrdersAdminService.markSent(): Promise<{ count: number; batchId: string }>`
  - `OrdersAdminService.update(id: number, dto: UpdateOrderDto): Promise<Order>`
  - `UpdateOrderDto { status?: OrderStatus; trackingNumber?: string; adminNote?: string }`
  - Routes `GET /api/admin/orders`, `GET /api/admin/orders/pending-batch`, `POST /api/admin/orders/mark-sent`, `PATCH /api/admin/orders/:id`

- [ ] **Étape 1 : Écrire le DTO de mise à jour**

Créer `src/shop/dto/update-order.dto.ts` :

```ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma';

export class UpdateOrderDto {
  @IsEnum(OrderStatus, { message: 'Statut de commande invalide' })
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le numéro de suivi ne peut pas dépasser 100 caractères' })
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'La note ne peut pas dépasser 2000 caractères' })
  adminNote?: string;
}
```

Vérifier le chemin d'import de `OrderStatus` : depuis `src/shop/dto/`, le client généré est à `../../../generated/prisma`.

- [ ] **Étape 2 : Écrire le test du service admin**

Créer `src/shop/orders-admin.service.spec.ts` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersAdminService } from './orders-admin.service';
import { PrismaService } from '../prisma.service';

describe('OrdersAdminService', () => {
  let service: OrdersAdminService;

  const mockPrisma = {
    order: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };

  const pendingOrder = {
    id: 1,
    reference: 'DVG-2026-0042',
    productName: 'MAILLOT 2023',
    size: 'M',
    quantity: 2,
    unitPriceCents: 3990,
    shippingCents: 400,
    totalCents: 8380,
    customerEmail: 'client@example.com',
    customerName: 'Jean Dupont',
    shippingAddress: {
      address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
    },
    status: 'PAID',
    createdAt: new Date('2026-07-20T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersAdminService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OrdersAdminService>(OrdersAdminService);
  });

  describe('findAll', () => {
    it('trie par date décroissante et ne filtre pas si aucun statut', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      await service.findAll();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filtre par statut quand il est fourni', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.findAll('SHIPPED' as never);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'SHIPPED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPendingBatch', () => {
    it('ne sélectionne que les commandes au statut PAID', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      await service.getPendingBatch();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('produit un récapitulatif contenant référence, produit, taille et adresse', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      const batch = await service.getPendingBatch();

      expect(batch.count).toBe(1);
      expect(batch.recapText).toContain('DVG-2026-0042');
      expect(batch.recapText).toContain('MAILLOT 2023');
      expect(batch.recapText).toContain('M');
      expect(batch.recapText).toContain('1 rue du Test');
    });

    it('produit un CSV avec une ligne d’en-tête et une ligne par commande', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      const batch = await service.getPendingBatch();
      const lines = batch.csv.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('reference');
      expect(lines[1]).toContain('DVG-2026-0042');
    });

    it('échappe les guillemets dans le CSV', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { ...pendingOrder, customerName: 'Jean "Le Grand" Dupont' },
      ]);

      const batch = await service.getPendingBatch();

      expect(batch.csv).toContain('Jean ""Le Grand"" Dupont');
    });

    it('retourne un lot vide sans erreur', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const batch = await service.getPendingBatch();

      expect(batch.count).toBe(0);
      expect(batch.orders).toEqual([]);
    });
  });

  describe('markSent', () => {
    it('bascule les commandes PAID en SENT_TO_MERCHANT avec un batchId commun', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markSent();

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { status: 'PAID' },
        data: expect.objectContaining({
          status: 'SENT_TO_MERCHANT',
          merchantBatchId: expect.any(String),
          sentToMerchantAt: expect.any(Date),
        }),
      });
      expect(result.count).toBe(3);
      expect(result.batchId).toBeTruthy();
    });

    it('lève BadRequestException si aucune commande n’est en attente', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markSent()).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('ne transmet que les champs fournis', async () => {
      mockPrisma.order.update.mockResolvedValue(pendingOrder);

      await service.update(1, { trackingNumber: 'AB123' });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { trackingNumber: 'AB123' },
      });
    });

    it('lève NotFoundException si la commande est introuvable (P2025)', async () => {
      mockPrisma.order.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.update(999, { status: 'SHIPPED' as never })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Étape 3 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/orders-admin.service.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './orders-admin.service'`.

- [ ] **Étape 4 : Écrire le service admin**

Créer `src/shop/orders-admin.service.ts` :

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Order, OrderStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { isPrismaNotFoundError } from '../common/utils/prisma-errors';
import { UpdateOrderDto } from './dto/update-order.dto';
import { formatAddress, formatEuros } from './shop-notifier.service';

export interface PendingBatch {
  count: number;
  orders: Order[];
  recapText: string;
  csv: string;
}

const CSV_HEADER = 'reference,produit,taille,quantite,client,email,adresse,total_eur';

@Injectable()
export class OrdersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: OrderStatus): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingBatch(): Promise<PendingBatch> {
    const orders = await this.prisma.order.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: orders.length,
      orders,
      recapText: orders.map((order) => buildRecapLine(order)).join('\n'),
      csv: [CSV_HEADER, ...orders.map((order) => buildCsvLine(order))].join('\n'),
    };
  }

  /**
   * Bascule toutes les commandes payees non transmises en SENT_TO_MERCHANT,
   * sous un identifiant de lot commun. Volontairement separe de la generation
   * du recapitulatif : l'operateur envoie son mail puis confirme.
   */
  async markSent(): Promise<{ count: number; batchId: string }> {
    const batchId = randomUUID();
    const result = await this.prisma.order.updateMany({
      where: { status: 'PAID' },
      data: {
        status: 'SENT_TO_MERCHANT',
        merchantBatchId: batchId,
        sentToMerchantAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Aucune commande en attente de transmission');
    }
    return { count: result.count, batchId };
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    try {
      return await this.prisma.order.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
          ...(dto.adminNote !== undefined && { adminNote: dto.adminNote }),
        },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Commande ${id} introuvable`);
      }
      throw error;
    }
  }
}

// Pure helper functions (no DI)

function describeSize(order: Order): string {
  return order.size ?? '—';
}

export function buildRecapLine(order: Order): string {
  return [
    order.reference,
    `${order.productName} (${describeSize(order)}) x${order.quantity}`,
    order.customerName,
    formatAddress(order.shippingAddress),
    `${formatEuros(order.totalCents)} €`,
  ].join(' | ');
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsvLine(order: Order): string {
  return [
    order.reference,
    order.productName,
    describeSize(order),
    String(order.quantity),
    order.customerName,
    order.customerEmail,
    formatAddress(order.shippingAddress),
    formatEuros(order.totalCents),
  ]
    .map(csvCell)
    .join(',');
}
```

- [ ] **Étape 5 : Lancer le test pour vérifier qu'il passe**

```bash
npx jest src/shop/orders-admin.service.spec.ts
```

Attendu : 11 specs PASS.

- [ ] **Étape 6 : Écrire le test du controller admin**

Créer `src/shop/orders-admin.controller.spec.ts` :

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../common/constants/permissions';

describe('OrdersAdminController', () => {
  let controller: OrdersAdminController;

  const mockService = {
    findAll: jest.fn(),
    getPendingBatch: jest.fn(),
    markSent: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersAdminController],
      providers: [
        { provide: OrdersAdminService, useValue: mockService },
        PermissionsGuard,
        Reflector,
      ],
    }).compile();
    controller = module.get<OrdersAdminController>(OrdersAdminController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('PermissionsGuard metadata', () => {
    const getPerms = (methodName: keyof typeof OrdersAdminController.prototype): string[] => {
      const fn = OrdersAdminController.prototype[methodName] as object;
      return Reflect.getMetadata('permissions', fn) as string[];
    };

    it('la liste exige commandes:read', () => {
      expect(getPerms('findAll')).toContain(PERMISSIONS.COMMANDES_READ);
    });

    it('le lot en attente exige commandes:read', () => {
      expect(getPerms('getPendingBatch')).toContain(PERMISSIONS.COMMANDES_READ);
    });

    it('le marquage comme transmis exige commandes:write', () => {
      expect(getPerms('markSent')).toContain(PERMISSIONS.COMMANDES_WRITE);
    });

    it('la mise à jour exige commandes:write', () => {
      expect(getPerms('update')).toContain(PERMISSIONS.COMMANDES_WRITE);
    });
  });

  describe('findAll', () => {
    it('transmet le filtre de statut au service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll('SHIPPED');
      expect(mockService.findAll).toHaveBeenCalledWith('SHIPPED');
    });
  });
});
```

- [ ] **Étape 7 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest src/shop/orders-admin.controller.spec.ts
```

Attendu : ÉCHEC — `Cannot find module './orders-admin.controller'`.

- [ ] **Étape 8 : Écrire le controller admin**

Créer `src/shop/orders-admin.controller.ts` :

```ts
import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { Order, OrderStatus } from '../../generated/prisma';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { OrdersAdminService, PendingBatch } from './orders-admin.service';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller()
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersAdminService) {}

  @Get('api/admin/orders')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_READ)
  findAll(@Query('status') status?: string): Promise<Order[]> {
    return this.ordersService.findAll(status as OrderStatus | undefined);
  }

  @Get('api/admin/orders/pending-batch')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_READ)
  getPendingBatch(): Promise<PendingBatch> {
    return this.ordersService.getPendingBatch();
  }

  @Post('api/admin/orders/mark-sent')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_WRITE)
  markSent(): Promise<{ count: number; batchId: string }> {
    return this.ordersService.markSent();
  }

  @Patch('api/admin/orders/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_WRITE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto): Promise<Order> {
    return this.ordersService.update(id, dto);
  }
}
```

Attention à l'ordre de déclaration : `pending-batch` doit être déclaré avant toute route `:id` en GET pour ne pas être capté comme un identifiant. Ici il n'y a pas de `GET /api/admin/orders/:id`, donc pas de conflit — mais si on en ajoute un plus tard, il devra venir après.

Enregistrer dans `src/shop/shop.module.ts` : ajouter `OrdersAdminController` à `controllers` et `OrdersAdminService` à `providers`.

- [ ] **Étape 9 : Lancer tous les tests**

```bash
npx jest src/shop && npm run lint
```

Attendu : tous PASS, lint sans warning.

- [ ] **Étape 10 : Commit**

```bash
git add src/shop
git commit -m "feat(shop): exposer l'API admin des commandes et du lot hebdomadaire"
```

---

### Task 8 : Modèles et service frontend des commandes

**Fichiers (repo frontend) :**
- Créer : `src/app/shared/models/order.model.ts`
- Créer : `src/app/shared/services/orders.service.ts`
- Créer : `src/app/shared/services/orders.service.spec.ts`

**Interfaces :**
- Consomme : les routes `/api/admin/orders*` (Task 7)
- Produit :
  - `type OrderStatus`, `interface Order`, `interface PendingBatch`, `interface UpdateOrderDto`
  - `OrdersService.orders` (signal readonly `Order[]`)
  - `OrdersService.loadOrders(status?: OrderStatus): Observable<Order[]>`
  - `OrdersService.loadPendingBatch(): Observable<PendingBatch>`
  - `OrdersService.markSent(): Observable<{ count: number; batchId: string }>`
  - `OrdersService.updateOrder(id: number, dto: UpdateOrderDto): Observable<Order>`
  - `ORDER_STATUS_LABELS: Record<OrderStatus, string>`

- [ ] **Étape 1 : Écrire les modèles**

Créer `src/app/shared/models/order.model.ts` :

```ts
export type OrderStatus =
  | 'PAID'
  | 'SENT_TO_MERCHANT'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PAID: 'Payée',
  SENT_TO_MERCHANT: 'Transmise au marchand',
  IN_PRODUCTION: 'En production',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};

export interface ShippingAddress {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    postal_code?: string;
    city?: string;
    country?: string;
  };
}

export interface Order {
  id: number;
  reference: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  productId: string;
  productName: string;
  size: string | null;
  quantity: number;
  unitPriceCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  sentToMerchantAt: string | null;
  merchantBatchId: string | null;
  trackingNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingBatch {
  count: number;
  orders: Order[];
  recapText: string;
  csv: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  trackingNumber?: string;
  adminNote?: string;
}
```

- [ ] **Étape 2 : Écrire le test du service**

Créer `src/app/shared/services/orders.service.spec.ts` :

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrdersService } from './orders.service';
import { Order } from '../models/order.model';
import { environment } from '../../../environments/environment';

describe('OrdersService', () => {
  let service: OrdersService;
  let httpMock: HttpTestingController;

  const order = { id: 1, reference: 'DVG-2026-0042', status: 'PAID' } as Order;
  const adminBase = `${environment.apiUrl}/api/admin/orders`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        OrdersService,
      ],
    });
    service = TestBed.inject(OrdersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge les commandes et alimente le signal', () => {
    service.loadOrders().subscribe();
    const req = httpMock.expectOne(adminBase);
    expect(req.request.method).toBe('GET');
    req.flush([order]);

    expect(service.orders()).toEqual([order]);
  });

  it('transmet le filtre de statut en paramètre de requête', () => {
    service.loadOrders('SHIPPED').subscribe();
    const req = httpMock.expectOne(`${adminBase}?status=SHIPPED`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('récupère le lot en attente', () => {
    service.loadPendingBatch().subscribe();
    const req = httpMock.expectOne(`${adminBase}/pending-batch`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, orders: [], recapText: '', csv: '' });
  });

  it('marque le lot comme transmis', () => {
    service.markSent().subscribe();
    const req = httpMock.expectOne(`${adminBase}/mark-sent`);
    expect(req.request.method).toBe('POST');
    req.flush({ count: 2, batchId: 'batch-1' });
  });

  it('met à jour une commande et remplace l’entrée dans le signal', () => {
    service.loadOrders().subscribe();
    httpMock.expectOne(adminBase).flush([order]);

    const updated = { ...order, status: 'SHIPPED' as const };
    service.updateOrder(1, { status: 'SHIPPED' }).subscribe();
    const req = httpMock.expectOne(`${adminBase}/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(updated);

    expect(service.orders()).toEqual([updated]);
  });
});
```

- [ ] **Étape 3 : Lancer le test pour vérifier qu'il échoue**

```bash
cd /home/tellebma/DEV/DVG/WEB/frontend
npm test -- --include='**/orders.service.spec.ts'
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Étape 4 : Écrire le service**

Créer `src/app/shared/services/orders.service.ts` :

```ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus, PendingBatch, UpdateOrderDto } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly adminBase = `${environment.apiUrl}/api/admin/orders`;

  private readonly ordersSignal = signal<Order[]>([]);
  readonly orders = this.ordersSignal.asReadonly();

  loadOrders(status?: OrderStatus): Observable<Order[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<Order[]>(this.adminBase, { params })
      .pipe(tap((orders) => this.ordersSignal.set(orders)));
  }

  loadPendingBatch(): Observable<PendingBatch> {
    return this.http.get<PendingBatch>(`${this.adminBase}/pending-batch`);
  }

  markSent(): Observable<{ count: number; batchId: string }> {
    return this.http.post<{ count: number; batchId: string }>(`${this.adminBase}/mark-sent`, {});
  }

  updateOrder(id: number, dto: UpdateOrderDto): Observable<Order> {
    return this.http
      .patch<Order>(`${this.adminBase}/${id}`, dto)
      .pipe(
        tap((updated) =>
          this.ordersSignal.set(this.ordersSignal().map((o) => (o.id === id ? updated : o))),
        ),
      );
  }
}
```

- [ ] **Étape 5 : Lancer le test pour vérifier qu'il passe**

```bash
npm test -- --include='**/orders.service.spec.ts'
```

Attendu : 5 specs PASS.

- [ ] **Étape 6 : Commit**

```bash
git add src/app/shared/models/order.model.ts src/app/shared/services/orders.service.ts src/app/shared/services/orders.service.spec.ts
git commit -m "feat(admin): ajouter le service et les modeles des commandes boutique"
```

---

### Task 9 : Page admin des commandes

**Fichiers (repo frontend) :**
- Créer : `src/app/admin/pages/commandes/commandes-admin.component.ts`
- Créer : `src/app/admin/pages/commandes/commandes-admin.component.html`
- Créer : `src/app/admin/pages/commandes/commandes-admin.component.scss`
- Créer : `src/app/admin/pages/commandes/commandes-admin.component.spec.ts`
- Créer : `src/app/admin/pages/commandes/recap-dialog.component.ts`
- Créer : `src/app/admin/pages/commandes/order-dialog.component.ts`
- Modifier : `src/app/app.routes.ts`
- Modifier : `src/shared/config/admin-shortcuts.ts`
- Modifier : `src/app/admin/components/admin-sidebar.component.ts`

**Interfaces :**
- Consomme : `OrdersService`, `Order`, `ORDER_STATUS_LABELS` (Task 8)
- Produit : la route `/admin/commandes`

- [ ] **Étape 1 : Écrire la modale de récapitulatif**

Créer `src/app/admin/pages/commandes/recap-dialog.component.ts` :

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { PendingBatch } from '../../../shared/models/order.model';

@Component({
  selector: 'app-recap-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Récapitulatif — {{ data.count }} commande(s)</h2>
    <mat-dialog-content>
      @if (data.count === 0) {
        <p>Aucune commande en attente de transmission.</p>
      } @else {
        <p class="hint">
          Copiez ce récapitulatif dans votre mail au marchand, puis revenez marquer le lot
          comme transmis.
        </p>
        <pre class="recap">{{ data.recapText }}</pre>
        @if (copied()) {
          <p class="copied" role="status">Récapitulatif copié.</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Fermer</button>
      @if (data.count > 0) {
        <button mat-button type="button" (click)="copyRecap()">Copier le texte</button>
        <button mat-raised-button color="primary" type="button" (click)="downloadCsv()">
          Télécharger le CSV
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: min(700px, 92vw);
      }
      .recap {
        white-space: pre-wrap;
        word-break: break-word;
        background: rgba(50, 210, 153, 0.08);
        padding: 12px;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      .hint {
        color: rgba(255, 255, 255, 0.7);
      }
      .copied {
        color: #32d299;
      }
    `,
  ],
})
export class RecapDialogComponent {
  readonly data = inject<PendingBatch>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<RecapDialogComponent>);

  readonly copied = signal(false);

  async copyRecap(): Promise<void> {
    await navigator.clipboard.writeText(this.data.recapText);
    this.copied.set(true);
  }

  downloadCsv(): void {
    const blob = new Blob([this.data.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'commandes-a-transmettre.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Étape 2 : Écrire la modale d'édition de commande**

Créer `src/app/admin/pages/commandes/order-dialog.component.ts` :

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ORDER_STATUS_LABELS, Order, OrderStatus } from '../../../shared/models/order.model';
import { OrdersService } from '../../../shared/services/orders.service';

interface OrderDialogData {
  order: Order;
}

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Commande {{ data.order.reference }}</h2>
    <mat-dialog-content>
      @if (error()) {
        <p class="error-banner">{{ error() }}</p>
      }

      <dl class="details">
        <dt>Produit</dt>
        <dd>{{ data.order.productName }} @if (data.order.size) { — {{ data.order.size }} } × {{ data.order.quantity }}</dd>
        <dt>Client</dt>
        <dd>{{ data.order.customerName }} ({{ data.order.customerEmail }})</dd>
        <dt>Adresse</dt>
        <dd>{{ formattedAddress }}</dd>
        <dt>Total</dt>
        <dd>{{ data.order.totalCents / 100 | number: '1.2-2' }} €</dd>
      </dl>

      <form [formGroup]="form" class="form">
        <mat-form-field>
          <mat-label>Statut</mat-label>
          <mat-select formControlName="status">
            @for (entry of statusEntries; track entry[0]) {
              <mat-option [value]="entry[0]">{{ entry[1] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Numéro de suivi</mat-label>
          <input matInput formControlName="trackingNumber" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Note interne</mat-label>
          <textarea matInput rows="3" formControlName="adminNote"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button mat-raised-button color="primary" [disabled]="saving()" (click)="save()">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: min(560px, 92vw);
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
      }
      .details {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 16px;
      }
      .details dt {
        font-weight: 600;
      }
      .error-banner {
        color: #ff6b6b;
      }
    `,
  ],
})
export class OrderDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ordersService = inject(OrdersService);
  private readonly dialogRef = inject(MatDialogRef<OrderDialogComponent>);
  readonly data = inject<OrderDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly error = signal<string | undefined>(undefined);

  readonly statusEntries = Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][];

  readonly form: FormGroup = this.fb.group({
    status: [this.data.order.status, Validators.required],
    trackingNumber: [this.data.order.trackingNumber ?? ''],
    adminNote: [this.data.order.adminNote ?? ''],
  });

  get formattedAddress(): string {
    const address = this.data.order.shippingAddress?.address;
    if (!address?.line1) {
      return 'Adresse non renseignée';
    }
    return [address.line1, address.line2, `${address.postal_code ?? ''} ${address.city ?? ''}`.trim(), address.country]
      .filter(Boolean)
      .join(', ');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(undefined);

    const raw = this.form.value as {
      status: OrderStatus;
      trackingNumber: string;
      adminNote: string;
    };

    this.ordersService
      .updateOrder(this.data.order.id, {
        status: raw.status,
        trackingNumber: raw.trackingNumber,
        adminNote: raw.adminNote,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.dialogRef.close(updated);
        },
        error: (err: { error?: { message?: string | string[] } }) => {
          this.saving.set(false);
          const message = err?.error?.message;
          this.error.set(
            Array.isArray(message)
              ? message.join(' — ')
              : (message ?? "Erreur lors de l'enregistrement."),
          );
        },
      });
  }
}
```

- [ ] **Étape 3 : Écrire le test de la page liste**

Créer `src/app/admin/pages/commandes/commandes-admin.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NEVER, of, throwError } from 'rxjs';
import { CommandesAdminComponent } from './commandes-admin.component';
import { OrdersService } from '../../../shared/services/orders.service';
import { Order } from '../../../shared/models/order.model';

describe('CommandesAdminComponent', () => {
  let fixture: ComponentFixture<CommandesAdminComponent>;
  let component: CommandesAdminComponent;
  let ordersService: jasmine.SpyObj<OrdersService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const paidOrder = {
    id: 1,
    reference: 'DVG-2026-0042',
    productName: 'MAILLOT 2023',
    size: 'M',
    quantity: 1,
    totalCents: 4390,
    customerName: 'Jean Dupont',
    status: 'PAID',
    createdAt: '2026-07-20T10:00:00Z',
  } as Order;

  const shippedOrder = { ...paidOrder, id: 2, reference: 'DVG-2026-0043', status: 'SHIPPED' as const };

  beforeEach(async () => {
    const ordersSignal = signal<Order[]>([paidOrder, shippedOrder]);
    const serviceSpy = jasmine.createSpyObj(
      'OrdersService',
      ['loadOrders', 'loadPendingBatch', 'markSent', 'updateOrder'],
      { orders: ordersSignal.asReadonly() },
    );
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [CommandesAdminComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: OrdersService, useValue: serviceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackSpy },
      ],
    }).compileComponents();

    ordersService = TestBed.inject(OrdersService) as jasmine.SpyObj<OrdersService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    ordersService.loadOrders.and.returnValue(NEVER);
    fixture = TestBed.createComponent(CommandesAdminComponent);
    component = fixture.componentInstance;
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('compte les commandes en attente de transmission', () => {
    expect(component.pendingCount()).toBe(1);
  });

  it('filtre la liste par statut', () => {
    component.onStatusFilterChange('SHIPPED');
    expect(component.filteredOrders()).toEqual([shippedOrder]);
  });

  it('affiche toutes les commandes quand le filtre est vide', () => {
    component.onStatusFilterChange('');
    expect(component.filteredOrders().length).toBe(2);
  });

  it('ouvre la modale de récapitulatif avec le lot chargé', () => {
    const batch = { count: 1, orders: [paidOrder], recapText: 'DVG-2026-0042', csv: 'reference' };
    ordersService.loadPendingBatch.and.returnValue(of(batch));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(null));
    dialog.open.and.returnValue(dialogRef as unknown as MatDialogRef<unknown>);

    component.openRecap();

    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: batch }));
  });

  it('signale une erreur si le chargement du lot échoue', () => {
    ordersService.loadPendingBatch.and.returnValue(throwError(() => new Error('boom')));

    component.openRecap();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Erreur lors du chargement du lot',
      'OK',
      jasmine.any(Object),
    );
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('marque le lot comme transmis puis recharge la liste', () => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(true));
    dialog.open.and.returnValue(dialogRef as unknown as MatDialogRef<unknown>);
    ordersService.markSent.and.returnValue(of({ count: 3, batchId: 'batch-1' }));
    ordersService.loadOrders.and.returnValue(of([paidOrder]));

    component.confirmMarkSent();

    expect(ordersService.markSent).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      '3 commande(s) marquée(s) comme transmises',
      'OK',
      jasmine.any(Object),
    );
  });

  it('ne marque rien si la confirmation est annulée', () => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(false));
    dialog.open.and.returnValue(dialogRef as unknown as MatDialogRef<unknown>);

    component.confirmMarkSent();

    expect(ordersService.markSent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il échoue**

```bash
npm test -- --include='**/commandes-admin.component.spec.ts'
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Étape 5 : Écrire le composant**

Créer `src/app/admin/pages/commandes/commandes-admin.component.ts` :

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ORDER_STATUS_LABELS, Order, OrderStatus } from '../../../shared/models/order.model';
import { OrdersService } from '../../../shared/services/orders.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { OrderDialogComponent } from './order-dialog.component';
import { RecapDialogComponent } from './recap-dialog.component';

@Component({
  selector: 'app-commandes-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './commandes-admin.component.html',
  styleUrls: ['./commandes-admin.component.scss'],
})
export class CommandesAdminComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly statusFilter = signal<OrderStatus | ''>('');

  readonly orders = this.ordersService.orders;
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusEntries = Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][];

  readonly pendingCount = computed(() => this.orders().filter((o) => o.status === 'PAID').length);

  readonly filteredOrders = computed(() => {
    const filter = this.statusFilter();
    return filter ? this.orders().filter((o) => o.status === filter) : this.orders();
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  onStatusFilterChange(status: OrderStatus | ''): void {
    this.statusFilter.set(status);
  }

  openRecap(): void {
    this.ordersService.loadPendingBatch().subscribe({
      next: (batch) => {
        this.dialog.open(RecapDialogComponent, {
          width: '760px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: batch,
        });
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement du lot', 'OK', { duration: 3000 });
      },
    });
  }

  confirmMarkSent(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Marquer le lot comme transmis',
        message:
          "Confirmez uniquement après avoir envoyé le mail au marchand. Toutes les commandes payées passeront en « Transmise au marchand ».",
        confirmText: 'Marquer comme transmises',
        color: 'primary',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.ordersService.markSent().subscribe({
        next: (result) => {
          this.snackBar.open(`${result.count} commande(s) marquée(s) comme transmises`, 'OK', {
            duration: 3000,
          });
          this.loadOrders();
        },
        error: () => {
          this.snackBar.open('Erreur lors du marquage du lot', 'OK', { duration: 3000 });
        },
      });
    });
  }

  openOrder(order: Order): void {
    const ref = this.dialog.open(OrderDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { order },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Commande mise à jour', 'OK', { duration: 2500 });
      }
    });
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.ordersService.loadOrders().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des commandes', 'OK', { duration: 3000 });
      },
    });
  }
}
```

- [ ] **Étape 6 : Écrire le template**

Créer `src/app/admin/pages/commandes/commandes-admin.component.html` :

```html
<div class="page-header">
  <h1>Commandes boutique</h1>
</div>

<section class="batch-panel" aria-labelledby="batch-title">
  <h2 id="batch-title">
    {{ pendingCount() }} commande(s) en attente de transmission
  </h2>
  <p class="batch-hint">
    Générez le récapitulatif, envoyez-le au marchand depuis votre boîte mail, puis marquez le
    lot comme transmis.
  </p>
  <div class="batch-actions">
    <button mat-raised-button color="primary" type="button" (click)="openRecap()">
      Générer le récapitulatif
    </button>
    <button
      mat-stroked-button
      type="button"
      [disabled]="pendingCount() === 0"
      (click)="confirmMarkSent()"
    >
      Marquer comme transmises
    </button>
  </div>
</section>

<mat-form-field class="status-filter">
  <mat-label>Filtrer par statut</mat-label>
  <mat-select [value]="statusFilter()" (valueChange)="onStatusFilterChange($event)">
    <mat-option value="">Tous les statuts</mat-option>
    @for (entry of statusEntries; track entry[0]) {
      <mat-option [value]="entry[0]">{{ entry[1] }}</mat-option>
    }
  </mat-select>
</mat-form-field>

@if (loading()) {
  <output class="skeleton-table" aria-live="polite">Chargement des commandes…</output>
} @else if (filteredOrders().length === 0) {
  <div class="empty-state">
    <p>Aucune commande à afficher.</p>
  </div>
} @else {
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th scope="col">Référence</th>
          <th scope="col">Date</th>
          <th scope="col">Produit</th>
          <th scope="col">Client</th>
          <th scope="col">Montant</th>
          <th scope="col">Statut</th>
        </tr>
      </thead>
      <tbody>
        @for (order of filteredOrders(); track order.id) {
          <tr
            class="order-row"
            tabindex="0"
            [attr.aria-label]="'Ouvrir la commande ' + order.reference"
            (click)="openOrder(order)"
            (keydown.enter)="openOrder(order)"
            (keydown.space)="openOrder(order)"
          >
            <td>{{ order.reference }}</td>
            <td>{{ order.createdAt | date: 'dd/MM/yyyy' }}</td>
            <td>
              {{ order.productName }}@if (order.size) { — {{ order.size }} } × {{ order.quantity }}
            </td>
            <td>{{ order.customerName }}</td>
            <td>{{ order.totalCents / 100 | number: '1.2-2' }} €</td>
            <td>
              <span class="status-badge" [attr.data-status]="order.status">
                {{ statusLabels[order.status] }}
              </span>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
}
```

- [ ] **Étape 7 : Écrire les styles**

Créer `src/app/admin/pages/commandes/commandes-admin.component.scss`. Reprendre les classes du design system admin en s'appuyant sur `src/app/admin/pages/trophies/trophies-admin.component.scss` pour `.page-header`, `.table-wrapper`, `.empty-state` et `.skeleton-table`, puis ajouter :

```scss
.batch-panel {
  background: rgba(50, 210, 153, 0.08);
  border: 1px solid rgba(50, 210, 153, 0.3);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 24px;

  h2 {
    margin: 0 0 4px;
    font-size: 1.1rem;
  }
}

.batch-hint {
  margin: 0 0 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.batch-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status-filter {
  max-width: 280px;
  margin-bottom: 16px;
}

.order-row {
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(50, 210, 153, 0.1);
  }
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.1);

  &[data-status='PAID'] {
    background: rgba(50, 210, 153, 0.25);
  }
  &[data-status='CANCELLED'],
  &[data-status='REFUNDED'] {
    background: rgba(255, 107, 107, 0.25);
  }
}

.table-wrapper {
  overflow-x: auto;
}
```

- [ ] **Étape 8 : Lancer le test pour vérifier qu'il passe**

```bash
npm test -- --include='**/commandes-admin.component.spec.ts'
```

Attendu : 8 specs PASS.

- [ ] **Étape 9 : Déclarer la route**

Dans `src/app/app.routes.ts`, dans les `children` du bloc `path: 'admin'`, à la suite des autres entrées :

```ts
{
  path: 'commandes',
  title: 'Commandes',
  canActivate: [permissionGuard],
  data: { permission: 'commandes:read' },
  loadComponent: () =>
    import('./admin/pages/commandes/commandes-admin.component').then(
      m => m.CommandesAdminComponent
    ),
},
```

- [ ] **Étape 10 : Ajouter l'entrée de navigation**

Dans `src/shared/config/admin-shortcuts.ts`, ajouter au tableau `ADMIN_SHORTCUTS` :

```ts
{
  key: 'commandes',
  label: 'Commandes',
  icon: 'receipt_long',
  route: '/admin/commandes',
  requiredPermissions: ['commandes:read'],
  section: 'content',
},
```

Puis dans `src/app/admin/components/admin-sidebar.component.ts`, ajouter l'import de l'icône et son mapping :

```ts
import { faReceipt } from '@fortawesome/free-solid-svg-icons';
```

```ts
const FA_ICON_MAP: Record<string, IconDefinition> = {
  // ... entrées existantes
  commandes: faReceipt,
};
```

- [ ] **Étape 11 : Lancer toute la suite**

```bash
npm run test:coverage && npm run lint
```

Attendu : tous les specs PASS, seuils de couverture respectés, lint sans warning.

- [ ] **Étape 12 : Vérification manuelle**

Démarrer le backend et le frontend, se connecter en admin, aller sur `/admin/commandes`.

- l'entrée « Commandes » apparaît dans la sidebar
- le compteur de commandes en attente est correct
- « Générer le récapitulatif » ouvre la modale avec le texte et le bouton CSV ; le CSV se télécharge et s'ouvre correctement dans un tableur
- « Marquer comme transmises » demande confirmation, puis les commandes passent en « Transmise au marchand » et le compteur retombe à 0
- le clic sur une ligne ouvre le détail ; changer le statut et saisir un numéro de suivi persiste après rechargement
- se connecter avec un compte sans `commandes:read` : `/admin/commandes` redirige vers `/admin`

- [ ] **Étape 13 : Commit et ouverture de la PR 3**

```bash
git add src/app/admin/pages/commandes src/app/app.routes.ts src/shared/config/admin-shortcuts.ts src/app/admin/components/admin-sidebar.component.ts
git commit -m "feat(admin): ajouter la page de gestion des commandes boutique"
```

Ouvrir une PR sur `develop` pour les deux repos (backend : Tasks 6-7 ; frontend : Tasks 8-9), en se référant au spec.

---

## PR 4 — Branchement du front boutique

### Task 10 : Service catalogue public

**Fichiers (repo frontend) :**
- Créer : `src/app/shared/models/shop-product.model.ts`
- Créer : `src/app/shared/services/shop.service.ts`
- Créer : `src/app/shared/services/shop.service.spec.ts`

**Interfaces :**
- Consomme : `GET /api/shop/products`, `POST /api/shop/checkout` (Tasks 2-3)
- Produit :
  - `interface ShopProduct { id: string; name: string; priceCents: number; sizes: string[]; descKey: string; images: { front: string; back: string | null }; active: boolean }`
  - `ShopService.products` (signal readonly)
  - `ShopService.loadProducts(): Observable<ShopProduct[]>`
  - `ShopService.createCheckout(payload: { productId: string; size?: string; quantity: number }): Observable<{ url: string }>`

- [ ] **Étape 1 : Écrire le modèle**

Créer `src/app/shared/models/shop-product.model.ts` :

```ts
export interface ShopProduct {
  id: string;
  name: string;
  priceCents: number;
  sizes: string[];
  descKey: string;
  images: { front: string; back: string | null };
  active: boolean;
}

export interface CreateCheckoutPayload {
  productId: string;
  size?: string;
  quantity: number;
}
```

- [ ] **Étape 2 : Écrire le test du service**

Créer `src/app/shared/services/shop.service.spec.ts` :

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShopService } from './shop.service';
import { ShopProduct } from '../models/shop-product.model';
import { environment } from '../../../environments/environment';

describe('ShopService', () => {
  let service: ShopService;
  let httpMock: HttpTestingController;

  const product: ShopProduct = {
    id: 'maillotDvg_2023',
    name: 'MAILLOT 2023',
    priceCents: 3990,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    descKey: 'detailsMaillot2023',
    images: { front: 'assets/img/shop/a.png', back: null },
    active: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ShopService,
      ],
    });
    service = TestBed.inject(ShopService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge le catalogue et alimente le signal', () => {
    service.loadProducts().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/shop/products`);
    expect(req.request.method).toBe('GET');
    req.flush([product]);

    expect(service.products()).toEqual([product]);
  });

  it("envoie le produit, la taille et la quantité au checkout, sans jamais de prix", () => {
    service.createCheckout({ productId: 'maillotDvg_2023', size: 'M', quantity: 2 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/shop/checkout`);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 'maillotDvg_2023', size: 'M', quantity: 2 });
    expect(Object.keys(req.request.body as object)).not.toContain('priceCents');
    req.flush({ url: 'https://stripe/cs_1' });
  });

  it('omet la taille pour un produit sans déclinaison', () => {
    service.createCheckout({ productId: 'tapisSourisDvg', quantity: 1 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/shop/checkout`);

    expect(req.request.body).toEqual({ productId: 'tapisSourisDvg', quantity: 1 });
    req.flush({ url: 'https://stripe/cs_1' });
  });
});
```

- [ ] **Étape 3 : Lancer le test pour vérifier qu'il échoue**

```bash
npm test -- --include='**/shop.service.spec.ts'
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Étape 4 : Écrire le service**

Créer `src/app/shared/services/shop.service.ts` :

```ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateCheckoutPayload, ShopProduct } from '../models/shop-product.model';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/shop`;

  private readonly productsSignal = signal<ShopProduct[]>([]);
  readonly products = this.productsSignal.asReadonly();

  loadProducts(): Observable<ShopProduct[]> {
    return this.http
      .get<ShopProduct[]>(`${this.baseUrl}/products`)
      .pipe(tap((products) => this.productsSignal.set(products)));
  }

  /**
   * Cree une session de paiement. Le prix n'est volontairement pas transmis :
   * le serveur le recalcule depuis son propre catalogue.
   */
  createCheckout(payload: CreateCheckoutPayload): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseUrl}/checkout`, payload);
  }
}
```

- [ ] **Étape 5 : Lancer le test pour vérifier qu'il passe**

```bash
npm test -- --include='**/shop.service.spec.ts'
```

Attendu : 3 specs PASS.

- [ ] **Étape 6 : Commit**

```bash
git add src/app/shared/models/shop-product.model.ts src/app/shared/services/shop.service.ts src/app/shared/services/shop.service.spec.ts
git commit -m "feat(boutique): ajouter le service de catalogue et de checkout"
```

---

### Task 11 : Brancher la page boutique et la page de confirmation

**Fichiers (repo frontend) :**
- Créer : `src/app/pages/boutique/buy-dialog.component.ts`
- Créer : `src/app/pages/boutique/buy-dialog.component.spec.ts`
- Créer : `src/app/pages/boutique/merci/merci.component.ts`
- Modifier : `src/app/pages/boutique/boutique.ts`, `boutique.html`, `boutique.spec.ts`
- Modifier : `src/app/app.routes.ts`
- Supprimer : `src/app/data/shopping-list.ts`

**Interfaces :**
- Consomme : `ShopService`, `ShopProduct` (Task 10), `DETAILS_SHOP_LIST` de `src/app/data/details-shopping-list.ts`
- Produit : la route `/boutique/merci`, le parcours d'achat complet

- [ ] **Étape 1 : Écrire la modale d'achat**

Créer `src/app/pages/boutique/buy-dialog.component.ts` :

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DecimalPipe } from '@angular/common';
import { ShopProduct } from '../../shared/models/shop-product.model';
import { ShopService } from '../../shared/services/shop.service';

interface BuyDialogData {
  product: ShopProduct;
}

@Component({
  selector: 'app-buy-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.product.name }}</h2>
    <mat-dialog-content>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }

      <p class="price">{{ data.product.priceCents / 100 | number: '1.2-2' }} € l'unité</p>

      <form [formGroup]="form" class="form">
        @if (data.product.sizes.length > 0) {
          <mat-form-field>
            <mat-label>Taille</mat-label>
            <mat-select formControlName="size">
              @for (size of data.product.sizes; track size) {
                <mat-option [value]="size">{{ size }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field>
          <mat-label>Quantité</mat-label>
          <input matInput type="number" min="1" max="10" formControlName="quantity" />
        </mat-form-field>
      </form>

      <p class="shipping-hint">
        L'adresse de livraison et les frais de port sont renseignés à l'étape suivante, sur la
        page de paiement sécurisée.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button mat-raised-button color="primary" [disabled]="submitting()" (click)="pay()">
        {{ submitting() ? 'Redirection…' : 'Payer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: min(420px, 92vw);
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .price {
        font-size: 1.2rem;
        font-weight: 600;
      }
      .shipping-hint {
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .error-banner {
        color: #ff6b6b;
      }
    `,
  ],
})
export class BuyDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly shopService = inject(ShopService);
  private readonly dialogRef = inject(MatDialogRef<BuyDialogComponent>);
  readonly data = inject<BuyDialogData>(MAT_DIALOG_DATA);

  readonly submitting = signal(false);
  readonly error = signal<string | undefined>(undefined);

  readonly form: FormGroup = this.fb.group({
    size: [
      this.data.product.sizes[0] ?? null,
      this.data.product.sizes.length > 0 ? Validators.required : [],
    ],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  pay(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(undefined);

    const raw = this.form.value as { size: string | null; quantity: number };
    const payload = {
      productId: this.data.product.id,
      quantity: Number(raw.quantity),
      ...(this.data.product.sizes.length > 0 && raw.size ? { size: raw.size } : {}),
    };

    this.shopService.createCheckout(payload).subscribe({
      next: (result) => {
        this.dialogRef.close(true);
        window.location.href = result.url;
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.submitting.set(false);
        const message = err?.error?.message;
        this.error.set(
          Array.isArray(message)
            ? message.join(' — ')
            : (message ?? 'Le paiement est momentanément indisponible. Réessayez plus tard.'),
        );
      },
    });
  }
}
```

- [ ] **Étape 2 : Écrire le test de la modale**

Créer `src/app/pages/boutique/buy-dialog.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { BuyDialogComponent } from './buy-dialog.component';
import { ShopService } from '../../shared/services/shop.service';
import { ShopProduct } from '../../shared/models/shop-product.model';

const sizedProduct: ShopProduct = {
  id: 'maillotDvg_2023',
  name: 'MAILLOT 2023',
  priceCents: 3990,
  sizes: ['S', 'M', 'L'],
  descKey: 'detailsMaillot2023',
  images: { front: 'a.png', back: null },
  active: true,
};

const sizelessProduct: ShopProduct = { ...sizedProduct, id: 'tapisSourisDvg', sizes: [] };

describe('BuyDialogComponent', () => {
  let fixture: ComponentFixture<BuyDialogComponent>;
  let component: BuyDialogComponent;
  let shopService: jasmine.SpyObj<ShopService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BuyDialogComponent>>;

  async function setup(product: ShopProduct): Promise<void> {
    const serviceSpy = jasmine.createSpyObj('ShopService', ['createCheckout', 'loadProducts']);
    const refSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [BuyDialogComponent],
        providers: [
          provideZonelessChangeDetection(),
          provideNoopAnimations(),
          { provide: ShopService, useValue: serviceSpy },
          { provide: MatDialogRef, useValue: refSpy },
          { provide: MAT_DIALOG_DATA, useValue: { product } },
        ],
      })
      .compileComponents();

    shopService = TestBed.inject(ShopService) as jasmine.SpyObj<ShopService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<BuyDialogComponent>>;
    fixture = TestBed.createComponent(BuyDialogComponent);
    component = fixture.componentInstance;
  }

  it('présélectionne la première taille disponible', async () => {
    await setup(sizedProduct);
    expect(component.form.value.size).toBe('S');
  });

  it("n'envoie pas de taille pour un produit sans déclinaison", async () => {
    await setup(sizelessProduct);
    shopService.createCheckout.and.returnValue(of({ url: 'https://stripe/cs_1' }));

    component.pay();

    expect(shopService.createCheckout).toHaveBeenCalledWith({
      productId: 'tapisSourisDvg',
      quantity: 1,
    });
  });

  it('envoie la taille et la quantité choisies, sans prix', async () => {
    await setup(sizedProduct);
    shopService.createCheckout.and.returnValue(of({ url: 'https://stripe/cs_1' }));
    component.form.patchValue({ size: 'L', quantity: 3 });

    component.pay();

    expect(shopService.createCheckout).toHaveBeenCalledWith({
      productId: 'maillotDvg_2023',
      quantity: 3,
      size: 'L',
    });
  });

  it("n'appelle pas le service si la quantité est invalide", async () => {
    await setup(sizedProduct);
    component.form.patchValue({ quantity: 99 });

    component.pay();

    expect(shopService.createCheckout).not.toHaveBeenCalled();
  });

  it('affiche un message et réactive le bouton si le checkout échoue', async () => {
    await setup(sizedProduct);
    shopService.createCheckout.and.returnValue(
      throwError(() => ({ error: { message: 'Produit introuvable ou indisponible' } })),
    );

    component.pay();

    expect(component.error()).toBe('Produit introuvable ou indisponible');
    expect(component.submitting()).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 3 : Lancer le test pour vérifier qu'il passe**

```bash
npm test -- --include='**/buy-dialog.component.spec.ts'
```

Attendu : 5 specs PASS. Si le spec « redirection » échoue à cause de `window.location.href`, ne pas tester la redirection elle-même — les specs ci-dessus l'évitent volontairement.

- [ ] **Étape 4 : Écrire la page de confirmation**

Créer `src/app/pages/boutique/merci/merci.component.ts` :

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-boutique-merci',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="merci">
      <h1>Merci pour votre commande</h1>
      <p>
        Votre paiement a bien été pris en compte. Vous recevez un reçu par e-mail dans les
        prochaines minutes.
      </p>
      <p>
        Les commandes sont transmises à notre fabricant une fois par semaine. Comptez ensuite
        quelques jours de production avant l'expédition.
      </p>
      <a routerLink="/boutique">Retour à la boutique</a>
    </section>
  `,
  styles: [
    `
      .merci {
        max-width: 640px;
        margin: 0 auto;
        padding: 64px 24px;
        text-align: center;
      }
    `,
  ],
})
export class MerciComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateMetaTags({
      title: 'Merci pour votre commande',
      description: 'Confirmation de commande sur la boutique Team Divergentes.',
      url: '/boutique/merci',
    });
  }
}
```

Vérifier le chemin d'import de `SeoService` : depuis `src/app/pages/boutique/merci/`, il est à `../../../shared/services/seo.service`. Comparer avec l'import existant dans `src/app/pages/boutique/boutique.ts` et ajuster la profondeur si nécessaire.

- [ ] **Étape 5 : Déclarer la route**

Dans `src/app/app.routes.ts`, la route `boutique` devient un bloc à enfants. Remplacer :

```ts
{
  path: 'boutique',
  title: 'Boutique',
  loadComponent: () => import('./pages/boutique/boutique').then(m => m.BoutiqueComponent)
},
```

par :

```ts
{
  path: 'boutique',
  children: [
    {
      path: '',
      title: 'Boutique',
      loadComponent: () => import('./pages/boutique/boutique').then(m => m.BoutiqueComponent)
    },
    {
      path: 'merci',
      title: 'Merci pour votre commande',
      loadComponent: () =>
        import('./pages/boutique/merci/merci.component').then(m => m.MerciComponent)
    },
  ]
},
```

- [ ] **Étape 6 : Brancher le composant boutique sur l'API**

Modifier `src/app/pages/boutique/boutique.ts`. Les changements structurants :

- `shoppingList` (import statique) est remplacé par le signal `products` du `ShopService`
- les getters `vipNewItem` / `newItems` / `oldItems` deviennent des `computed()` — un getter ne réagit pas à l'arrivée asynchrone des données
- `selectedItem` passe de `ShopItem` à `ShopProduct`
- la distinction nouveauté / ancienne collection, qui vivait dans les champs `new` et `vip` de `shopping-list.ts`, est maintenant portée par des constantes locales : le catalogue serveur ne transporte pas cette notion d'affichage

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCartShopping, faEye } from '@fortawesome/free-solid-svg-icons';
import { ShopItemComponent } from '../../../shared/components/shop-item/shop-item.component';
import { DETAILS_SHOP_LIST } from '../../data/details-shopping-list';
import { ShopProduct } from '../../shared/models/shop-product.model';
import { ShopService } from '../../shared/services/shop.service';
import { SeoService } from '../../shared/services/seo.service';
import { BuyDialogComponent } from './buy-dialog.component';

// Mise en page : ces identifiants pilotent l'affichage, pas le catalogue serveur.
const NEW_COLLECTION_IDS = new Set([
  'maillotDvg_2023',
  'tShirtMenpo_2023',
  'tShirtYinYang_2023',
  'tShirtKanji_2023',
  'hoodieYinYang_2023',
  'hoodieSnake_2023',
  'hoodieMenpo_2023',
]);
const VIP_PRODUCT_ID = 'maillotDvg_2023';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [ShopItemComponent, FontAwesomeModule],
  templateUrl: './boutique.html',
  styleUrls: ['./boutique.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoutiqueComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly shopService = inject(ShopService);
  private readonly dialog = inject(MatDialog);

  readonly faEye = faEye;
  readonly faCartShopping = faCartShopping;

  readonly products = this.shopService.products;
  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);

  readonly expanded = signal<Record<string, boolean>>({});
  readonly visible = signal(false);
  readonly selectedItem = signal<ShopProduct | null>(null);

  readonly detailsHtml = computed(() => {
    const item = this.selectedItem();
    // La description reste cote client : la faire transiter par l'API
    // transformerait le [innerHTML] de shop-item en vecteur XSS.
    return item ? (DETAILS_SHOP_LIST[item.descKey] ?? '') : '';
  });

  readonly vipNewItem = computed(
    () => this.products().find((p) => p.id === VIP_PRODUCT_ID) ?? null,
  );
  readonly newItems = computed(() =>
    this.products().filter((p) => NEW_COLLECTION_IDS.has(p.id) && p.id !== VIP_PRODUCT_ID),
  );
  readonly oldItems = computed(() => this.products().filter((p) => !NEW_COLLECTION_IDS.has(p.id)));

  ngOnInit(): void {
    this.seoService.updateMetaTags({
      title: 'Boutique',
      description:
        'Boutique officielle Team Divergentes : maillots, hoodies, t-shirts et accessoires esport. Textile certifié Oeko-Tex, personnalisé en France.',
      url: '/boutique',
    });
    this.loadProducts();
  }

  toggleCard(id: string): void {
    const current = this.expanded();
    this.expanded.set({ ...current, [id]: !current[id] });
  }

  openDetails(item: ShopProduct): void {
    this.selectedItem.set(item);
    this.visible.set(true);
  }

  closeDetails(): void {
    this.visible.set(false);
    this.selectedItem.set(null);
  }

  openBuyDialog(product: ShopProduct): void {
    this.dialog.open(BuyDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { product },
    });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.error.set(undefined);
    this.shopService.loadProducts().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set('La boutique est momentanément indisponible.');
      },
    });
  }
}
```

Conserver les propriétés de sponsors existantes (`baseSponsorsLeft`, `sponsorItemsLeft`, `sponsorItems`, `repeatItems`, `repeatSponsorItems`) telles quelles — elles ne sont pas concernées.

- [ ] **Étape 7 : Adapter le template**

Dans `src/app/pages/boutique/boutique.html`, trois familles de changements :

**a.** Les propriétés du modal `app-shop-item` changent de nom (`itemName` → `name`, `price` string → centimes, `img`/`imgFront`/`imgBack` → `images.front`/`images.back`). Remplacer le bloc par :

```html
<app-shop-item
  [visible]="visible()"
  (closed)="closeDetails()"
  [name]="selectedItem()?.name || ''"
  [price]="((selectedItem()?.priceCents || 0) / 100).toFixed(2)"
  [adress]="''"
  [frontImg]="selectedItem()?.images?.front || null"
  [backImg]="selectedItem()?.images?.back || null"
  [detailsHtml]="detailsHtml()">
</app-shop-item>
```

Le lien externe `adress` n'a plus lieu d'être : l'achat se fait sur le site. Le CTA « acheter » du composant `shop-item` doit être remplacé par un bouton qui émet un événement. Ajouter dans `shop-item.component.ts` :

```ts
  buyRequested = output<void>();
```

et dans `shop-item.component.html`, remplacer `<a [href]="adress()" target="_blank" rel="noreferrer">acheter</a>` par :

```html
<button type="button" class="buy-cta" (click)="buyRequested.emit()">acheter</button>
```

Supprimer alors l'input `adress` du composant et son usage dans le template parent, et brancher :

```html
  (buyRequested)="selectedItem() && openBuyDialog(selectedItem()!)"
```

**b.** Les `@for` passent des getters aux signals : `newItems` → `newItems()`, `oldItems` → `oldItems()`, `vipNewItem` → `vipNewItem()`. Les champs changent aussi : `shoppingItem.itemName` → `shoppingItem.name`, `shoppingItem.img` → `shoppingItem.images.front`, `shoppingItem.imgBack` → `shoppingItem.images.back`.

**c.** Chaque lien `<a class="buyItems_footerBtn" [href]="shoppingItem.adress" ...>` devient un bouton :

```html
<button class="buyItems_footerBtn" type="button" (click)="openBuyDialog(shoppingItem)">
  <fa-icon [icon]="faCartShopping"></fa-icon> Acheter
</button>
```

Idem pour le lien en dur de la bannière VIP, qui devient :

```html
@if (vipNewItem()) {
  <button type="button" (click)="openBuyDialog(vipNewItem()!)">Acheter</button>
  <button type="button" (click)="openDetails(vipNewItem()!)">Détails</button>
}
```

Ajouter enfin les états de chargement et d'erreur en tête de la section produits :

```html
@if (loading()) {
  <output class="skeleton-shop" aria-live="polite">Chargement de la boutique…</output>
} @else if (error()) {
  <p class="shop-error" role="alert">{{ error() }}</p>
}
```

- [ ] **Étape 8 : Mettre à jour le spec de la boutique**

`src/app/pages/boutique/boutique.spec.ts` casse : il assertait l'identité référentielle avec l'import statique (`expect(component.shoppingList).toBe(shoppingList)`) et appelait les filtres comme des getters synchrones.

Réécrire le `beforeEach` pour injecter un `ShopService` espionné et remplacer les assertions concernées :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { NEVER, of } from 'rxjs';
import { BoutiqueComponent } from './boutique';
import { SeoService } from '../../shared/services/seo.service';
import { ShopService } from '../../shared/services/shop.service';
import { ShopProduct } from '../../shared/models/shop-product.model';

const maillot2023: ShopProduct = {
  id: 'maillotDvg_2023',
  name: 'MAILLOT 2023',
  priceCents: 3990,
  sizes: ['S', 'M', 'L'],
  descKey: 'detailsMaillot2023',
  images: { front: 'a.png', back: 'b.png' },
  active: true,
};
const maillot2020: ShopProduct = {
  ...maillot2023,
  id: 'maillotDvg',
  name: 'MAILLOT 2020',
  descKey: 'detailsMaillot',
};

describe('BoutiqueComponent', () => {
  let component: BoutiqueComponent;
  let fixture: ComponentFixture<BoutiqueComponent>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let shopServiceSpy: jasmine.SpyObj<ShopService>;

  beforeEach(async () => {
    seoServiceSpy = jasmine.createSpyObj('SeoService', ['updateMetaTags']);
    const productsSignal = signal<ShopProduct[]>([maillot2023, maillot2020]);
    shopServiceSpy = jasmine.createSpyObj('ShopService', ['loadProducts', 'createCheckout'], {
      products: productsSignal.asReadonly(),
    });
    shopServiceSpy.loadProducts.and.returnValue(NEVER);

    await TestBed.configureTestingModule({
      imports: [BoutiqueComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ShopService, useValue: shopServiceSpy },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoutiqueComponent);
    component = fixture.componentInstance;
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('charge le catalogue au démarrage', () => {
    fixture.detectChanges();
    expect(shopServiceSpy.loadProducts).toHaveBeenCalled();
  });

  it('classe le maillot 2023 en nouveauté VIP et le 2020 en ancienne collection', () => {
    expect(component.vipNewItem()?.id).toBe('maillotDvg_2023');
    expect(component.oldItems().map((p) => p.id)).toEqual(['maillotDvg']);
  });

  it('résout la description depuis le catalogue local', () => {
    component.openDetails(maillot2023);
    expect(component.detailsHtml()).toContain('description_modalDetail');
  });

  it('retourne une description vide si aucun produit sélectionné', () => {
    component.closeDetails();
    expect(component.detailsHtml()).toBe('');
  });

  it('bascule l’état déplié d’une carte', () => {
    component.toggleCard('maillotDvg_2023');
    expect(component.expanded()['maillotDvg_2023']).toBe(true);
    component.toggleCard('maillotDvg_2023');
    expect(component.expanded()['maillotDvg_2023']).toBe(false);
  });

  it('affiche une erreur si le catalogue est indisponible', () => {
    shopServiceSpy.loadProducts.and.returnValue(
      new Observable((subscriber) => subscriber.error(new Error('boom'))),
    );
    fixture.detectChanges();
    expect(component.error()).toBe('La boutique est momentanément indisponible.');
  });
});
```

Ajouter `import { Observable } from 'rxjs';` en tête. Conserver le spec existant sur `updateMetaTags` en l'adaptant si nécessaire.

- [ ] **Étape 9 : Supprimer l'ancienne source de données**

```bash
git rm src/app/data/shopping-list.ts
```

Vérifier qu'aucune référence ne subsiste :

```bash
grep -rn "shopping-list" src/ --include='*.ts' --include='*.html'
```

Attendu : aucun résultat (le fichier `details-shopping-list.ts` a un nom distinct et reste en place).

- [ ] **Étape 10 : Lancer toute la suite**

```bash
npm run test:coverage && npm run lint
```

Attendu : tous les specs PASS, seuils de couverture respectés, lint sans warning.

- [ ] **Étape 11 : Vérification manuelle de bout en bout**

Backend et frontend démarrés, `stripe listen` actif.

- `/boutique` affiche les 11 produits, prix corrects
- si le backend est arrêté, la page affiche « La boutique est momentanément indisponible. » sans planter
- cliquer « Acheter » sur un textile ouvre la modale avec le sélecteur de taille ; sur le tapis de souris, aucun sélecteur de taille
- « Payer » redirige vers Stripe Checkout, avec le bon montant et le formulaire d'adresse
- payer avec `4242 4242 4242 4242` redirige vers `/boutique/merci`
- la commande apparaît dans `/admin/commandes` au statut « Payée », avec la bonne taille et la bonne adresse
- la notification est arrivée sur Discord et par mail
- annuler le paiement sur Stripe ramène sur `/boutique` sans créer de commande

- [ ] **Étape 12 : Commit et ouverture de la PR 4**

```bash
git add -A
git commit -m "feat(boutique): brancher la page sur l'API et le paiement Stripe"
git push -u origin feat/boutique-checkout
gh pr create --base develop --title "feat(boutique): brancher le parcours d'achat sur Stripe" --body "$(cat <<'EOF'
Derniere brique : la boutique publique consomme le catalogue serveur et le bouton
« Acheter » lance un paiement Stripe au lieu de renvoyer vers eliminate.fr.

## Contenu

- Service `ShopService` (catalogue + checkout)
- Modale d'achat : selecteur de taille et de quantite, aucun prix transmis au serveur
- Page `/boutique/merci` apres paiement
- `shopping-list.ts` supprime au profit de `GET /api/shop/products`
- Les descriptions produit restent cote client (`details-shopping-list.ts`) : les faire
  transiter par l'API transformerait le `[innerHTML]` de `shop-item` en vecteur XSS

## Verifie manuellement

Parcours complet : catalogue -> modale -> Stripe -> `/boutique/merci` -> commande visible
dans `/admin/commandes` -> notifications Discord et mail recues.

https://claude.ai/code/session_016wgAvfhXFiX7HFnnhnUMw1
EOF
)"
```
