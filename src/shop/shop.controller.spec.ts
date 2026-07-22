import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';

describe('ShopController', () => {
  let controller: ShopController;

  const mockCheckoutService = { createCheckout: jest.fn() };
  const mockWebhookService = { handleEvent: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: ShopCheckoutService, useValue: mockCheckoutService },
        { provide: ShopWebhookService, useValue: mockWebhookService },
      ],
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
