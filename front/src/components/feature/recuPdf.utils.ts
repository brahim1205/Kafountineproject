interface RawTransaction {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  reference?: string;
  categorie?: string;
  service?: string;
  quantite?: number;
  unite?: string;
  tarifUnitaire?: number;
  modePaiement?: string;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
}

export interface RecuData {
  ticketNumber: string;
  date: string;
  time: string;
  contributor: string;
  type: string;
  amount: number;
  agent: string;
  telephone: string;
  nin: string;
  adresse: string;
  reference: string;
  categorie: string;
  service: string;
  quantite: string;
  unite: string;
  tarifUnitaire: string;
  modePaiement: string;
  statut: string;
  localisation: string;
  nature: string;
  description: string;
}

interface RecuDataInput {
  ticketNumber?: string;
  date?: string;
  time?: string;
  contributor?: string;
  type?: string;
  amount?: number;
  numeroRecu?: string;
  heure?: string;
  contribuable?: string;
  typeTaxe?: string;
  montant?: number;
  agent?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  reference?: string;
  categorie?: string;
  service?: string;
  quantite?: number | string;
  unite?: string;
  tarifUnitaire?: number | string;
  modePaiement?: string;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
  transaction?: RawTransaction;
}

export function formatDateInFrench(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    let date: Date;
    
    // Gérer le format français JJ/MM/AAAA
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) return dateStr;

    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function numberToWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  if (num === 0) return 'zéro';
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    if (ten === 7 || ten === 9) {
      return `${tens[ten - 1]}-${teens[unit]}`;
    }
    return tens[ten] + (unit ? `-${units[unit]}` : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredText = hundred === 1 ? 'cent' : `${units[hundred]} cent`;
    return hundredText + (rest ? ` ${numberToWords(rest)}` : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandText = thousand === 1 ? 'mille' : `${numberToWords(thousand)} mille`;
    return thousandText + (rest ? ` ${numberToWords(rest)}` : '');
  }
  const million = Math.floor(num / 1000000);
  const rest = num % 1000000;
  const millionText = million === 1 ? 'un million' : `${numberToWords(million)} millions`;
  return millionText + (rest ? ` ${numberToWords(rest)}` : '');
}

export function normalizeRecuData(input: RecuDataInput): RecuData {
  const transaction = input.transaction;
  if (transaction) {
    return {
      ticketNumber: transaction.numero,
      date: transaction.date,
      time: transaction.heure,
      contributor: transaction.contribuable,
      type: transaction.type,
      amount: transaction.montant,
      agent: transaction.agent,
      telephone: transaction.telephone || '',
      nin: transaction.nin || '',
      adresse: transaction.adresse || '',
      reference: transaction.reference || '',
      categorie: transaction.categorie || '',
      service: transaction.service || '',
      quantite: transaction.quantite !== undefined ? String(transaction.quantite) : '',
      unite: transaction.unite || '',
      tarifUnitaire: transaction.tarifUnitaire !== undefined ? String(transaction.tarifUnitaire) : '',
      modePaiement: transaction.modePaiement || '',
      statut: transaction.statut || '',
      localisation: transaction.localisation || '',
      nature: transaction.nature || '',
      description: transaction.description || '',
    };
  }

  return {
    ticketNumber: input.ticketNumber || input.numeroRecu || '',
    date: input.date || '',
    time: input.time || input.heure || '',
    contributor: input.contributor || input.contribuable || '',
    type: input.type || input.typeTaxe || '',
    amount: input.amount || input.montant || 0,
    agent: input.agent || '',
    telephone: input.telephone || '',
    nin: input.nin || '',
    adresse: input.adresse || '',
    reference: input.reference || '',
    categorie: input.categorie || '',
    service: input.service || '',
    quantite: input.quantite !== undefined ? String(input.quantite) : '',
    unite: input.unite || '',
    tarifUnitaire: input.tarifUnitaire !== undefined ? String(input.tarifUnitaire) : '',
    modePaiement: input.modePaiement || '',
    statut: input.statut || '',
    localisation: input.localisation || '',
    nature: input.nature || '',
    description: input.description || '',
  };
}

export function buildReceiptPayload(recuData: RecuData) {
  return {
    ticketNumber: recuData.ticketNumber,
    date: recuData.date,
    time: recuData.time,
    contributor: recuData.contributor,
    type: recuData.type,
    amount: recuData.amount,
    agent: recuData.agent,
    telephone: recuData.telephone,
    nin: recuData.nin,
    adresse: recuData.adresse,
    reference: recuData.reference,
    categorie: recuData.categorie,
    service: recuData.service,
    quantite: recuData.quantite,
    unite: recuData.unite,
    tarifUnitaire: recuData.tarifUnitaire,
    modePaiement: recuData.modePaiement,
    statut: recuData.statut,
    localisation: recuData.localisation,
    nature: recuData.nature,
    description: recuData.description,
  };
}

export function buildReceiptQrData(recuData: RecuData, formattedDate: string): string {
  // On génère une URL de vérification officielle
  // Ce format est plus standard et facile à scanner que du JSON brut
  const baseUrl = 'https://kafountine.sn/verifier';
  const params = new URLSearchParams({
    id: recuData.ticketNumber,
    val: window.btoa(`${recuData.ticketNumber}|${recuData.amount}|${recuData.date}`),
  });
  
  return `${baseUrl}?${params.toString()}`;
}
