import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettingsService } from './shop-settings.service';
import {
  CreateShopProductDto,
  ShopProductImageDto,
  UpdateShopProductDto,
} from './dto/shop-product.dto';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';

/** Un visuel tel que le front l'affiche dans le rail de la fiche produit. */
export interface PublicProductImage {
  url: string;
  label: string;
  isBack: boolean;
}

/** Vue publique d'un produit : ni cout interne, ni champ d'administration. */
export interface PublicShopProduct {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  /** Galerie ordonnee. La premiere entree est la vue d'ouverture de la fiche. */
  images: PublicProductImage[];
  /** Vignette de la liste boutique, a defaut la premiere image. */
  cardImage: string | null;
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
  /** Panier a partir duquel le port est offert. 0 = pas de franchise. */
  freeShippingThresholdCents: number;
  currency: string;
  /** Permet au front d'afficher un message de fermeture plutot qu'une page vide. */
  shopEnabled: boolean;
}

const withSizes = {
  sizes: { orderBy: { position: 'asc' } },
  images: { orderBy: { position: 'asc' } },
} as const;

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
    const { sizes, images, ...data } = dto;
    assertPromotionConsistent(dto.priceCents, dto);
    try {
      return await this.prisma.shopProduct.create({
        data: {
          ...data,
          sizes: { create: normalizeSizes(sizes) },
          images: { create: normalizeImages(images ?? []) },
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
    const current = await this.findOneForAdmin(id);
    const { sizes, images, ...data } = dto;

    // Le prix catalogue n'est pas forcement dans la requete : une promotion
    // peut etre posee sans y toucher. C'est donc le prix qui sera en base
    // apres la mise a jour qui sert de reference, pas celui du corps.
    assertPromotionConsistent(dto.priceCents ?? current.priceCents, {
      promoPriceCents:
        dto.promoPriceCents === undefined ? current.promoPriceCents : dto.promoPriceCents,
      promoStartsAt: dto.promoStartsAt === undefined ? current.promoStartsAt : dto.promoStartsAt,
      promoEndsAt: dto.promoEndsAt === undefined ? current.promoEndsAt : dto.promoEndsAt,
    });

    return this.prisma.$transaction(async (tx) => {
      if (sizes) {
        // Remplacement integral : les tailles n'ont pas d'identite metier propre,
        // et les commandes passees conservent leur taille en instantane.
        await tx.shopProductSize.deleteMany({ where: { productId: id } });
        await tx.shopProductSize.createMany({
          data: normalizeSizes(sizes).map((size) => ({ ...size, productId: id })),
        });
      }
      if (images) {
        // Meme raisonnement que les tailles : l'ordre recu fait foi, et les
        // commandes passees ne referencent pas ces visuels.
        await tx.shopProductImage.deleteMany({ where: { productId: id } });
        await tx.shopProductImage.createMany({
          data: normalizeImages(images).map((image) => ({ ...image, productId: id })),
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

/**
 * Refuse une promotion qui n'en serait pas une.
 *
 * Un prix promotionnel superieur ou egal au prix catalogue serait un defaut
 * invisible en base et bien visible en caisse ; le calcul du panier l'ignore
 * deja par securite, mais laisser enregistrer une saisie qui ne produira aucun
 * effet est une fausse confirmation donnee a l'administrateur.
 *
 * La fenetre inversee est refusee pour la meme raison : elle s'enregistre sans
 * broncher et ne s'applique jamais.
 */
function assertPromotionConsistent(
  priceCents: number,
  promotion: {
    promoPriceCents?: number | null;
    promoStartsAt?: string | Date | null;
    promoEndsAt?: string | Date | null;
  },
): void {
  const { promoPriceCents, promoStartsAt, promoEndsAt } = promotion;

  if (promoPriceCents !== null && promoPriceCents !== undefined) {
    if (promoPriceCents >= priceCents) {
      throw new BadRequestException('Le prix promotionnel doit être inférieur au prix catalogue');
    }
  }

  if (promoStartsAt && promoEndsAt && new Date(promoEndsAt) <= new Date(promoStartsAt)) {
    throw new BadRequestException('La fin de la promotion doit être postérieure à son début');
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

interface NormalizedImage {
  url: string;
  label: string;
  position: number;
  isBack: boolean;
  isCard: boolean;
}

/**
 * Met la galerie en forme : ordre du tableau, doublons d'adresse ecartes, et
 * une seule vignette de vitrine.
 *
 * La vignette est unique par construction plutot que par contrainte de base :
 * deux images marquees vitrine ne sont pas une erreur de saisie a rejeter, mais
 * une ambiguite a trancher — la premiere gagne, l'ecran affiche le resultat.
 */
function normalizeImages(images: ShopProductImageDto[]): NormalizedImage[] {
  const seen = new Set<string>();
  const normalized: NormalizedImage[] = [];

  for (const raw of images) {
    const url = raw.url.trim();
    const label = raw.label.trim();
    if (url.length === 0 || label.length === 0 || seen.has(url)) {
      continue;
    }
    seen.add(url);
    normalized.push({
      url,
      label,
      position: normalized.length,
      isBack: raw.isBack ?? false,
      isCard: raw.isCard ?? false,
    });
  }

  const firstCard = normalized.findIndex((image) => image.isCard);
  for (const image of normalized) {
    image.isCard = false;
  }
  // Sans choix explicite, la vue d'ouverture fait la vignette : c'est ce que
  // l'oeil attend, et cela evite une liste sans aucune image en vitrine.
  const cardIndex = firstCard === -1 ? 0 : firstCard;
  if (normalized[cardIndex]) {
    normalized[cardIndex].isCard = true;
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
  allowFlocking: boolean;
  flockingFeeCents: number;
  flockingTopPct: number;
  flockingLeftPct: number;
  sizes: { label: string }[];
  images: { url: string; label: string; isBack: boolean; isCard: boolean }[];
};

function toPublicProduct(product: ProductWithSizes): PublicShopProduct {
  const images = product.images.map((image) => ({
    url: image.url,
    label: image.label,
    isBack: image.isBack,
  }));
  const card = product.images.find((image) => image.isCard) ?? product.images[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    priceCents: product.priceCents,
    images,
    cardImage: card?.url ?? null,
    allowFlocking: product.allowFlocking,
    flockingFeeCents: product.flockingFeeCents,
    flockingTopPct: product.flockingTopPct,
    flockingLeftPct: product.flockingLeftPct,
    sizes: product.sizes.map((size) => size.label),
  };
}
