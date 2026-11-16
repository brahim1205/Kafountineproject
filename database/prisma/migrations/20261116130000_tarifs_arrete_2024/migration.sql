-- Tarifs alignés sur la délibération n° 002/CK/2024 du 8 mai 2024 (arrêté des taxes et redevances).
-- Chaque correction ne s'applique que si le tarif a encore l'ancienne valeur erronée : un tarif déjà
-- ajusté par l'administrateur dans les paramètres n'est jamais écrasé. Les tickets existants ne changent pas.

-- Hôtel et campement sont deux lignes distinctes de l'arrêté (5 000 et 3 000 F / mois).
UPDATE "MunicipalTariffItem" SET "nom" = 'Taxe ordures menageres - Hotel', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "nom" = 'Taxe ordures menageres - Hotel / Campement' AND "tarif" = 5000;

-- Montants erronés.
UPDATE "MunicipalTariffItem" SET "tarif" = 3000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'marche' AND "nom" = 'Taxe ordures menageres - Boutique grossiste' AND "tarif" = 5000;
UPDATE "MunicipalTariffItem" SET "tarif" = 2000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'marche' AND "nom" = 'Taxe ordures menageres - Restaurant-bar' AND "tarif" = 5000;
UPDATE "MunicipalTariffItem" SET "tarif" = 2000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'marche' AND "nom" = 'Taxe ordures menageres - Unite fabrication eau sachet' AND "tarif" = 3000;
UPDATE "MunicipalTariffItem" SET "tarif" = 1000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'marche' AND "nom" = 'Taxe ordures menageres - Atelier mecanique/couture/gargote' AND "tarif" = 2000;
UPDATE "MunicipalTariffItem" SET "tarif" = 500, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport sable - Camion 4 m3' AND "tarif" = 1000;
UPDATE "MunicipalTariffItem" SET "tarif" = 1000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport sable - Camion 8 m3' AND "tarif" = 2000;
UPDATE "MunicipalTariffItem" SET "tarif" = 2000, "updatedAt" = CURRENT_TIMESTAMP WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport sable - Camion 16 m3' AND "tarif" = 3000;

-- Lignes de l'arrêté absentes du catalogue (ajoutées seulement si elles n'existent pas encore).
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'marche-taxe-ordures-menageres-campement', 'marche', 'Taxe ordures menageres - Campement', 3000, 'mois', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'marche'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'marche')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'marche' AND "nom" = 'Taxe ordures menageres - Campement')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-gravillon-camion-4-m3', 'stationnement-transport', 'Transport gravillon - Camion 4 m3', 1000, 'chargement', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport gravillon - Camion 4 m3')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-gravillon-camion-8-m3', 'stationnement-transport', 'Transport gravillon - Camion 8 m3', 2000, 'chargement', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport gravillon - Camion 8 m3')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-gravillon-camion-16-m3', 'stationnement-transport', 'Transport gravillon - Camion 16 m3', 3000, 'chargement', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport gravillon - Camion 16 m3')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-maritime-ballade-pirogue-venant-de-diembering', 'stationnement-transport', 'Transport maritime - Ballade pirogue venant de Diembering', 5000, 'sortie', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport maritime - Ballade pirogue venant de Diembering')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-maritime-traversee-kassel', 'stationnement-transport', 'Transport maritime - Traversee Kassel', 6000, 'mois', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport maritime - Traversee Kassel')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-maritime-traversee-saloulou', 'stationnement-transport', 'Transport maritime - Traversee Saloulou', 6000, 'traversee', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport maritime - Traversee Saloulou')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'stationnement-transport-transport-maritime-traversee-bakassouck', 'stationnement-transport', 'Transport maritime - Traversee Bakassouck', 6000, 'traversee', NULL, 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'stationnement-transport')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'stationnement-transport' AND "nom" = 'Transport maritime - Traversee Bakassouck')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'occupation-reglementation-spectacles-manifestation-sportive-a-entree-payante', 'occupation-reglementation', 'Spectacles - Manifestation sportive a entree payante', 15, '% des recettes', 'pourcentage', 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'occupation-reglementation'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'occupation-reglementation')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'occupation-reglementation' AND "nom" = 'Spectacles - Manifestation sportive a entree payante')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'occupation-reglementation-spectacles-autre-manifestation-a-entree-payante', 'occupation-reglementation', 'Spectacles - Autre manifestation a entree payante', 15, '% des recettes', 'pourcentage', 'Arrete municipal du 08 mai 2024', TIMESTAMP '2024-05-08 00:00:00',
       COALESCE((SELECT MAX("sortOrder") FROM "MunicipalTariffItem" WHERE "categoryId" = 'occupation-reglementation'), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "MunicipalTariffCategory" WHERE "id" = 'occupation-reglementation')
  AND NOT EXISTS (SELECT 1 FROM "MunicipalTariffItem" WHERE "categoryId" = 'occupation-reglementation' AND "nom" = 'Spectacles - Autre manifestation a entree payante')
ON CONFLICT ("id") DO NOTHING;
