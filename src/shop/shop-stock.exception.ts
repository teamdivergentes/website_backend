import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Une ligne de panier dont la quantite demandee depasse le stock restant.
 *
 * `available` est le stock reellement restant : exceptionnellement, une
 * quantite quitte le serveur ici alors que la reponse publique du catalogue
 * ne l'expose jamais. C'est une reponse d'erreur ciblee sur les lignes en
 * cause, pas un inventaire — la difference qui la rend acceptable.
 */
export interface OutOfStockItem {
  productId: number;
  sizeId: number;
  /**
   * Libelle de la taille, tel que la ligne du panier l'a transmis. Le
   * catalogue public n'expose pas d'identifiant de taille : sans ce libelle,
   * le client ne peut pas rattacher le refus a la bonne ligne de son panier.
   */
  size: string;
  requested: number;
  available: number;
}

/**
 * Refuse un panier avant tout appel a Stripe, quand au moins une ligne
 * depasse le stock geré restant.
 *
 * 409 : la requête était valide à l'écriture, mais l'état du stock l'empêche
 * d'aboutir — le cas d'usage canonique de ce code, plus proche du conflit
 * d'état que de l'entrée invalide (`BadRequestException`, 400).
 */
export class OutOfStockException extends HttpException {
  constructor(items: OutOfStockItem[]) {
    super({ code: 'OUT_OF_STOCK', items }, HttpStatus.CONFLICT);
  }
}
