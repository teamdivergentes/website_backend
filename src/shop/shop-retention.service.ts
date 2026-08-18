import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';

/**
 * Delai de prescription contractuelle (art. L110-4 C. com.) : passe ce delai,
 * les coordonnees du client n'ont plus de justification pour rester en base.
 * Les montants et lignes de commande, eux, sont conserves 10 ans au titre des
 * pieces comptables — on ne touche donc jamais aux montants ni aux dates.
 */
const CUSTOMER_DATA_RETENTION_YEARS = 5;

/**
 * Une commande PENDING est une session de paiement Stripe qui n'a jamais ete
 * confirmee par le webhook (cf. commentaire sur `OrderStatus.PENDING` dans le
 * schema). Passe ce delai, ce n'est plus un panier en cours et elle ne doit pas
 * s'accumuler indefiniment.
 *
 * Le seuil est volontairement plus long que la fenetre de reessai de Stripe,
 * pour qu'un webhook simplement en retard ne soit jamais traite comme un
 * abandon. L'age ne decide de toute facon rien seul : c'est Stripe qui tranche.
 */
const ABANDONED_PENDING_MAX_AGE_DAYS = 7;

/**
 * Valeurs neutres utilisees pour remplacer les coordonnees personnelles.
 *
 * Toute colonne d'identite ajoutee a `Order` doit etre reportee ici, sans quoi
 * la purge de retention laisse derriere elle la donnee qu'elle est censee
 * effacer — et le manque ne se voit nulle part, puisque l'anonymisation
 * continue de rendre un compte non nul.
 */
const ANONYMIZED_ORDER_FIELDS = {
  customerEmail: '',
  customerName: '',
  customerFirstName: '',
  customerLastName: '',
  shippingAddress: {},
};

export interface AnonymizationResult {
  ordersAnonymized: number;
  flockingTextsCleared: number;
}

export interface PendingPurgeResult {
  /** Sessions dont Stripe confirme qu'elles n'ont jamais abouti. */
  ordersDeleted: number;
  /** Cas douteux, sortis des paniers en cours mais conserves. */
  ordersCancelled: number;
  /** Paiements encaisses chez Stripe que le webhook n'a jamais confirmes. */
  ordersKeptPaid: number;
}

interface PendingCandidate {
  id: number;
  reference: string;
  stripeSessionId: string;
}

interface SortedCandidates {
  deletable: number[];
  doubtful: number[];
  paid: number[];
}

/**
 * Purge RGPD de la boutique. Deux obligations distinctes cohabitent ici :
 * anonymiser (pas supprimer) les commandes anciennes pour conserver la piece
 * comptable, et faire le menage parmi les paniers jamais payes, qui n'en sont
 * pas. Ce second menage ne detruit jamais sur la seule foi d'une date : c'est
 * Stripe qui dit si une session a abouti.
 *
 * Chaque methode publique est concue pour tourner sans supervision (cron) :
 * elle ne leve jamais d'exception non maitrisee, journalise son resultat, et
 * peut etre rejouee sans effet de bord si elle a deja tourne le jour meme.
 */
