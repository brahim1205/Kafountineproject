CREATE TABLE "MunicipalTariffCategory" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "description" TEXT,
  "legalSource" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MunicipalTariffCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MunicipalTariffItem" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "tarif" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unite" TEXT NOT NULL,
  "calcul" TEXT,
  "legalSource" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MunicipalTariffItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MunicipalTariffCategory_isActive_idx" ON "MunicipalTariffCategory"("isActive");
CREATE INDEX "MunicipalTariffCategory_sortOrder_idx" ON "MunicipalTariffCategory"("sortOrder");
CREATE INDEX "MunicipalTariffItem_categoryId_idx" ON "MunicipalTariffItem"("categoryId");
CREATE INDEX "MunicipalTariffItem_isActive_idx" ON "MunicipalTariffItem"("isActive");
CREATE INDEX "MunicipalTariffItem_sortOrder_idx" ON "MunicipalTariffItem"("sortOrder");

ALTER TABLE "MunicipalTariffItem"
ADD CONSTRAINT "MunicipalTariffItem_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "MunicipalTariffCategory"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
