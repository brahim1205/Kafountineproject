-- Le rôle comptable est retiré de l'application.
-- Les comptes sont désactivés et non supprimés : leurs tickets et leur historique d'audit doivent garder leur auteur.
UPDATE "User" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "role" = 'COMPTABLE';
DELETE FROM "AppSettingPermission" WHERE "role" = 'COMPTABLE';
