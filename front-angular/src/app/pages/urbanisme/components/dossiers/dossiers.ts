import type { DossierUrbanisme } from '../../../../services/urbanisme';
import type { TaxService } from '../../../../services/taxes';

export type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
  categorie?: string;
  service?: string;
  quantite?: number;
  unite?: string;
  tarifUnitaire?: number;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
};

export const STATUTS: Record<string, { label: string; badge: string }> = {
  VALIDE: { label: 'Validé', badge: 'bg-emerald-100 text-emerald-700' },
  EN_ATTENTE: { label: 'En attente', badge: 'bg-yellow-100 text-yellow-700' },
  REJETE: { label: 'Rejeté', badge: 'bg-red-100 text-red-700' },
};

export const NATURES: Record<string, string> = {
  habitation: "Usage d'habitation",
  commerce: 'Usage commercial',
  industrie: 'Usage industriel',
  mixte: 'Usage mixte (Habitat + Commerce)',
};

export const statut = (code: string) => STATUTS[code] || STATUTS.EN_ATTENTE;
/** Libellés des types normalisés par l'API (catalogue backend), utilisés si le tarif n'est plus au catalogue. */
const TYPES_API: Record<string, string> = {
  'permis-construire': 'Permis de construire',
  'autorisation-travaux': 'Autorisation de travaux',
  'certificat-conformite': 'Certificat de conformité',
  'titre-foncier': 'Titre foncier',
  'permis-demolir': 'Permis de démolir',
  'permis-démolir': 'Permis de démolir',
  'autorisation-construire': 'Autorisation de construire',
};

/** Libellé d'un type de dossier (identifiant du tarif au catalogue). */
export const libelleType = (code: string, types: TaxService[]) =>
  types.find((type) => type.id === code)?.nom || TYPES_API[code] || lisible(code);

/** Code hors catalogue (ex. « permis-démolir ») rendu lisible : « Permis démolir ». */
function lisible(code: string): string {
  const texte = (code || '').replace(/[-_]+/g, ' ').trim();
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : '-';
}
export const typeLabel = (dossier: DossierUrbanisme, types: TaxService[]) => libelleType(dossier.type, types);
export const formatSurface = (surface?: number) => (surface ? `${surface.toLocaleString('fr-FR')} m²` : '-');
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

/** Montant dû pour un permis : tarif × surface pour les tarifs au m² (1 m² minimum), sinon tarif forfaitaire. */
export function montantPermis(permis: TaxService, surface?: number) {
  return permis.unite === 'm²' ? permis.tarif * Math.max(1, surface || 1) : permis.tarif;
}

export function receiptFor(dossier: DossierUrbanisme, types: TaxService[]): ReceiptData {
  const created = new Date(dossier.createdAt);
  const contribuable = dossier.contribuable;
  const permis = types.find((type) => type.id === dossier.type);
  const service = typeLabel(dossier, types);
  return {
    numero: dossier.numero,
    date: created.toLocaleDateString('fr-FR'),
    heure: created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contribuable: contribuable ? `${contribuable.prenom} ${contribuable.nom}`.trim() : 'Inconnu',
    type: `${service}${dossier.surface ? ` (${dossier.surface} m²)` : ''}`,
    montant: dossier.montant,
    agent: dossier.agent || 'Agent Urbanisme',
    categorie: 'Urbanisme & habitat',
    service,
    quantite: permis?.unite === 'm²' ? Math.max(1, dossier.surface || 1) : 1,
    unite: permis?.unite,
    tarifUnitaire: permis?.tarif,
    statut: statut(dossier.statut).label,
    localisation: dossier.localisation,
    nature: dossier.nature ? NATURES[dossier.nature] || dossier.nature : undefined,
    description: dossier.description,
    telephone: contribuable?.telephone,
    nin: contribuable?.nin,
    adresse: contribuable?.adresse || dossier.localisation,
  };
}
