CREATE TABLE "AppSettingTariff" (
  "id" TEXT NOT NULL,
  "categorie" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unite" TEXT NOT NULL,
  "description" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSettingTariff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSettingPenalty" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "delai" TEXT NOT NULL,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSettingPenalty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSettingPermission" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSettingPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupRecord" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "snapshot" TEXT NOT NULL,
  "restoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSettingPermission_module_role_key" ON "AppSettingPermission"("module", "role");
CREATE UNIQUE INDEX "BackupRecord_filename_key" ON "BackupRecord"("filename");

CREATE INDEX "AppSettingTariff_categorie_idx" ON "AppSettingTariff"("categorie");
CREATE INDEX "AppSettingTariff_actif_idx" ON "AppSettingTariff"("actif");
CREATE INDEX "AppSettingPenalty_actif_idx" ON "AppSettingPenalty"("actif");
CREATE INDEX "AppSettingPermission_role_idx" ON "AppSettingPermission"("role");
CREATE INDEX "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");
