import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiscountType, ShopDiscountCode } from '../../generated/prisma';
import {
  discountAmount,
  generateCode,
  isValidCodeShape,
  isWithinWindow,
  normalizeCode,
} from './shop-discount';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from './dto/discount-code.dto';

/** Un code retenu pour un panier, avec ce qu'il en retire. */
export interface AppliedDiscount {
  id: number;
  /** Libelle fige sur la commande : c'est lui qui rattache la vente a son operation. */
  code: string;
  amountCents: number;
}

@Injectable()
export class ShopDiscountService {
  private readonly logger = new Logger(ShopDiscountService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resout un code saisi par le client et calcule ce qu'il retire du panier.
   *
   * Le client ne transmet qu'une chaine : la valeur de la remise, ses bornes
   * et sa disponibilite sont lues ici. C'est ce qui preserve l'invariant de
   * `ShopPricingService` — aucun montant ne vient de la requete — alors meme
   * que le code est la premiere saisie client qui touche au prix.
   *
   * Leve une `BadRequestException` des que le code n'est pas utilisable : un
   * code refuse est une reponse au client, pas une panne.
   */
  async resolveForCart(
    rawCode: string,
    subtotalCents: number,
    now: Date = new Date(),
  ): Promise<AppliedDiscount> {
    const code = normalizeCode(rawCode);
    const discount = await this.prisma.shopDiscountCode.findUnique({ where: { code } });

    // Meme message pour un code inconnu et pour un code desactive : les
    // distinguer indiquerait a qui balaie l'endpoint quels codes existent.
    if (!discount || !discount.active) {
      throw new BadRequestException('Ce code de réduction est invalide');
    }

    if (!isWithinWindow(discount, now)) {
      throw new BadRequestException("Ce code de réduction n'est pas valable actuellement");
    }

    if (discount.minSubtotalCents !== null && subtotalCents < discount.minSubtotalCents) {
      throw new BadRequestException(
        `Ce code s'applique à partir de ${formatEuros(discount.minSubtotalCents)} d'achat`,
      );
    }

    if (await this.isExhausted(discount, now)) {
      throw new BadRequestException("Ce code de réduction n'est plus disponible");
    }

    const amountCents = discountAmount(discount, subtotalCents);
    if (amountCents <= 0) {
      throw new BadRequestException("Ce code ne s'applique pas à ce panier");
    }

    return { id: discount.id, code: discount.code, amountCents };
  }

  /**
   * Vrai quand le quota est atteint, reservations comprises.
   *
   * Deux populations s'y ajoutent :
   *
   * - les utilisations **consommees**, comptees a l'encaissement ;
   * - les utilisations **engagees**, c'est-a-dire les commandes `PENDING`
   *   dont la session de paiement est encore vivante.
   *
   * Sans le second terme, deux clients qui paient a quelques secondes
   * d'intervalle obtiennent tous deux un code a usage unique — et refuser le
   * second est impossible, il a deja paye.
   */
  private async isExhausted(discount: ShopDiscountCode, now: Date): Promise<boolean> {
    if (discount.maxUses === null) {
      return false;
    }
    if (discount.usedCount >= discount.maxUses) {
      return true;
    }

    const reserved = await this.countReservations(discount.id, now);
    return discount.usedCount + reserved >= discount.maxUses;
  }

  /**
   * Sessions de paiement encore ouvertes sur ce code.
   *
   * ⚠️ La borne est l'echeance de la session, **pas** l'age de la commande.
   * Les `PENDING` abandonnees sont conservees plusieurs jours par la
   * retention, le temps de verifier aupres de Stripe qu'elles n'ont pas ete
   * payees entre-temps ; les compter toutes bloquerait un code une semaine sur
   * un simple panier abandonne.
   *
   * Une `PENDING` sans echeance connue ne reserve rien : elle est anterieure a
   * cette fonctionnalite, ou sa session n'a jamais ete creee.
   */
  private countReservations(discountCodeId: number, now: Date): Promise<number> {
    return this.prisma.order.count({
      where: {
        discountCodeId,
        status: 'PENDING',
        sessionExpiresAt: { gt: now },
      },
    });
  }

  /**
   * Compte une utilisation, au passage en `PAID` et nulle part ailleurs.
   *
   * L'increment se fait en une instruction SQL : deux webhooks traites en
   * parallele ne peuvent pas lire la meme valeur avant de l'ecrire.
   *
   * Le depassement du quota est journalise sans etre bloque. A ce stade le
   * client a paye le montant remise ; lui refuser sa commande apres coup
   * serait pire que d'accorder une remise de trop.
   */
  async consume(discountCodeId: number): Promise<void> {
    const updated = await this.prisma.shopDiscountCode.update({
      where: { id: discountCodeId },
      data: { usedCount: { increment: 1 } },
    });

    if (updated.maxUses !== null && updated.usedCount > updated.maxUses) {
      this.logger.warn(
        `Code ${updated.code} utilisé ${updated.usedCount} fois pour un quota de ${updated.maxUses} : ` +
          'deux paiements ont abouti sur la même réservation',
      );
    }
  }

  // --- Administration ----------------------------------------------------

  /**
   * Liste des codes, avec leurs utilisations et leurs reservations en cours.
   *
   * Les reservations sont comptees en une seule requete groupee plutot qu'une
   * par code : la liste doit rester lisible quand les operations s'accumulent.
   */
  async findAllForAdmin(now: Date = new Date()): Promise<AdminDiscountCode[]> {
    const codes = await this.prisma.shopDiscountCode.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });

