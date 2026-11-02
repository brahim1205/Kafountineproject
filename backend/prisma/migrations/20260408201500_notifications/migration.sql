CREATE TABLE "AppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "montant" DOUBLE PRECISION,
  "contribuable" TEXT,
  "agent" TEXT,
  "lu" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "year" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppNotification_year_idx" ON "AppNotification"("year");
CREATE INDEX "AppNotification_lu_idx" ON "AppNotification"("lu");
CREATE INDEX "AppNotification_createdAt_idx" ON "AppNotification"("createdAt");
