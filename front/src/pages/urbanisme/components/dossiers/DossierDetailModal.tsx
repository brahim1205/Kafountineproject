import type { DossierUrbanisme } from '../../../../services/urbanisme';
import type { TaxService } from '../../../../services/taxes';
import { NATURES, formatDate, formatSurface, statut, typeLabel } from './dossiers';

type DossierDetailModalProps = {
  dossier: DossierUrbanisme;
  types: TaxService[];
  onPrint: () => void;
  onClose: () => void;
};

export default function DossierDetailModal({ dossier, types, onPrint, onClose }: DossierDetailModalProps) {
  const { label, badge } = statut(dossier.statut);
  const c = dossier.contribuable;
  const details: Array<[string, string, boolean?]> = [
    ['Numéro', dossier.numero],
    ['Date de dépôt', formatDate(dossier.createdAt)],
    ['Demandeur', c ? `${c.prenom} ${c.nom}` : '-'],
    ['Téléphone', c?.telephone || '-'],
    ['Type de permis', typeLabel(dossier, types)],
    ['Agent', dossier.agent || '-'],
    ['Localisation du projet', dossier.localisation || '-', true],
    ['Surface', formatSurface(dossier.surface)],
    ['Nature du projet', dossier.nature ? NATURES[dossier.nature] || dossier.nature : '-'],
    ['Description', dossier.description || '-', true],
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Détails du dossier</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-2 gap-6">
            {details.map(([term, value, wide]) => (
              <div key={term} className={wide ? 'col-span-2' : undefined}>
                <dt className="text-xs text-gray-500 mb-1">{term}</dt>
                <dd className="text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-gray-500 mb-1">Statut</dt>
              <dd>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badge}`}>{label}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">Montant</dt>
              <dd className="text-sm font-bold text-emerald-600">{dossier.montant.toLocaleString('fr-FR')} FCFA</dd>
            </div>
          </dl>

          <div className="flex gap-3">
            <button
              onClick={onPrint}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <i className="ri-printer-line mr-2"></i>
              Imprimer le reçu
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
