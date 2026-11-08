-- Compteurs de numérotation : attribution en temps constant, quel que soit le nombre de tickets de l'année.
CREATE TABLE "NumeroCounter" (
    "serie" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "NumeroCounter_pkey" PRIMARY KEY ("serie","annee")
);

-- Index pour les listes paginées et les statistiques à fort volume.
CREATE INDEX "Transaction_year_createdAt_idx" ON "Transaction"("year", "createdAt");
CREATE INDEX "Transaction_year_statut_categorie_idx" ON "Transaction"("year", "statut", "categorie");
CREATE INDEX "Transaction_year_agentId_date_idx" ON "Transaction"("year", "agentId", "date");
