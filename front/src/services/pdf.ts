type ReceiptPdfPayload = {
  ticketNumber: string;
  date: string;
  time: string;
  contributor: string;
  type: string;
  amount: number;
  agent?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  reference?: string;
  categorie?: string;
  service?: string;
  quantite?: string;
  unite?: string;
  tarifUnitaire?: string;
  modePaiement?: string;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
};

type ReportPdfPayload = {
  year: number;
  total: number;
  tauxRecouvrement: number;
  totalTransactions: number;
  totalContribuables: number;
  modules: Array<{
    name: string;
    amount: number;
    evolution?: number;
  }>;
  topContribuables: Array<{
    name: string;
    amount: number;
  }>;
};

async function fetchPdf(path: string, payload: ReceiptPdfPayload | ReportPdfPayload): Promise<Blob> {
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Impossible de générer le PDF');
  }

  return response.blob();
}

export async function exportReceiptPdf(payload: ReceiptPdfPayload): Promise<Blob> {
  return fetchPdf('/exports/receipt.pdf', payload);
}

export async function exportReportPdf(payload: ReportPdfPayload): Promise<Blob> {
  return fetchPdf('/exports/report.pdf', payload);
}

export function openPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
