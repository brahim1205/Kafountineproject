// Mock data for Recettes
export const mockRecettes = [
  {
    id: "1",
    numero: "REC-001",
    contribuableId: "1",
    contribuable: "Mamadou Diallo",
    categorie: "Impots",
    service: "Taxe professionnelle",
    montant: 50000,
    date: "2024-01-15",
    modePaiement: " Especes",
    statut: "Paye",
    agent: "Agent 1",
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    numero: "REC-002",
    contribuableId: "2",
    contribuable: "Fatou Sall",
    categorie: "Impots",
    service: "Taxe d'habitation",
    montant: 25000,
    date: "2024-01-16",
    modePaiement: "Mobile Money",
    statut: "Paye",
    agent: "Agent 1",
    createdAt: "2024-01-16T11:00:00Z"
  },
  {
    id: "3",
    numero: "REC-003",
    contribuableId: "3",
    contribuable: "Ali Touré",
    categorie: "Droits",
    service: "Droit de place",
    montant: 15000,
    date: "2024-01-17",
    modePaiement: "Especes",
    statut: "Paye",
    agent: "Agent 2",
    createdAt: "2024-01-17T09:00:00Z"
  }
];

export default mockRecettes;
