CREATE TABLE "MarketPlace" (
    "id" TEXT NOT NULL,
    "numeroPlace" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "occupantId" TEXT,
    "activite" TEXT,
    "telephone" TEXT,
    "dateAttribution" TIMESTAMP(3),
    "tarif" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periode" TEXT NOT NULL DEFAULT 'mensuel',
    "statut" TEXT NOT NULL DEFAULT 'LIBRE',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPlace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketPayment" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "periode" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PAYE',
    "datePaiement" TIMESTAMP(3),
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MotoRegistration" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "couleur" TEXT,
    "proprietaireId" TEXT NOT NULL,
    "conducteurId" TEXT,
    "permis" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
    "photo" TEXT,
    "enRetard" BOOLEAN NOT NULL DEFAULT false,
    "montantPenalite" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "prochainPaiement" TIMESTAMP(3),
    "dernierPaiement" TIMESTAMP(3),
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotoRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MotoPayment" (
    "id" TEXT NOT NULL,
    "motoId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'PAYE',
    "datePaiement" TIMESTAMP(3),
    "mois" TEXT,
    "numeroRecu" TEXT,
    "agent" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotoPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketPlace_numeroPlace_year_key" ON "MarketPlace"("numeroPlace", "year");
CREATE INDEX "MarketPlace_year_idx" ON "MarketPlace"("year");
CREATE INDEX "MarketPlace_statut_idx" ON "MarketPlace"("statut");

CREATE INDEX "MarketPayment_year_idx" ON "MarketPayment"("year");
CREATE INDEX "MarketPayment_statut_idx" ON "MarketPayment"("statut");

CREATE UNIQUE INDEX "MotoRegistration_matricule_key" ON "MotoRegistration"("matricule");
CREATE UNIQUE INDEX "MotoRegistration_permis_key" ON "MotoRegistration"("permis");
CREATE INDEX "MotoRegistration_year_idx" ON "MotoRegistration"("year");
CREATE INDEX "MotoRegistration_statut_idx" ON "MotoRegistration"("statut");

CREATE INDEX "MotoPayment_year_idx" ON "MotoPayment"("year");
CREATE INDEX "MotoPayment_statut_idx" ON "MotoPayment"("statut");

ALTER TABLE "MarketPlace"
ADD CONSTRAINT "MarketPlace_occupantId_fkey"
FOREIGN KEY ("occupantId") REFERENCES "Contribuable"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketPayment"
ADD CONSTRAINT "MarketPayment_placeId_fkey"
FOREIGN KEY ("placeId") REFERENCES "MarketPlace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MotoRegistration"
ADD CONSTRAINT "MotoRegistration_proprietaireId_fkey"
FOREIGN KEY ("proprietaireId") REFERENCES "Contribuable"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MotoRegistration"
ADD CONSTRAINT "MotoRegistration_conducteurId_fkey"
FOREIGN KEY ("conducteurId") REFERENCES "Contribuable"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MotoPayment"
ADD CONSTRAINT "MotoPayment_motoId_fkey"
FOREIGN KEY ("motoId") REFERENCES "MotoRegistration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
