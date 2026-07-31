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
    it('utilise le prix du catalogue serveur et ignore tout prix envoyé par le client', async () => {
      mockStripe.createCheckoutSession.mockResolvedValue({
        id: 'cs_1',
        url: 'https://stripe/cs_1',
      });

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
      mockStripe.createCheckoutSession.mockResolvedValue({
        id: 'cs_1',
        url: 'https://stripe/cs_1',
      });

      await service.createCheckout({ productId: 'maillotDvg_2023', size: 'L', quantity: 2 });

      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 2,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            productId: 'maillotDvg_2023',
            size: 'L',
            quantity: '2',
          }),
        }),
      );
    });

    it("retourne l'URL de paiement renvoyée par Stripe", async () => {
      mockStripe.createCheckoutSession.mockResolvedValue({
        id: 'cs_1',
        url: 'https://stripe/cs_1',
      });

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
