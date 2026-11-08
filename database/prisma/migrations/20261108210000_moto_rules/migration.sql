-- Nouvelles règles motos : adhésion 5 000, cotisation 2 000, pénalité 10 000 après le 10, amende police 25 000.
ALTER TABLE "MotoPayment" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'COTISATION';
ALTER TABLE "MotoRegistration" ALTER COLUMN "montantPenalite" SET DEFAULT 10000;
UPDATE "MotoRegistration" SET "montantPenalite" = 10000;
-- Les motos à jour repartent de la prochaine échéance : personne ne subit une pénalité née de l'ancien calendrier.
UPDATE "MotoRegistration"
SET "prochainPaiement" = date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month 9 days 23 hours 59 minutes 59.999 seconds'
WHERE "enRetard" = false;
UPDATE "AppSettingPenalty" SET "montant" = 10000 WHERE "type" = 'Retard moto-taxi';
