// Mock data for Taxes
export const mockTaxes = [
  {
    id: "1",
    libelle: "Taxe professionnelle",
    categorie: "Impots",
    tarif: 50000,
    periodicite: "Annuelle",
    description: "Taxe sur les activités commerciales"
  },
  {
    id: "2",
    libelle: "Taxe d'habitation",
    categorie: "Impots",
    tarif: 25000,
    periodicite: "Annuelle",
    description: "Taxe sur les residences"
  },
  {
    id: "3",
    libelle: "Droit de place",
    categorie: "Droits",
    tarif: 15000,
    periodicite: "Mensuelle",
    description: "Droit pour les vendeur au marche"
  },
  {
    id: "4",
    libelle: "Taxe sur les motorcycles",
    categorie: "Vehicules",
    tarif: 10000,
    periodicite: "Annuelle",
    description: "Taxe de circulation pour motorcycles"
  },
  {
    id: "5",
    libelle: "Droit de bornage",
    categorie: "Urbanisme",
    tarif: 5000,
    periodicite: "Unique",
    description: "Droit de bornage terrain"
  }
];

export const mockCategories = [
  { id: "impots", libelle: "Impots", couleur: "#ef4444" },
  { id: "droits", libelle: "Droits", couleur: "#f59e0b" },
  { id: "vehicules", libelle: "Vehicules", couleur: "#3b82f6" },
  { id: "urbanisme", libelle: "Urbanisme", couleur: "#10b981" }
];

export const categoriesTaxes = mockCategories;

export const transactionsTaxes = [];

export default mockTaxes;
