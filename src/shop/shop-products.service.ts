import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettingsService } from './shop-settings.service';
import { CreateShopProductDto, UpdateShopProductDto } from './dto/shop-product.dto';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';

/** Vue publique d'un produit : ni cout interne, ni champ d'administration. */
export interface PublicShopProduct {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  imageFront: string | null;
  imageBack: string | null;
  imageCard: string | null;
  allowFlocking: boolean;
  flockingFeeCents: number;
  flockingTopPct: number;
  flockingLeftPct: number;
  sizes: string[];
}

export interface PublicCatalog {
  products: PublicShopProduct[];
  /** Tarifs de livraison factures au client, par mode. */
  shippingStandardCents: number;
  shippingExpressCents: number;
  /** Panier a partir duquel le port est offert. 0 = pas de franchise. */
  freeShippingThresholdCents: number;
  currency: string;
  /** Permet au front d'afficher un message de fermeture plutot qu'une page vide. */
  shopEnabled: boolean;
}

const withSizes = { sizes: { orderBy: { position: 'asc' } } } as const;

@Injectable()
export class ShopProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ShopSettingsService,
  ) {}

  /**
   * Catalogue public. Les frais de port voyagent avec les produits : le panier
   * doit afficher le total sans second aller-retour, et surtout afficher le
   * meme montant que celui qui sera facture.
   */
  async findPublicCatalog(): Promise<PublicCatalog> {
    const settings = await this.settings.get();

    // Boutique fermee : on ne divulgue pas le catalogue ni les prix.
    const products = settings.shopEnabled
      ? await this.prisma.shopProduct.findMany({
          where: { active: true },
          include: withSizes,
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        })
      : [];

    return {
      products: products.map(toPublicProduct),
      shippingStandardCents: settings.shippingStandardCents,
      shippingExpressCents: settings.shippingExpressCents,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
      currency: settings.currency,
      shopEnabled: settings.shopEnabled,
    };
  }

  async findPublicBySlug(slug: string): Promise<PublicShopProduct> {
    const settings = await this.settings.get();
    if (!settings.shopEnabled) {
      throw new NotFoundException('Produit introuvable');
    }

    const product = await this.prisma.shopProduct.findFirst({
      where: { slug, active: true },
      include: withSizes,
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }
    return toPublicProduct(product);
  }

  /** Vue admin : inclut les produits inactifs. */
  async findAllForAdmin() {
    return this.prisma.shopProduct.findMany({
      include: withSizes,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }

  async findOneForAdmin(id: number) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id },
      include: withSizes,
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }
    return product;
  }

  async create(dto: CreateShopProductDto) {
    const { sizes, ...data } = dto;
    try {
      return await this.prisma.shopProduct.create({
        data: {
          ...data,
          sizes: { create: normalizeSizes(sizes) },
        },
        include: withSizes,
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(`Le slug « ${dto.slug} » est déjà utilisé`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateShopProductDto) {
    await this.findOneForAdmin(id);
    const { sizes, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (sizes) {
        // Remplacement integral : les tailles n'ont pas d'identite metier propre,
        // et les commandes passees conservent leur taille en instantane.
        await tx.shopProductSize.deleteMany({ where: { productId: id } });
        await tx.shopProductSize.createMany({
          data: normalizeSizes(sizes).map((size) => ({ ...size, productId: id })),
        });
      }
      return tx.shopProduct.update({ where: { id }, data, include: withSizes });
    });
  }

  async remove(id: number) {
    await this.findOneForAdmin(id);
    // Les lignes de commande passent en productId nul (onDelete: SetNull) et
    // gardent leur libelle en instantane : l'historique reste lisible.
    await this.prisma.shopProduct.delete({ where: { id } });
  }
}

function normalizeSizes(sizes: string[]): { label: string; position: number }[] {
  const seen = new Set<string>();
  const normalized: { label: string; position: number }[] = [];

  for (const raw of sizes) {
    const label = raw.trim().toUpperCase();
    if (label.length === 0 || seen.has(label)) {
      continue;
    }
    seen.add(label);
    normalized.push({ label, position: normalized.length });
  }

  if (normalized.length === 0) {
    throw new BadRequestException('Au moins une taille valide est obligatoire');
  }
  return normalized;
}

type ProductWithSizes = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  imageFront: string | null;
  imageBack: string | null;
  imageCard: string | null;
  allowFlocking: boolean;
  flockingFeeCents: number;
  flockingTopPct: number;
  flockingLeftPct: number;
  sizes: { label: string }[];
};

function toPublicProduct(product: ProductWithSizes): PublicShopProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    priceCents: product.priceCents,
    imageFront: product.imageFront,
    imageBack: product.imageBack,
    imageCard: product.imageCard,
    allowFlocking: product.allowFlocking,
    flockingFeeCents: product.flockingFeeCents,
    flockingTopPct: product.flockingTopPct,
    flockingLeftPct: product.flockingLeftPct,
    sizes: product.sizes.map((size) => size.label),
  };
}
