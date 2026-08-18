-- Prenom et nom du client, collectes separement sur la page de paiement.
--
-- Stripe ne collecte qu'un « nom complet » dans le bloc d'adresse. Le prenom
-- en etait deduit en prenant le premier mot, ce qui se trompe des que le
-- client saisit « Dupont Jean », un pseudo ou un prenom compose : le courriel
-- de confirmation s'ouvrait alors sur un « Bonjour Dupont ».
--
-- Chaine vide et non NULL, comme `customerName` et `customerEmail` juste a
-- cote : les commandes anterieures n'ont jamais porte l'information, et un
-- appelant qui trouve vide doit retomber sur `customerName`.
ALTER TABLE "orders" ADD COLUMN "customerFirstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN "customerLastName" TEXT NOT NULL DEFAULT '';
