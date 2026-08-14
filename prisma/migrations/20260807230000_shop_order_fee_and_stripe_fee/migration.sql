-- Frais fixes d'une commande, qui ne peuvent pas vivre dans `unitCostCents`
-- puisque celui-ci est multiplie par la quantite.
--
-- `orderFeeCents`  : traitement facture par le fournisseur, une fois par commande.
-- `stripeFeeCents` : commission Stripe reellement prelevee, lue au paiement.
--
-- Defaut a 0 : les commandes anterieures n'ont jamais porte ces montants, et
-- une marge historique surestimee de quelques euros vaut mieux qu'un chiffre
-- reconstitue apres coup avec les tarifs d'aujourd'hui.
ALTER TABLE "orders" ADD COLUMN "orderFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "stripeFeeCents" INTEGER NOT NULL DEFAULT 0;

-- Couts fournisseur repris TVA lettone comprise (21 %), et corriges :
--   fabrication   16,19 EUR HT -> 19,59 EUR
--   traitement     3,00 EUR HT ->  3,63 EUR
--   port standard  9,00 EUR HT -> 10,89 EUR
--   port rapide   12,00 EUR HT -> 14,52 EUR
--
-- Seules les valeurs par defaut changent : une installation existante garde ce
-- que l'administration y a saisi.
ALTER TABLE "shop_settings" ALTER COLUMN "costProductionCents" SET DEFAULT 1959;
ALTER TABLE "shop_settings" ALTER COLUMN "costEcommerceCents" SET DEFAULT 363;
ALTER TABLE "shop_settings" ALTER COLUMN "costShippingStandardCents" SET DEFAULT 1089;

-- Retrait de l'option de livraison rapide.
--
-- Elle annoncait un acheminement en 2 a 3 jours ouvres qu'aucune ligne de la
-- grille fournisseur ne garantissait : celle-ci ne propose qu'une production
-- acceleree a +30 % et un transporteur reserve aux commandes en gros. Le delai
-- annonce engageant le vendeur, l'option est retiree plutot que maintenue sur
-- une promesse invérifiable.
--
-- La valeur `EXPRESS` de l'enum `ShippingMethod` est conservee : des commandes
-- la portent, et la retirer rendrait ces lignes illisibles. Plus rien ne la
-- produit.
ALTER TABLE "shop_settings" DROP COLUMN "shippingExpressCents";
ALTER TABLE "shop_settings" DROP COLUMN "costShippingExpressCents";
