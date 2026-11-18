-- La CNI n'est plus exigée partout (ex. un enfant qui retire un extrait) : le NIN devient facultatif.
-- PostgreSQL accepte plusieurs NULL sous la contrainte d'unicité.
ALTER TABLE "Contribuable" ALTER COLUMN "nin" DROP NOT NULL;
