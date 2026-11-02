-- Index déclarés dans schema.prisma mais jamais créés par les migrations précédentes.
-- CreateIndex
CREATE INDEX "BudgetRequest_requestedById_idx" ON "BudgetRequest"("requestedById");

-- CreateIndex
CREATE INDEX "BudgetRequest_approvedById_idx" ON "BudgetRequest"("approvedById");

-- CreateIndex
CREATE INDEX "Contribuable_nom_prenom_idx" ON "Contribuable"("nom", "prenom");

-- CreateIndex
CREATE INDEX "EtatCivilRequest_contribuableId_idx" ON "EtatCivilRequest"("contribuableId");

-- CreateIndex
CREATE INDEX "EtatCivilRequest_agentId_idx" ON "EtatCivilRequest"("agentId");

-- CreateIndex
CREATE INDEX "FishCommission_pecheurId_idx" ON "FishCommission"("pecheurId");

-- CreateIndex
CREATE INDEX "FishingBoat_pecheurId_idx" ON "FishingBoat"("pecheurId");

-- CreateIndex
CREATE INDEX "MarketPayment_placeId_idx" ON "MarketPayment"("placeId");

-- CreateIndex
CREATE INDEX "MarketPlace_occupantId_idx" ON "MarketPlace"("occupantId");

-- CreateIndex
CREATE INDEX "MotoPayment_motoId_idx" ON "MotoPayment"("motoId");

-- CreateIndex
CREATE INDEX "MotoRegistration_proprietaireId_idx" ON "MotoRegistration"("proprietaireId");

-- CreateIndex
CREATE INDEX "MotoRegistration_conducteurId_idx" ON "MotoRegistration"("conducteurId");

-- CreateIndex
CREATE INDEX "ShippingExpedition_camionId_idx" ON "ShippingExpedition"("camionId");

-- CreateIndex
CREATE INDEX "Transaction_contribuableId_idx" ON "Transaction"("contribuableId");

-- CreateIndex
CREATE INDEX "Transaction_agentId_idx" ON "Transaction"("agentId");

-- CreateIndex
CREATE INDEX "UrbanismeCase_contribuableId_idx" ON "UrbanismeCase"("contribuableId");

-- CreateIndex
CREATE INDEX "UrbanismeCase_agentId_idx" ON "UrbanismeCase"("agentId");

