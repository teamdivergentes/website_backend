import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ShopCheckoutService } from './shop-checkout.service';

/** Ce que la strategie JWT depose sur la requete une fois le jeton valide. */
interface AuthenticatedRequest {
  user?: { id: number };
}

/**
 * Achat au tarif reserve.
 *
 * **Contrôleur separe de `ShopController`, et ce n'est pas une preference de
 * rangement.** Les quatre routes de `ShopController` sont `@Public()`, et
 * `JwtAuthGuard` lit cette metadonnee sur le handler *comme sur la classe*.
 * Poser cette route au milieu des autres la mettrait a une refactorisation de
 * distance de l'ouverture totale : factoriser quatre `@Public()` en un seul au
 * niveau de la classe est un geste naturel, qui « ne change rien », et qui
 * rendrait ce paiement anonyme.
 *
 * Ici, rien n'est public. Le jeton est exige par le garde global, la permission
 * par `PermissionsGuard`.
 */
@Controller()
export class ShopRetailController {
  constructor(private readonly checkoutService: ShopCheckoutService) {}

  /**
   * Cree une session de paiement au prix coutant.
   *
   * Le corps est **exactement celui de la route publique** : identifiants,
   * tailles, quantites, flocage. Aucun montant, aucun drapeau « retail ». Le
   * bareme est deduit ici, du jeton, et transmis au service ; le client n'a
   * aucun moyen de l'influencer. Le `ValidationPipe` global rejette d'ailleurs
   * tout champ inconnu qu'on tenterait d'y glisser.
   *
   * Le debit est volontairement plus bas que celui de la route publique : cette
   * route est nominative et son usage legitime se compte en unites par an.
   */
  @Post('api/shop/checkout/retail')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_RETAIL)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  createRetailCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ url: string }> {
    return this.checkoutService.createCheckout(dto, {
      tier: 'RETAIL',
      // Le garde a deja refuse la requete si l'utilisateur etait absent ou sans
      // la permission : `user` est necessairement present ici.
      buyerUserId: request.user?.id ?? null,
    });
  }
}
