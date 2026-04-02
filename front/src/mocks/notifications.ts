// Mock data for Notifications
export const mockNotifications = [
  {
    id: "1",
    type: "paiement",
    titre: "Nouveau paiement recu",
    message: "Un paiement de 50 000 CFA a ete enregistre",
    montant: 50000,
    contribuable: "Mamadou Diallo",
    agent: "Agent 1",
    lu: false,
    timestamp: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    type: "contribuable",
    titre: "Nouveau contribuable ajoute",
    message: "Fatou Sall a ete ajoutee",
    montant: null,
    contribuable: "Fatou Sall",
    agent: "Agent 1",
    lu: false,
    timestamp: "2024-01-15T11:00:00Z",
    createdAt: "2024-01-15T11:00:00Z"
  },
  {
    id: "3",
    type: "retard",
    titre: "Permis expire",
    message: "Le permis de Ali Touré a expire",
    montant: null,
    contribuable: "Ali Touré",
    agent: "Systeme",
    lu: true,
    timestamp: "2024-01-14T09:00:00Z",
    createdAt: "2024-01-14T09:00:00Z"
  },
  {
    id: "4",
    type: "paiement",
    titre: "Paiement en attente",
    message: "Une transaction de 25 000 CFA en attente",
    montant: 25000,
    contribuable: "Moussa Ndiaye",
    agent: "Agent 2",
    lu: false,
    timestamp: "2024-01-15T14:00:00Z",
    createdAt: "2024-01-15T14:00:00Z"
  }
];

export default mockNotifications;
