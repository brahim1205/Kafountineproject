-- Encaissements : qui a encaissé, comment et quand ; clôtures de caisse. Uniquement des ajouts.
ALTER TABLE "MarketPayment" ADD COLUMN "agentId" TEXT, ADD COLUMN "numeroRecu" TEXT, ADD COLUMN "modePaiement" TEXT NOT NULL DEFAULT 'ESPECE';
ALTER TABLE "MotoPayment" ADD COLUMN "agentId" TEXT, ADD COLUMN "modePaiement" TEXT NOT NULL DEFAULT 'ESPECE';
ALTER TABLE "EtatCivilRequest" ADD COLUMN "modePaiement" TEXT NOT NULL DEFAULT 'ESPECE', ADD COLUMN "encaisseLe" TIMESTAMP(3), ADD COLUMN "encaissePar" TEXT;
ALTER TABLE "UrbanismeCase" ADD COLUMN "modePaiement" TEXT NOT NULL DEFAULT 'ESPECE', ADD COLUMN "encaisseLe" TIMESTAMP(3), ADD COLUMN "encaissePar" TEXT;

UPDATE "EtatCivilRequest" SET "encaisseLe" = "createdAt", "encaissePar" = "agentId" WHERE "statut" IN ('DELIVREE', 'VALIDE');
UPDATE "UrbanismeCase" SET "encaisseLe" = "createdAt", "encaissePar" = "agentId" WHERE "statut" = 'VALIDE';

ALTER TABLE "MarketPayment" ADD CONSTRAINT "MarketPayment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MotoPayment" ADD CONSTRAINT "MotoPayment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "MarketPayment_numeroRecu_key" ON "MarketPayment"("numeroRecu");
CREATE INDEX "MarketPayment_agentId_datePaiement_idx" ON "MarketPayment"("agentId", "datePaiement");
CREATE INDEX "MotoPayment_agentId_datePaiement_idx" ON "MotoPayment"("agentId", "datePaiement");
CREATE INDEX "EtatCivilRequest_encaissePar_encaisseLe_idx" ON "EtatCivilRequest"("encaissePar", "encaisseLe");
CREATE INDEX "UrbanismeCase_encaissePar_encaisseLe_idx" ON "UrbanismeCase"("encaissePar", "encaisseLe");

CREATE TABLE "CashClosure" (
    "id" TEXT NOT NULL,
    "jour" DATE NOT NULL,
    "agentId" TEXT NOT NULL,
    "montantAttendu" DECIMAL(14,2) NOT NULL,
    "montantCompte" DECIMAL(14,2) NOT NULL,
    "ecart" DECIMAL(14,2) NOT NULL,
    "nombre" INTEGER NOT NULL,
    "observations" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'CLOTUREE',
    "cloturePar" TEXT,
    "validePar" TEXT,
    "valideLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashClosure_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CashClosure_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CashClosure_jour_agentId_key" ON "CashClosure"("jour", "agentId");
CREATE INDEX "CashClosure_statut_idx" ON "CashClosure"("statut");
