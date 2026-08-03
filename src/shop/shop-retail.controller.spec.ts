import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../common/constants/permissions';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopController } from './shop.controller';
import { ShopRetailController } from './shop-retail.controller';

/**
 * Ces tests portent sur le **montage** de la route, pas sur son resultat.
 *
 * `@RequirePermission(...)` seul n'est que de la metadonnee : c'est le garde
 * qui la lit. Un oubli du garde, ou un `@Public()` remonte au niveau de la
 * classe lors d'une refactorisation, ouvre le tarif reserve a n'importe quel
 * compte authentifie — sans erreur de compilation ni test rouge. D'ou ces
 * assertions, qui ne testent rien d'autre que « les decorateurs sont bien la ».
 */
describe('ShopRetailController — verrouillage', () => {
  const reflector = new Reflector();
  // Recupere par descripteur plutot que par acces direct : lire une methode de
  // prototype comme une valeur declenche `unbound-method`, et la lier ici
  // n'aurait aucun sens puisqu'on ne l'appelle pas.
  const handler = Object.getOwnPropertyDescriptor(
    ShopRetailController.prototype,
    'createRetailCheckout',
  )?.value as object;

  it('exige la permission boutique:retail', () => {
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, handler);

    expect(permissions).toEqual([PERMISSIONS.BOUTIQUE_RETAIL]);
  });

  it('exige une permission distincte de l’administration du catalogue', () => {
    // Administrer le catalogue et acheter sous le prix public sont deux droits
    // sans rapport. Les confondre donnerait le tarif a quiconque peut corriger
    // une faute dans une fiche produit.
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, handler) ?? [];

    expect(permissions).not.toContain(PERMISSIONS.BOUTIQUE_WRITE);
    expect(permissions).not.toContain(PERMISSIONS.BOUTIQUE_READ);
  });

  it('monte PermissionsGuard sur la route', () => {
    // Sans ce garde, la metadonnee ci-dessus n'est jamais lue.
    const guards = Reflect.getMetadata('__guards__', handler) as unknown[] | undefined;

    expect(guards).toBeDefined();
    expect(guards).toContain(PermissionsGuard);
  });

  it('n’est publique ni au niveau de la methode ni au niveau de la classe', () => {
    expect(reflector.get(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(reflector.get(IS_PUBLIC_KEY, ShopRetailController)).toBeUndefined();
  });

  it('vit hors de ShopController, dont toutes les routes sont publiques', () => {
    // `JwtAuthGuard` lit `@Public()` sur la classe autant que sur le handler.
    // Tant que ces deux controleurs restent distincts, factoriser les
    // `@Public()` de ShopController ne peut pas rendre le tarif reserve anonyme.
    expect(ShopRetailController).not.toBe(ShopController);
    expect(Object.getPrototypeOf(ShopRetailController.prototype)).not.toBe(
      ShopController.prototype,
    );
  });

  it('transmet le bareme et l’acheteur depuis le jeton, jamais depuis le corps', async () => {
    const checkout = { createCheckout: jest.fn().mockResolvedValue({ url: 'https://stripe' }) };
    const controller = new ShopRetailController(checkout as unknown as ShopCheckoutService);

    // Le corps tente d'imposer un bareme et un beneficiaire.
    const dto = {
      items: [{ productId: 1, size: 'M', quantity: 1 }],
      tier: 'RETAIL',
      buyerUserId: 999,
    } as never;

    await controller.createRetailCheckout(dto, { user: { id: 7 } });

    expect(checkout.createCheckout).toHaveBeenCalledWith(dto, {
      tier: 'RETAIL',
      // 7, celui du jeton — pas 999, celui du corps.
      buyerUserId: 7,
    });
  });
});
