CREATE TABLE "EtatCivilRequest" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "contribuableId" TEXT NOT NULL,
    "agentId" TEXT,
    "typeDocument" TEXT NOT NULL,
    "exemplaires" INTEGER NOT NULL DEFAULT 1,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtatCivilRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UrbanismeCase" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "contribuableId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "surface" DOUBLE PRECISION,
    "localisation" TEXT,
    "nature" TEXT,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UrbanismeCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EtatCivilRequest_numero_key" ON "EtatCivilRequest"("numero");
CREATE UNIQUE INDEX "UrbanismeCase_numero_key" ON "UrbanismeCase"("numero");

CREATE INDEX "EtatCivilRequest_year_idx" ON "EtatCivilRequest"("year");
CREATE INDEX "EtatCivilRequest_statut_idx" ON "EtatCivilRequest"("statut");
CREATE INDEX "EtatCivilRequest_typeDocument_idx" ON "EtatCivilRequest"("typeDocument");

CREATE INDEX "UrbanismeCase_year_idx" ON "UrbanismeCase"("year");
CREATE INDEX "UrbanismeCase_statut_idx" ON "UrbanismeCase"("statut");
CREATE INDEX "UrbanismeCase_type_idx" ON "UrbanismeCase"("type");

ALTER TABLE "EtatCivilRequest"
ADD CONSTRAINT "EtatCivilRequest_contribuableId_fkey"
FOREIGN KEY ("contribuableId") REFERENCES "Contribuable"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EtatCivilRequest"
ADD CONSTRAINT "EtatCivilRequest_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UrbanismeCase"
ADD CONSTRAINT "UrbanismeCase_contribuableId_fkey"
FOREIGN KEY ("contribuableId") REFERENCES "Contribuable"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UrbanismeCase"
ADD CONSTRAINT "UrbanismeCase_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