@Injectable()
export class ShopRetentionService {
  private readonly logger = new Logger(ShopRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Point d'entree planifie. Purge d'abord les paniers abandonnes (plus
   * simple, aucune dependance) puis anonymise les commandes anciennes.
   * Chaque etape gere deja ses propres erreurs : celle-ci ne fait qu'orchestrer
   * et ne doit donc jamais faire echouer le scheduler NestJS.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyRetentionJob(): Promise<void> {
    try {
      await this.purgeAbandonedPendingOrders();
      await this.anonymizeOldOrders();
    } catch (error) {
      // Filet de securite ultime : un plantage ici ne doit jamais empecher le
      // reste de l'application de tourner, ni arreter les executions futures.
      this.logger.error(
        `Purge RGPD interrompue de facon inattendue : ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Anonymise les commandes dont la commande date de plus de 5 ans. Les
   * montants, la reference, les lignes et les dates restent intacts — seules
   * les coordonnees personnelles et le flocage (saisi librement par le
   * client, donc une donnee personnelle a part entiere) sont effaces.
   *
   * Exclut les PENDING : elles sont purgees entierement par
   * `purgeAbandonedPendingOrders`, pas anonymisees.
   *
   * Idempotent par construction : le filtre `OR` ne retient que les
   * commandes qui portent encore une donnee a effacer, donc une deuxieme
   * execution le meme jour ne trouve rien a faire.
   */
  async anonymizeOldOrders(): Promise<AnonymizationResult> {
    try {
      const cutoff = this.cutoffDate(CUSTOMER_DATA_RETENTION_YEARS, 'years');

      const targets = await this.prisma.order.findMany({
        where: {
          createdAt: { lt: cutoff },
          status: { not: 'PENDING' },
          // Une commande ne portant plus que son prenom et son nom separes doit
          // rester eligible : le filtre sert l'idempotence, pas la selection.
          OR: [
            { customerEmail: { not: '' } },
            { customerName: { not: '' } },
            { customerFirstName: { not: '' } },
            { customerLastName: { not: '' } },
          ],
        },
        select: { id: true },
      });

      if (targets.length === 0) {
        return { ordersAnonymized: 0, flockingTextsCleared: 0 };
      }

      const orderIds = targets.map((order) => order.id);

      const { count: ordersAnonymized } = await this.prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: ANONYMIZED_ORDER_FIELDS,
      });
      const { count: flockingTextsCleared } = await this.prisma.orderItem.updateMany({
        where: { orderId: { in: orderIds }, flockingText: { not: null } },
        data: { flockingText: null },
      });

      this.logger.log(
        `RGPD : ${ordersAnonymized} commande(s) anonymisee(s), ${flockingTextsCleared} flocage(s) efface(s)`,
      );

      return { ordersAnonymized, flockingTextsCleared };
    } catch (error) {
      this.logger.error(
        `Echec de l'anonymisation RGPD des commandes : ${(error as Error).message}`,
        (error as Error).stack,
      );
      return { ordersAnonymized: 0, flockingTextsCleared: 0 };
    }
  }

  /**
   * Traite les commandes PENDING vieilles de plus de 7 jours.
   *
   * L'age seul ne prouve rien. Une commande peut rester PENDING alors que le
   * client a bel et bien paye, si le webhook n'est jamais arrive : Stripe
   * n'insiste que trois jours environ. Or c'est precisement ici que vit ce que
   * Stripe n'a pas — le detail du panier et le texte de flocage, trop volumineux
   * pour ses metadonnees. Supprimer sur le seul critere de la date reviendrait
   * donc a effacer la seule trace de ce qu'un client a paye.
   *
   * Stripe est donc interroge commande par commande, et il n'y a suppression
   * que sur un verdict explicite. En cas de doute, la commande est basculee en
   * CANCELLED : elle sort des paniers en cours sans rien detruire.
   */
  async purgeAbandonedPendingOrders(): Promise<PendingPurgeResult> {
    try {
      const cutoff = this.cutoffDate(ABANDONED_PENDING_MAX_AGE_DAYS, 'days');

      const candidates = await this.prisma.order.findMany({
        where: { status: 'PENDING', createdAt: { lt: cutoff } },
        select: { id: true, reference: true, stripeSessionId: true },
      });

      if (candidates.length === 0) {
        return { ordersDeleted: 0, ordersCancelled: 0, ordersKeptPaid: 0 };
      }

      const sorted = await this.sortByStripeOutcome(candidates);

      const { count: ordersDeleted } = await this.prisma.order.deleteMany({
        where: { id: { in: sorted.deletable }, status: 'PENDING' },
      });
      const { count: ordersCancelled } = await this.prisma.order.updateMany({
        where: { id: { in: sorted.doubtful }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(
        `RGPD : ${ordersDeleted} panier(s) abandonne(s) purge(s), ` +
          `${ordersCancelled} annule(s) par precaution, ${sorted.paid.length} paiement(s) orphelin(s) conserve(s)`,
      );

      return { ordersDeleted, ordersCancelled, ordersKeptPaid: sorted.paid.length };
    } catch (error) {
      this.logger.error(
        `Echec de la purge des paniers abandonnes : ${(error as Error).message}`,
        (error as Error).stack,
      );
      return { ordersDeleted: 0, ordersCancelled: 0, ordersKeptPaid: 0 };
    }
  }

  /**
   * Repartit les candidats selon ce que Stripe dit de leur session.
   *
   * Une commande dont l'identifiant de session est reste au marqueur
   * provisoire `pending:` n'est pas interrogeable : la session Stripe existe
   * peut-etre, mais plus rien ne permet de la retrouver. Elle rejoint donc les
   * douteuses, jamais les supprimables.
   */
  private async sortByStripeOutcome(candidates: PendingCandidate[]): Promise<SortedCandidates> {
    const sorted: SortedCandidates = { deletable: [], doubtful: [], paid: [] };

    for (const order of candidates) {
      if (order.stripeSessionId.startsWith('pending:')) {
        sorted.doubtful.push(order.id);
        continue;
      }

      const outcome = await this.stripe.getSessionOutcome(order.stripeSessionId);
      if (outcome === 'unpaid') {
        sorted.deletable.push(order.id);
      } else if (outcome === 'paid') {
        // Un paiement encaisse que le webhook n'a jamais confirme demande une
        // intervention humaine : on ne bascule pas en PAID ici, cela court-
        // circuiterait la notification et l'enregistrement des coordonnees.
        sorted.paid.push(order.id);
        this.logger.error(
          `Commande ${order.reference} payee chez Stripe mais restee PENDING : ` +
            'webhook jamais recu, a rapprocher manuellement.',
        );
      } else {
        sorted.doubtful.push(order.id);
      }
    }

    return sorted;
  }

  private cutoffDate(amount: number, unit: 'years' | 'days'): Date {
    const date = new Date();
    if (unit === 'years') {
      date.setFullYear(date.getFullYear() - amount);
    } else {
      date.setDate(date.getDate() - amount);
    }
    return date;
  }
}
