-- Incidents techniques (erreurs serveur et navigateur), regroupés par signature, suivis par le super admin.
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "requestId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "role" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "premiereFois" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniereFois" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "note" TEXT,
    "traitePar" TEXT,
    "traiteLe" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Incident_signature_key" ON "Incident"("signature");
CREATE INDEX "Incident_statut_idx" ON "Incident"("statut");
CREATE INDEX "Incident_derniereFois_idx" ON "Incident"("derniereFois");
