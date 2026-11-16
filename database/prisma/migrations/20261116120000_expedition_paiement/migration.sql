-- Le passage d'un camion frigorifique devient une recette tracée : l'expédition est reliée au ticket
-- (numéro, reçu, mode de paiement, agent) qui encaisse la taxe de l'arrêté du 8 mai 2024 (section VI).
ALTER TABLE "ShippingExpedition" ADD COLUMN "transactionId" TEXT;
CREATE UNIQUE INDEX "ShippingExpedition_transactionId_key" ON "ShippingExpedition"("transactionId");
ALTER TABLE "ShippingExpedition" ADD CONSTRAINT "ShippingExpedition_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
