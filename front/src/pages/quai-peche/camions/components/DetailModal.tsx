import { useState } from 'react';
import { updateExpedition, type CamionFrigorifique, type Expedition } from '../../../../services/quai-peche';
import { INPUT_CLASS, STATUTS_CAMION, STATUTS_EXPEDITION, formatDate, formatFcfa, formatKg } from './statuts';
import Modal from './Modal';

type DetailModalProps =
  | { kind: 'camion'; item: CamionFrigorifique; canManage: boolean; onClose: () => void; onChanged: () => Promise<void> }
  | { kind: 'expedition'; item: Expedition; canManage: boolean; onClose: () => void; onChanged: () => Promise<void> };

export default function DetailModal(props: DetailModalProps) {
  const [statut, setStatut] = useState(props.item.statut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rows: Array<[string, string]> =
    props.kind === 'camion'
      ? [
          ['Immatriculation', props.item.immatriculation],
          ['Marque', props.item.marque],
          ['Modèle', props.item.modele || '-'],
          ['Capacité', formatKg(props.item.capacite)],
          ['Chauffeur', props.item.chauffeur || '-'],
          ['Téléphone', props.item.telephone || '-'],
          ['Expéditions', String(props.item._count?.expeditions ?? 0)],
          ['Statut', STATUTS_CAMION[props.item.statut]?.label || props.item.statut],
        ]
      : [
          ['Numéro', props.item.numero],
          ['Camion', props.item.camion?.immatriculation || '-'],
          ['Poids', formatKg(props.item.poids)],
          ['Destination', props.item.destination || '-'],
          ['Montant', formatFcfa(props.item.montant)],
          ['Date', formatDate(props.item.date)],
          ['Observations', props.item.observations || '-'],
        ];

  const enregistrerStatut = async () => {
    setSaving(true);
    setError('');
    try {
      await updateExpedition(props.item.id, { statut });
      await props.onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.');
    } finally {
      setSaving(false);
    }
  };

  const editable = props.kind === 'expedition' && props.canManage;

  return (
    <Modal
      title={props.kind === 'camion' ? 'Détails du camion' : "Détails de l'expédition"}
      onClose={props.onClose}
      footer={
        <>
          <button onClick={props.onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            Fermer
          </button>
          {editable && (
            <button
              onClick={enregistrerStatut}
              disabled={saving || statut === props.item.statut}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Mettre à jour le statut'}
            </button>
          )}
        </>
      }
    >
      <dl className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {props.kind === 'expedition' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} disabled={!editable} className={INPUT_CLASS}>
            {Object.entries(STATUTS_EXPEDITION).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {!STATUTS_EXPEDITION[props.item.statut] && <option value={props.item.statut}>{props.item.statut}</option>}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
    </Modal>
  );
}
