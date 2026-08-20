import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { ShopWebhookService, customFieldsIdentity } from './shop-webhook.service';
import { StripeService } from './stripe.service';
import { ShopNotifierService } from './shop-notifier.service';
import { PrismaService } from '../prisma.service';
import { ShopDiscountService } from './shop-discount.service';

describe('ShopWebhookService', () => {
  let service: ShopWebhookService;

  const mockStripe = {
    constructWebhookEvent: jest.fn(),
    // Commission constatee chez Stripe. Repond `null` par defaut : c'est le cas
    // degrade, celui qui doit rester sans effet sur l'enregistrement.
    getSessionFeeCents: jest.fn().mockResolvedValue(null),
  };
  const mockPrisma = {
    order: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
    shopProductSize: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    // `markPaid` decremente le stock dans la meme transaction que le passage
    // en PAID : l'implementation, posee dans le `beforeEach` ci-dessous,
    // rejoue le callback avec ce meme faux client (`tx` === `this.prisma`
    // depuis le service). Declaree nue ici pour eviter la reference
    // circulaire qu'introduirait `mockPrisma` dans son propre litteral.
    $transaction: jest.fn(),
  };
  const mockNotifier = { notifyNewOrder: jest.fn(), notifyStockShortfall: jest.fn() };
  const mockDiscounts = { consume: jest.fn() };

  const payload = Buffer.from('{}');
  const signature = 't=1,v1=abc';

  const completedEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_status: 'paid',
        payment_intent: 'pi_test_1',
        amount_total: 11570,
        currency: 'eur',
        customer_details: { email: 'client@example.com', name: 'Jean Dupont' },
        shipping_cost: { amount_total: 590 },
        // Stripe expose l'adresse sous collected_information depuis l'API 2025+
        collected_information: {
          shipping_details: {
            name: 'Jean Dupont',
            address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
          },
        },
        metadata: { orderId: '42', orderReference: 'DVG-2026-0001' },
      },
    },
  };

  const paidOrder = {
    id: 42,
    reference: 'DVG-2026-0001',
    customerEmail: 'client@example.com',
    items: [],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    // `resetAllMocks` retire aussi l'implementation posee sur `$transaction` :
    // elle doit etre reposee ici, apres coup, sans quoi le mock redevient un
    // jest.fn() nu qui ne rejoue jamais le callback de transaction.
    mockPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopWebhookService,
        { provide: StripeService, useValue: mockStripe },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopNotifierService, useValue: mockNotifier },
        { provide: ShopDiscountService, useValue: mockDiscounts },
      ],
    }).compile();
    service = module.get(ShopWebhookService);
  });

  describe('vérification de signature', () => {
    it('rejette un événement à signature invalide sans rien écrire', async () => {
      mockStripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error('signature invalide');
      });

      await expect(service.handleEvent(payload, signature)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed', () => {
    beforeEach(() => {
      mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(paidOrder);
    });

    it('bascule la commande en PAID avec les informations du client', async () => {
      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42, status: 'PENDING', stripeSessionId: 'cs_test_1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            status: 'PAID',
            stripeSessionId: 'cs_test_1',
            stripePaymentIntentId: 'pi_test_1',
            customerEmail: 'client@example.com',
            customerName: 'Jean Dupont',
          }),
        }),
      );
    });

    /**
     * Depuis que les moyens de paiement viennent du tableau de bord Stripe et
     * non plus d'une liste versionnee, une methode a notification differee
     * (SEPA, virement, Pay by Bank) peut etre activee d'un clic. Elle emet cet
     * evenement AVANT l'encaissement : sans ce garde-fou, la commande passerait
     * payee, le stock partirait et l'equipe expedierait un colis pour un
     * paiement qui peut encore echouer.
     */
    it('laisse la commande en attente quand le paiement est différé', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        ...completedEvent,
        data: { object: { ...completedEvent.data.object, payment_status: 'unpaid' } },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
      expect(mockDiscounts.consume).not.toHaveBeenCalled();
    });

    /**
     * Un total nul — remise couvrant tout le panier — n'attend aucun paiement.
     * Le refuser bloquerait une commande pourtant honoree ; `getSessionOutcome`
     * fait deja la meme lecture de ce statut.
     */
    it('traite une commande sans paiement requis', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        ...completedEvent,
        data: {
          object: { ...completedEvent.data.object, payment_status: 'no_payment_required' },
        },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).toHaveBeenCalled();
      expect(mockNotifier.notifyNewOrder).toHaveBeenCalledWith(paidOrder);
    });

    it('notifie l’équipe une fois la commande payée', async () => {
      await service.handleEvent(payload, signature);

      expect(mockNotifier.notifyNewOrder).toHaveBeenCalledWith(paidOrder);
    });

    describe('bon de réduction', () => {
      it('compte l’utilisation au paiement, et seulement là', async () => {
        mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
          ...paidOrder,
          discountCodeId: 7,
          discountCode: 'BIENVENUE',
        });

        await service.handleEvent(payload, signature);

        expect(mockDiscounts.consume).toHaveBeenCalledWith(7);
      });

      it('ne compte rien sur une commande sans code', async () => {
        await service.handleEvent(payload, signature);

        expect(mockDiscounts.consume).not.toHaveBeenCalled();
      });

      it('ne compte rien sur un rejeu de webhook', async () => {
        // Un code a usage unique ne doit pas etre brule deux fois parce que
        // Stripe a rejoue son evenement.
        mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

        await service.handleEvent(payload, signature);

        expect(mockDiscounts.consume).not.toHaveBeenCalled();
      });

      it('n’annule pas une commande payée si le comptage échoue', async () => {
        mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
          ...paidOrder,
          discountCodeId: 7,
          discountCode: 'BIENVENUE',
        });
        mockDiscounts.consume.mockRejectedValue(new Error('base injoignable'));

        await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
        expect(mockNotifier.notifyNewOrder).toHaveBeenCalled();
      });
    });

    describe('rapprochement du montant', () => {
      it('journalise un écart entre le total attendu et le montant encaissé', async () => {
        const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        mockPrisma.order.findUnique.mockResolvedValue({
          reference: 'DVG-2026-0001',
          totalCents: 11070,
          status: 'PENDING',
        });

        await service.handleEvent(payload, signature);

        expect(logged).toHaveBeenCalledWith(expect.stringContaining('Ecart de montant'));
        logged.mockRestore();
      });

      it('ne signale rien quand les montants concordent', async () => {
        const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        mockPrisma.order.findUnique.mockResolvedValue({
          reference: 'DVG-2026-0001',
          totalCents: 11570,
          status: 'PENDING',
        });

        await service.handleEvent(payload, signature);

        expect(logged).not.toHaveBeenCalled();
        logged.mockRestore();
      });

      it('n’entérine jamais la commande sur un écart : elle reste payée', async () => {
        // Le controle transforme une perte silencieuse en ligne de journal, il
        // ne bloque rien — le client a paye, la commande est due.
        mockPrisma.order.findUnique.mockResolvedValue({
          reference: 'DVG-2026-0001',
          totalCents: 99999,
          status: 'PENDING',
        });

        await service.handleEvent(payload, signature);

        expect(mockPrisma.order.updateMany).toHaveBeenCalled();
        expect(mockNotifier.notifyNewOrder).toHaveBeenCalled();
      });
    });

    it('ignore un rejeu : aucune seconde notification', async () => {
      // Le filtre sur status PENDING ne matche plus : la commande est deja payee.
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await service.handleEvent(payload, signature);

      expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
      expect(mockPrisma.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('ignore une session sans orderId exploitable', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        ...completedEvent,
        data: { object: { ...completedEvent.data.object, metadata: {} } },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('n’annule pas la commande si la notification échoue', async () => {
      // La commande est payee : elle doit exister meme si aucun mail ne part.
      mockNotifier.notifyNewOrder.mockRejectedValue(new Error('SMTP down'));

      await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
      expect(mockPrisma.order.updateMany).toHaveBeenCalled();
    });
  });

  describe('décompte de stock au paiement confirmé', () => {
    const paidOrderWithItems = {
      ...paidOrder,
      items: [
        { productId: 10, productName: 'Maillot', size: 'M', quantity: 2 },
        { productId: 20, productName: 'Hoodie', size: 'L', quantity: 1 },
      ],
    };

    beforeEach(() => {
      mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(paidOrderWithItems);
    });

    it('décrémente le stock des tailles gérées par une écriture atomique conditionnelle, dans la même transaction que le passage en PAID', async () => {
      mockPrisma.shopProductSize.updateMany.mockResolvedValue({ count: 1 });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.updateMany).toHaveBeenNthCalledWith(1, {
        where: { productId: 10, label: 'M', stock: { not: null, gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(mockPrisma.shopProductSize.updateMany).toHaveBeenNthCalledWith(2, {
        where: { productId: 20, label: 'L', stock: { not: null, gte: 1 } },
        data: { stock: { decrement: 1 } },
      });
      // Le decompte atomique a suffi : aucune relecture, aucune ecriture
      // supplementaire n'est necessaire.
      expect(mockPrisma.shopProductSize.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.update).not.toHaveBeenCalled();
    });

    it('ne perd aucune décrémentation sous accès concurrent : deux paiements simultanés sur la même taille ne s’écrasent pas', async () => {
      // Le mock illustre la garantie apportee par l'UPDATE conditionnel de
      // Postgres : la seconde transaction, serialisee par le verrou de ligne,
      // reevalue `stock >= quantite` sur la valeur DEJA decrementee par la
      // premiere — elle echoue proprement (count: 0) plutot que d'ecraser le
      // travail de l'autre avec une valeur calculee sur une lecture perimee.
      mockPrisma.shopProductSize.updateMany
        .mockResolvedValueOnce({ count: 1 }) // premier paiement : stock 2 -> 0
        .mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
        ...paidOrderWithItems,
        items: [{ productId: 10, productName: 'Maillot', size: 'M', quantity: 2 }],
      });

      await service.handleEvent(payload, signature);

      // Rien n'a ete lu avant d'ecrire : la condition vit dans le UPDATE
      // lui-meme, pas dans du code applicatif qui pourrait s'appuyer sur une
      // valeur obsolete.
      expect(mockPrisma.shopProductSize.findUnique).not.toHaveBeenCalled();
    });

    it('ignore une ligne dont le produit a été supprimé depuis (SetNull)', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
        ...paidOrderWithItems,
        items: [{ productId: null, productName: 'Maillot', size: 'M', quantity: 1 }],
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.shopProductSize.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.update).not.toHaveBeenCalled();
    });

    it('ignore une taille non gérée : le décompte atomique échoue, la relecture confirme un stock nul', async () => {
      mockPrisma.shopProductSize.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.shopProductSize.findUnique.mockResolvedValue({ id: 1, stock: null });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.shopProductSize.update).not.toHaveBeenCalled();
      expect(mockNotifier.notifyStockShortfall).not.toHaveBeenCalled();
    });

    it('borne le stock à zéro en cas de survente résiduelle, et notifie l’équipe', async () => {
      // Le decompte atomique de la premiere ligne echoue (stock insuffisant
      // au moment de l'ecriture) ; celui de la seconde reussit.
      mockPrisma.shopProductSize.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });
      mockPrisma.shopProductSize.findUnique.mockResolvedValueOnce({ id: 1, stock: 1 });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.shopProductSize.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: 0 },
      });
      expect(mockNotifier.notifyStockShortfall).toHaveBeenCalledWith(
        paidOrderWithItems,
        expect.arrayContaining([
          expect.objectContaining({
            productId: 10,
            size: 'M',
            sizeId: 1,
            requested: 2,
            available: 1,
          }),
        ]),
      );
    });

    it('ne notifie rien quand le stock suffit partout', async () => {
      mockPrisma.shopProductSize.updateMany.mockResolvedValue({ count: 1 });

      await service.handleEvent(payload, signature);

      expect(mockNotifier.notifyStockShortfall).not.toHaveBeenCalled();
    });

    it('ne touche pas au stock sur un rejeu de webhook', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.shopProductSize.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.shopProductSize.update).not.toHaveBeenCalled();
    });

    it('n’annule pas la commande si l’alerte de rupture de stock échoue', async () => {
      mockPrisma.shopProductSize.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValue({ count: 1 });
      mockPrisma.shopProductSize.findUnique.mockResolvedValueOnce({ id: 1, stock: 0 });
      mockNotifier.notifyStockShortfall.mockRejectedValue(new Error('SMTP down'));

      await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
    });
  });

  describe('autres événements', () => {
    it('ignore un type d’événement non géré', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.created',
        data: { object: {} },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });
});

