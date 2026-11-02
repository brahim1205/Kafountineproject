import type { Moto, MotoPayment } from '../../services/motos';

type Personne = {
  id?: string;
  prenom?: string;
  telephone?: string;
  nom: string;
  cni: string;
};

export type UiMoto = Omit<Moto, 'proprietaire' | 'conducteur'> & {
  photo: string;
  proprietaire: Personne;
  conducteur: Personne;
};

export type UiMotoPayment = MotoPayment & {
  statut: string;
  datePaiement: string | null;
  proprietaire: string;
  matricule: string;
  agent: string;
};

export type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

export type MotoConfig = { tarifMensuel: number; penaliteRetard: number };

export const FULL_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
export const SHORT_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

function toPersonne(person: Moto['proprietaire']): Personne {
  return {
    id: person?.id,
    prenom: person?.prenom,
    telephone: person?.telephone,
    nom: `${person?.prenom || ''} ${person?.nom || ''}`.trim() || 'N/A',
    cni: person?.nin || person?.cni || '-',
  };
}

export function toUiMoto(moto: Moto): UiMoto {
  return {
    ...moto,
    photo: moto.photo || '',
    proprietaire: toPersonne(moto.proprietaire),
    conducteur: toPersonne(moto.conducteur),
  };
}

export function toUiMotoPayment(payment: MotoPayment): UiMotoPayment {
  return {
    ...payment,
    statut: payment.statut === 'PAYE' ? 'Payé' : payment.statut === 'EN_ATTENTE' ? 'En attente' : 'En retard',
    datePaiement: payment.datePaiement ? new Date(payment.datePaiement).toISOString() : null,
    proprietaire: `${payment.moto?.proprietaire?.prenom || ''} ${payment.moto?.proprietaire?.nom || ''}`.trim() || 'N/A',
    matricule: payment.moto?.matricule || '-',
    agent: payment.agent || 'Agent Municipal',
  };
}

export function montantDu(moto: UiMoto, config: MotoConfig) {
  return moto.enRetard ? config.tarifMensuel + (moto.montantPenalite || config.penaliteRetard) : config.tarifMensuel;
}

export function formatDate(value: string | null | undefined, fallback: string) {
  return value ? new Date(value).toLocaleDateString('fr-FR', FULL_DATE) : fallback;
}
