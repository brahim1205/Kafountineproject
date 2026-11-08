-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "telephone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribuable" (
    "id" TEXT NOT NULL,
    "nin" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaiss" TIMESTAMP(3) NOT NULL,
    "lieuNaiss" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "profession" TEXT,
    "typeContribuable" TEXT NOT NULL DEFAULT 'PARTICULIER',
    "zone" TEXT,
    "montantImpot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribuable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "contribuableId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "tarifUnitaire" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "modePaiement" TEXT NOT NULL DEFAULT 'ESPECE',
    "statut" TEXT NOT NULL DEFAULT 'PAYE',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contribuable_nin_key" ON "Contribuable"("nin");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_numero_key" ON "Transaction"("numero");

-- CreateIndex
CREATE INDEX "Transaction_year_idx" ON "Transaction"("year");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_contribuableId_fkey" FOREIGN KEY ("contribuableId") REFERENCES "Contribuable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
