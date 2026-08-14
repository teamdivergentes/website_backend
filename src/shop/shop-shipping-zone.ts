import Stripe from 'stripe';

/**
 * Zone de livraison de la boutique.
 *
 * La liste sert d'unique autorite sur les destinations acceptees : elle borne
 * les pays proposes par Stripe au moment de saisir l'adresse. Un pays absent
 * d'ici est un pays ou l'on ne peut pas commander, point final.
 *
 * Perimetre retenu : les 27 Etats membres de l'Union, les quatre Etats de
 * l'AELE, le Royaume-Uni et Monaco. C'est « l'Europe » au sens ou la boutique
 * l'annonce au client, et cela reste une liste fermee — l'Europe geographique
 * au sens large (Balkans hors UE, Ukraine, Turquie) en est volontairement
 * exclue, faute d'avoir chiffre le port et les formalites vers ces pays.
 *
 * Le libelle affiche au client vit dans le frontend
 * (`SHOP_LEGAL.shippingZoneLabel`) : les deux doivent decrire la meme zone.
 * Ajouter un pays ici sans corriger les CGV vend une prestation que le contrat
 * ne couvre pas.
 */

/** Les 27 Etats membres de l'Union europeenne. */
const EUROPEAN_UNION = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
] as const;

/**
 * Etats europeens hors Union desservis malgre tout. Ils imposent une
 * declaration douaniere a l'export, et d'eventuels droits ou TVA a l'import
 * restent a la charge du destinataire : les CGV doivent le dire.
 */
const NON_EU_EUROPE = ['CH', 'GB', 'IS', 'LI', 'MC', 'NO'] as const;

/**
 * Pays ou la boutique livre, au format attendu par
 * `shipping_address_collection.allowed_countries`.
 */
export const SHIPPING_COUNTRIES: readonly Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  [...EUROPEAN_UNION, ...NON_EU_EUROPE];

/**
 * Libelle du mode de livraison affiche sur la page de paiement Stripe et sur
 * le recu client. Il doit rester coherent avec la zone ci-dessus : annoncer
 * « France » alors que l'on encaisse une commande allemande est trompeur.
 */
export const SHIPPING_DISPLAY_NAME = 'Livraison Europe';
