-- Sequence dediee a la generation des references de commande (DVG-AAAA-NNNN).
-- Une sequence garantit l'unicite meme si deux webhooks Stripe sont traites en parallele.
CREATE SEQUENCE IF NOT EXISTS order_reference_seq START WITH 1 INCREMENT BY 1;
