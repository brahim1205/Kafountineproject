CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "domaine" TEXT NOT NULL,
    "duree" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "YouthProfile" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "cni" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "niveauEtude" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "dateNaiss" TIMESTAMP(3) NOT NULL,
    "photo" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YouthProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "YouthEnrollment" (
    "id" TEXT NOT NULL,
    "jeuneId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tauxAssiduite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutFinal" TEXT NOT NULL DEFAULT 'En cours',
    "presences" INTEGER NOT NULL DEFAULT 0,
    "absences" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YouthEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fisherman" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "nin" TEXT,
    "adresse" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fisherman_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FishingBoat" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" DOUBLE PRECISION,
    "moteur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "pecheurId" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FishingBoat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FishCommission" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "typePoisson" TEXT NOT NULL,
    "temperatura" DOUBLE PRECISION,
    "observations" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ENREGISTREE',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pecheurId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FishCommission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefrigeratedTruck" (
    "id" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT,
    "capacite" DOUBLE PRECISION,
    "chauffeur" TEXT,
    "telephone" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefrigeratedTruck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShippingExpedition" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poids" DOUBLE PRECISION NOT NULL,
    "destination" TEXT,
    "montant" DOUBLE PRECISION,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "observations" TEXT,
    "camionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingExpedition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YouthProfile_cni_key" ON "YouthProfile"("cni");
CREATE UNIQUE INDEX "YouthProfile_telephone_key" ON "YouthProfile"("telephone");
CREATE UNIQUE INDEX "YouthEnrollment_jeuneId_formationId_key" ON "YouthEnrollment"("jeuneId","formationId");
CREATE UNIQUE INDEX "FishingBoat_immatriculation_key" ON "FishingBoat"("immatriculation");
CREATE UNIQUE INDEX "FishCommission_numero_key" ON "FishCommission"("numero");
CREATE UNIQUE INDEX "RefrigeratedTruck_immatriculation_key" ON "RefrigeratedTruck"("immatriculation");
CREATE UNIQUE INDEX "ShippingExpedition_numero_key" ON "ShippingExpedition"("numero");

CREATE INDEX "TrainingProgram_year_idx" ON "TrainingProgram"("year");
CREATE INDEX "TrainingProgram_statut_idx" ON "TrainingProgram"("statut");
CREATE INDEX "YouthProfile_year_idx" ON "YouthProfile"("year");
CREATE INDEX "Fisherman_year_idx" ON "Fisherman"("year");
CREATE INDEX "Fisherman_statut_idx" ON "Fisherman"("statut");
CREATE INDEX "FishingBoat_year_idx" ON "FishingBoat"("year");
CREATE INDEX "FishingBoat_statut_idx" ON "FishingBoat"("statut");
CREATE INDEX "FishCommission_year_idx" ON "FishCommission"("year");
CREATE INDEX "FishCommission_statut_idx" ON "FishCommission"("statut");
CREATE INDEX "RefrigeratedTruck_year_idx" ON "RefrigeratedTruck"("year");
CREATE INDEX "RefrigeratedTruck_statut_idx" ON "RefrigeratedTruck"("statut");
CREATE INDEX "ShippingExpedition_year_idx" ON "ShippingExpedition"("year");
CREATE INDEX "ShippingExpedition_statut_idx" ON "ShippingExpedition"("statut");

ALTER TABLE "YouthEnrollment"
ADD CONSTRAINT "YouthEnrollment_jeuneId_fkey"
FOREIGN KEY ("jeuneId") REFERENCES "YouthProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "YouthEnrollment"
ADD CONSTRAINT "YouthEnrollment_formationId_fkey"
FOREIGN KEY ("formationId") REFERENCES "TrainingProgram"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FishingBoat"
ADD CONSTRAINT "FishingBoat_pecheurId_fkey"
FOREIGN KEY ("pecheurId") REFERENCES "Fisherman"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FishCommission"
ADD CONSTRAINT "FishCommission_pecheurId_fkey"
FOREIGN KEY ("pecheurId") REFERENCES "Fisherman"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShippingExpedition"
ADD CONSTRAINT "ShippingExpedition_camionId_fkey"
FOREIGN KEY ("camionId") REFERENCES "RefrigeratedTruck"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