/**
 * Le prenom et le nom viennent des champs personnalises de la page de
 * paiement. Toute session creee avant leur introduction n'en porte aucun : la
 * lecture doit rendre du vide, jamais lever, sous peine de perdre une commande
 * deja encaissee au moment ou le webhook l'enregistre.
 */
describe('customFieldsIdentity', () => {
  const sessionWith = (fields: unknown): Parameters<typeof customFieldsIdentity>[0] =>
    ({ custom_fields: fields }) as Parameters<typeof customFieldsIdentity>[0];

  it('lit le prenom et le nom par leur cle, quel que soit leur ordre', () => {
    const identity = customFieldsIdentity(
      sessionWith([
        { key: 'nom', type: 'text', text: { value: 'Dupont' } },
        { key: 'prenom', type: 'text', text: { value: 'Jean' } },
      ]),
    );

    expect(identity).toEqual({ firstName: 'Jean', lastName: 'Dupont' });
  });

  it('retire les espaces de bordure sans retailler la valeur', () => {
    const identity = customFieldsIdentity(
      sessionWith([
        { key: 'prenom', type: 'text', text: { value: '  Marie-Claire  ' } },
        { key: 'nom', type: 'text', text: { value: ' de La Tour ' } },
      ]),
    );

    expect(identity).toEqual({ firstName: 'Marie-Claire', lastName: 'de La Tour' });
  });

  it('rend du vide sur une session anterieure aux champs personnalises', () => {
    expect(customFieldsIdentity(sessionWith(undefined))).toEqual({ firstName: '', lastName: '' });
    expect(customFieldsIdentity(sessionWith([]))).toEqual({ firstName: '', lastName: '' });
  });

  it('ignore un champ personnalise etranger a l’identite', () => {
    const identity = customFieldsIdentity(
      sessionWith([{ key: 'message', type: 'text', text: { value: 'bonne chance' } }]),
    );

    expect(identity).toEqual({ firstName: '', lastName: '' });
  });
});
