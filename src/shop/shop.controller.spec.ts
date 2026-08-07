import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { ShopConfirmationService } from './shop-confirmation.service';
import { ShopProductsService } from './shop-products.service';

describe('ShopController', () => {
  let controller: ShopController;

  const mockCheckoutService = { createCheckout: jest.fn() };
  const mockWebhookService = { handleEvent: jest.fn() };
  const mockProductsService = { findPublicCatalog: jest.fn(), findPublicBySlug: jest.fn() };
  const mockConfirmationService = { findBySessionId: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: ShopProductsService, useValue: mockProductsService },
        { provide: ShopCheckoutService, useValue: mockCheckoutService },
        { provide: ShopWebhookService, useValue: mockWebhookService },
        { provide: ShopConfirmationService, useValue: mockConfirmationService },
      ],
    }).compile();
    controller = module.get<ShopController>(ShopController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('getCatalog', () => {
    it('délègue au service catalogue', async () => {
      const catalog = { products: [], shippingFeeCents: 590, currency: 'eur', shopEnabled: true };
      mockProductsService.findPublicCatalog.mockResolvedValue(catalog);

      await expect(controller.getCatalog()).resolves.toBe(catalog);
    });
  });

  describe('getProduct', () => {
    it('résout un produit par son slug', async () => {
      const product = { id: 1, slug: 'maillot-2026-joker' };
      mockProductsService.findPublicBySlug.mockResolvedValue(product);

      await expect(controller.getProduct('maillot-2026-joker')).resolves.toBe(product);
      expect(mockProductsService.findPublicBySlug).toHaveBeenCalledWith('maillot-2026-joker');
    });
  });

  describe('getOrderConfirmation', () => {
    it("delegue au service de confirmation l'identifiant de session recu", async () => {
      const confirmation = { reference: 'DVG-2026-0001', firstName: 'Maxime', paid: true };
      mockConfirmationService.findBySessionId.mockResolvedValue(confirmation);

      await expect(controller.getOrderConfirmation('cs_test_abc123')).resolves.toBe(confirmation);
      expect(mockConfirmationService.findBySessionId).toHaveBeenCalledWith('cs_test_abc123');
    });
  });

  describe('createCheckout', () => {
    it('délègue au service et retourne son résultat', async () => {
      mockCheckoutService.createCheckout.mockResolvedValue({ url: 'https://stripe/cs_1' });
      const dto = { items: [{ productId: 1, size: 'M', quantity: 1 }] };

      await expect(controller.createCheckout(dto)).resolves.toEqual({
        url: 'https://stripe/cs_1',
      });
      // Le bareme public est transmis explicitement : le tunnel anonyme
      // n'accorde aucun tarif reserve et n'a pas d'acheteur identifie.
      expect(mockCheckoutService.createCheckout).toHaveBeenCalledWith(dto, {
        tier: 'PUBLIC',
        buyerUserId: null,
      });
    });
  });

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
});
