import DashboardLayout from '../../../components/feature/DashboardLayout';
import RecuPDF from '../../../components/feature/RecuPDF';
import { clearFieldValidationError } from '../../../utils/formValidation';
import { useNouvelleTransaction } from './useNouvelleTransaction';

export default function NouvelleTransaction() {
  const { categorieSelectionnee, categories, etape, formData, handleBack, handleGenererRecu, handleRetourListe, handleSubmit, isSubmitting, montantTotal, preselectedCategoryId, serviceSelectionne, services, setFormData, setShowRecuModal, showRecuModal, showSuccessMessage, transactionData, transactionValidee } = useNouvelleTransaction();
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Message de succès */}
        {showSuccessMessage && transactionData && (
          <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-emerald-200 p-4 flex items-center gap-3 animate-slide-in-right">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <i className="ri-check-line text-emerald-600 text-xl"></i>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Transaction enregistrée !</p>
              <p className="text-sm text-gray-600">Numéro : {transactionData.numero}</p>
            </div>
          </div>
        )}

        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <i className="ri-arrow-left-line"></i>
            <span className="text-sm font-medium">Retour</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle transaction</h1>
          <p className="text-sm text-gray-600 mt-1">Enregistrer un nouveau paiement de taxe</p>
        </div>

        {/* Indicateur d'étapes */}
        {!transactionValidee && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Catégorie & Service' },
                { num: 2, label: 'Informations contribuable' },
                { num: 3, label: 'Confirmation' }
              ].map((step, index) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      etape >= step.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {etape > step.num ? <i className="ri-check-line"></i> : step.num}
                    </div>
                    <span className={`ml-3 text-sm font-medium ${
                      etape >= step.num ? 'text-gray-900' : 'text-gray-500 hidden sm:block'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`flex-1 h-1 mx-4 rounded ${
                      etape > step.num ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire ou Message de succès */}
        {!transactionValidee ? (
          <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Étape 1 : Catégorie & Service */}
              {etape === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie de taxe <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.categorie}
                      onChange={(e) => setFormData({ ...formData, categorie: e.target.value, service: '' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      data-required="true"
                      disabled={Boolean(preselectedCategoryId)}
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.nom}</option>
                      ))}
                    </select>
                  </div>

                  {formData.categorie && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        data-required="true"
                      >
                        <option value="">Sélectionner un service</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.nom} - {service.tarif.toLocaleString()} FCFA / {service.unite}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.service && serviceSelectionne && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantité ({serviceSelectionne.unite}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantite}
                        onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        data-required="true"
                      />
                      <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Montant total</span>
                          <span className="text-2xl font-bold text-emerald-700">
                            {montantTotal.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 2 : Informations contribuable */}
              {etape === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet du contribuable <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.contribuable}
                      onChange={(e) => setFormData({ ...formData, contribuable: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      placeholder="Ex: Mamadou Diallo"
                      data-required="true"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro CNI <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cni}
                        onChange={(e) => setFormData({ ...formData, cni: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        placeholder="1234567890123"
                        data-required="true"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        placeholder="77 123 45 67"
                        data-required="true"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      placeholder="Quartier, rue..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm resize-none"
                      placeholder="Informations complémentaires..."
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Étape 3 : Confirmation */}
              {etape === 3 && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 rounded-lg p-6 border border-emerald-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <i className="ri-file-text-line text-2xl text-emerald-600"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Récapitulatif de la transaction</h3>
                        <p className="text-sm text-gray-600">Vérifiez les informations avant validation</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">Catégorie</span>
                        <span className="text-sm font-medium text-gray-900">{categorieSelectionnee?.nom}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">Service</span>
                        <span className="text-sm font-medium text-gray-900">{serviceSelectionne?.nom}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">Quantité</span>
                        <span className="text-sm font-medium text-gray-900">{formData.quantite} {serviceSelectionne?.unite}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">Contribuable</span>
                        <span className="text-sm font-medium text-gray-900">{formData.contribuable}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">CNI</span>
                        <span className="text-sm font-medium text-gray-900">{formData.cni}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-emerald-200">
                        <span className="text-sm text-gray-600">Téléphone</span>
                        <span className="text-sm font-medium text-gray-900">{formData.telephone}</span>
                      </div>
                      {formData.adresse && (
                        <div className="flex justify-between py-2 border-b border-emerald-200">
                          <span className="text-sm text-gray-600">Adresse</span>
                          <span className="text-sm font-medium text-gray-900">{formData.adresse}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3 pt-4">
                        <span className="text-base font-semibold text-gray-900">Montant total</span>
                        <span className="text-2xl font-bold text-emerald-700">{montantTotal.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <i className="ri-information-line text-amber-600 text-xl flex-shrink-0"></i>
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Important</p>
                      <p>Un reçu PDF sera généré automatiquement après validation. Assurez-vous que toutes les informations sont correctes.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <i className="ri-arrow-left-line"></i>
                  {etape === 1 ? 'Annuler' : 'Précédent'}
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (etape === 1 && !formData.service) ||
                    (etape === 2 && (!formData.contribuable || !formData.cni || !formData.telephone))
                  }
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {etape === 3 ? (
                    <>
                      <i className="ri-check-line"></i>
                      {isSubmitting ? 'Validation...' : 'Valider et générer le reçu'}
                    </>
                  ) : (
                    <>
                      Suivant
                      <i className="ri-arrow-right-line"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-line text-4xl text-emerald-600"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction enregistrée avec succès !</h2>
              <p className="text-gray-600 mb-6">Numéro de transaction : <span className="font-semibold text-emerald-600">{transactionData?.numero}</span></p>
              
              <div className="bg-emerald-50 rounded-lg p-4 mb-6 inline-block">
                <p className="text-sm text-gray-700 mb-1">Montant payé</p>
                <p className="text-3xl font-bold text-emerald-700">{transactionData?.montant.toLocaleString()} FCFA</p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleGenererRecu}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-600/30 whitespace-nowrap"
                >
                  <i className="ri-printer-line"></i>
                  Générer le reçu PDF
                </button>
                <button
                  onClick={handleRetourListe}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <i className="ri-arrow-left-line"></i>
                  Retour à la liste
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Reçu PDF */}
      {showRecuModal && transactionData && (
        <RecuPDF
          transaction={transactionData}
          onClose={() => setShowRecuModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
