-- Historique des changements de propriétaire et de conducteur d'une moto. Uniquement un ajout.
-- Les noms sont recopiés : l'historique reste lisible même si une fiche est modifiée ou supprimée.
CREATE TABLE "MotoHolderChange" (
    "id" TEXT NOT NULL,
    "motoId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ancienId" TEXT,
    "ancienNom" TEXT,
    "nouveauId" TEXT,
    "nouveauNom" TEXT,
    "motif" TEXT,
    "parId" TEXT,
    "parNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MotoHolderChange_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MotoHolderChange_motoId_fkey" FOREIGN KEY ("motoId") REFERENCES "MotoRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MotoHolderChange_motoId_createdAt_idx" ON "MotoHolderChange"("motoId", "createdAt");