    const reservations = await this.prisma.order.groupBy({
      by: ['discountCodeId'],
      where: {
        discountCodeId: { not: null },
        status: 'PENDING',
        sessionExpiresAt: { gt: now },
      },
      _count: { _all: true },
    });
    const reservedById = new Map(reservations.map((row) => [row.discountCodeId, row._count._all]));

    return codes.map((code) => ({ ...code, reservedCount: reservedById.get(code.id) ?? 0 }));
  }

  async createForAdmin(dto: CreateDiscountCodeDto): Promise<ShopDiscountCode> {
    const code = normalizeCode(dto.code);
    assertShape(code);
    assertValue(dto.type, dto.value);
    assertWindow(dto.startsAt, dto.endsAt);

    try {
      return await this.prisma.shopDiscountCode.create({
        data: { ...dto, code },
      });
    } catch (error) {
      throw this.translateUniqueViolation(error, code);
    }
  }

  /**
   * Modifie un code existant.
   *
   * Le **code lui-meme** se fige a la premiere utilisation, alors que ses
   * conditions restent modifiables. La raison tient a ce qui est enregistre sur
   * la commande : elle garde le libelle du code, pas une reference. Renommer un
   * code deja servi rendrait ses ventes passees irrattachables a l'operation,
   * tandis qu'en changer la valeur ne casse rien — c'est le montant deduit qui
   * est fige.
   */
  async updateForAdmin(id: number, dto: UpdateDiscountCodeDto): Promise<ShopDiscountCode> {
    const current = await this.findOneOrThrow(id);
    const code = dto.code === undefined ? undefined : normalizeCode(dto.code);

    if (code !== undefined && code !== current.code && current.usedCount > 0) {
      throw new BadRequestException(
        'Ce code a déjà été utilisé : ses conditions restent modifiables, pas son libellé',
      );
    }

    assertValue(dto.type ?? current.type, dto.value ?? current.value);
    assertWindow(
      dto.startsAt === undefined ? current.startsAt : dto.startsAt,
      dto.endsAt === undefined ? current.endsAt : dto.endsAt,
    );

    try {
      return await this.prisma.shopDiscountCode.update({
        where: { id },
        data: { ...dto, ...(code === undefined ? {} : { code }) },
      });
    } catch (error) {
      throw this.translateUniqueViolation(error, code ?? current.code);
    }
  }

  /**
   * Supprime un code jamais utilise.
   *
   * Des la premiere vente, la suppression est fermee au profit de la
   * desactivation : elle couvre le besoin reel — arreter un code — sans rendre
   * l'historique des operations illisible.
   */
  async removeForAdmin(id: number): Promise<void> {
    const code = await this.findOneOrThrow(id);
    if (code.usedCount > 0) {
      throw new BadRequestException(
        'Ce code a déjà été utilisé et ne peut plus être supprimé : désactivez-le',
      );
    }
    await this.prisma.shopDiscountCode.delete({ where: { id } });
  }

  /**
   * Propose un code libre.
   *
   * Le generateur ne rend jamais un code deja pris : le nombre d'essais est
   * borne parce qu'un espace de 31^8 combinaisons rend la collision repetee
   * invraisemblable, et qu'une boucle sans borne sur une base saturee serait
   * pire que l'echec.
   */
  async suggestCode(): Promise<{ code: string }> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      const taken = await this.prisma.shopDiscountCode.findUnique({ where: { code } });
      if (!taken) {
        return { code };
      }
    }
    throw new InternalServerErrorException('Impossible de générer un code libre');
  }

  private async findOneOrThrow(id: number): Promise<ShopDiscountCode> {
    const code = await this.prisma.shopDiscountCode.findUnique({ where: { id } });
    if (!code) {
      throw new NotFoundException('Code de réduction introuvable');
    }
    return code;
  }

  /** Traduit la collision d'unicite en refus lisible plutot qu'en 500. */
  private translateUniqueViolation(error: unknown, code: string): unknown {
    const isUnique =
      typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

    return isUnique ? new BadRequestException(`Le code « ${code} » existe déjà`) : error;
  }
}

/** Le code doit rester saisissable et dictable apres normalisation. */
function assertShape(code: string): void {
  if (!isValidCodeShape(code)) {
    throw new BadRequestException(
      'Le code ne peut contenir que des lettres, chiffres et tirets (3 à 32 caractères)',
    );
  }
}

/**
 * Un pourcentage au-dela de 100 rendrait le panier negatif avant meme que le
 * plafond de `discountAmount` n'intervienne. Le DTO ne peut pas porter ce
 * controle : il valide `value` sans connaitre `type`.
 */
function assertValue(type: DiscountType, value: number): void {
  if (type === 'PERCENTAGE' && value > 100) {
    throw new BadRequestException('Une remise en pourcentage ne peut pas dépasser 100 %');
  }
}

/** Une fenetre inversee s'enregistre sans broncher et ne s'applique jamais. */
function assertWindow(
  startsAt: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
): void {
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new BadRequestException('La date de fin doit être postérieure à la date de début');
  }
}

/** Montant en euros pour un message destine au client. */
function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

/** Un code tel que l'administration le lit, engagements compris. */
export interface AdminDiscountCode extends ShopDiscountCode {
  /**
   * Sessions de paiement encore ouvertes sur ce code. Distinct de
   * `usedCount` : ce ne sont pas des ventes, seulement des reservations qui
   * peuvent expirer sans rien consommer.
   */
  reservedCount: number;
}
