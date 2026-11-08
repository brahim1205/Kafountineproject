-- Anti-doublon des écritures rejouées.
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");
