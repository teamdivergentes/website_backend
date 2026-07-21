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
