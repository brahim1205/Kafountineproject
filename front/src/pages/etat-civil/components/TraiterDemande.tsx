import { useEffect, useMemo, useState } from 'react';
import RecuPDF from '../../../components/feature/RecuPDF';
import { createEtatCivilDemande } from '../../../services/etatCivil';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { getTaxServices, type TaxService } from '../../../services/taxes';
import { useToast } from '../../../components/feature/Toast';
import { useYear } from '../../../contexts/YearContext';
import {
  clearFieldValidationError,
  validateFormElement,
} from '../../../utils/formValidation';

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

export default function TraiterDemande({ onSuccess }: { onSuccess?: () => void }) {
  const { showToast } = useToast();
  const { selectedYear } = useYear();
  const [typeDocument, setTypeDocument] = useState('');
  const [showRecuPDF, setShowRecuPDF] = useState(false);
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [typesDocuments, setTypesDocuments] = useState<Array<Pick<TaxService, 'id' | 'nom' | 'tarif'>>>([]);
  const [formData, setFormData] = useState({
    nomComplet: '',
    cni: '',
    telephone: '',
    adresse: '',
    exemplaires: 1,
    observations: '',
  });

  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await getTaxServices('etat-civil');
        setTypesDocuments(services.map((service) => ({
          id: service.id,
          nom: service.nom,
          tarif: service.tarif,
        })));
      } catch {
        setError('Impossible de charger les tarifs de l\'état civil.');
      }
    };

    loadServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      const selectedDoc = typesDocuments.find(d => d.id === typeDocument);
      if (!selectedDoc) {
        setError('Veuillez sélectionner un type de document');
        setIsSubmitting(false);
        return;
      }

      const exemplaire = parseInt(String(formData.exemplaires)) || 1;
      const montantTotal = selectedDoc.tarif * exemplaire;

      const contribuable = await ensureContribuableByIdentity({
        cni: formData.cni,
        fullName: formData.nomComplet,
        telephone: formData.telephone,
        adresse: formData.adresse,
      });

      const numeroTransaction = `EC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;
      await createEtatCivilDemande({
        contribuableId: contribuable.id,
        typeDocument: typeDocument,
        exemplaires: exemplaire,
        montant: montantTotal,
        observations: formData.observations.trim() || undefined,
        year: selectedYear,
      });

      const now = new Date();
      
      const newTransaction = {
        numero: numeroTransaction,
        date: now.toLocaleDateString('fr-FR'),
        heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        contribuable: formData.nomComplet,
        type: `${selectedDoc.nom}${exemplaire > 1 ? ` (${exemplaire} exemplaires)` : ''}`,
        montant: montantTotal,
        agent: 'Agent État Civil'
      };

      setTransactionData(newTransaction);
      showToast(`Demande ${numeroTransaction} enregistrée avec succès`, 'success');

      // Offer to print receipt, then close
      const shouldPrint = window.confirm('Demande enregistrée ! Voulez-vous imprimer le reçu ?');
      if (shouldPrint) {
        setShowRecuPDF(true);
      } else {
        resetForm();
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTypeDocument('');
    setTransactionData(null);
      setFormData({
        nomComplet: '',
        cni: '',
        telephone: '',
        adresse: '',
        exemplaires: 1,
        observations: '',
      });
  };

  const selectedDoc = useMemo(() => typesDocuments.find(d => d.id === typeDocument), [typeDocument, typesDocuments]);

  return (
    <div>
      <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type de document */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de document <span className="text-red-500">*</span>
            </label>
            <select
              data-required="true"
              value={typeDocument}
              onChange={(e) => setTypeDocument(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Sélectionnez un type de document</option>
              {typesDocuments.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.nom} - {doc.tarif} FCFA</option>
              ))}
            </select>
          </div>

          {/* Informations du demandeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nomComplet"
              data-required="true"
              placeholder="Ex: Mamadou Diallo"
              value={formData.nomComplet}
              onChange={(e) => setFormData({...formData, nomComplet: e.target.value})}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro CNI <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cni"
              data-required="true"
              placeholder="Ex: 1234567890123"
              maxLength={13}
              value={formData.cni}
              onChange={(e) => setFormData({...formData, cni: e.target.value})}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              data-required="true"
              placeholder="Ex: 77 123 45 67"
              value={formData.telephone}
              onChange={(e) => setFormData({...formData, telephone: e.target.value})}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              name="adresse"
              placeholder="Ex: Quartier Nord, Kafountine"
              value={formData.adresse}
              onChange={(e) => setFormData({...formData, adresse: e.target.value})}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Nombre d'exemplaires */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre d'exemplaires <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="exemplaires"
              data-required="true"
              min="1"
              value={formData.exemplaires}
              onChange={(e) => setFormData({...formData, exemplaires: parseInt(e.target.value) || 1})}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode de paiement <span className="text-red-500">*</span>
            </label>
            <select
              name="modePaiement"
              data-required="true"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="especes">Espèces</option>
              <option value="mobile">Mobile Money</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

          {/* Observations */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observations
            </label>
            <textarea
              name="observations"
              rows={3}
              placeholder="Notes ou informations complémentaires..."
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            ></textarea>
          </div>
        </div>

        {/* Récapitulatif */}
        {selectedDoc && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Montant à payer</p>
                <p className="text-xs text-gray-600 mt-0.5">{selectedDoc.nom} × {formData.exemplaires}</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{(selectedDoc.tarif * formData.exemplaires).toLocaleString()} FCFA</p>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          {onSuccess && (
            <button
              type="button"
              onClick={onSuccess}
              className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-6 py-3 text-white text-sm font-medium rounded-lg whitespace-nowrap ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 transition-colors'
            }`}
          >
            <i className={`ri-${isSubmitting ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
            {isSubmitting ? 'Enregistrement...' : 'Valider et générer le document'}
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            <i className="ri-error-warning-line mr-2"></i>
            {error}
          </div>
        )}
      </form>

      {/* Modal Reçu PDF */}
      {showRecuPDF && transactionData && (
        <RecuPDF
          transaction={transactionData}
          onClose={() => {
            setShowRecuPDF(false);
            resetForm();
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
}
