
import React, { useState } from 'react';
import type { FormationType } from '../page';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../../utils/formValidation';

interface NouvelleFormationProps {
  onClose: () => void;
  onAdd: (formation: FormationType) => void;
}

export default function NouvelleFormation({
  onClose,
  onAdd,
}: NouvelleFormationProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    domaine: '',
    duree: '',
    responsable: '',
    budget: '',
    dateDebut: '',
    dateFin: '',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }

    const newFormation: FormationType = {
      id: 'FORM' + Date.now().toString().slice(-6),
      nom: formData.nom,
      domaine: formData.domaine,
      duree: formData.duree,
      responsable: formData.responsable,
      // Guard against NaN if the input is not a valid number
      budget: Number(formData.budget) || 0,
      dateDebut: formData.dateDebut,
      dateFin: formData.dateFin,
      statut: 'En cours',
      nombreInscrits: 0,
      nombreCertifies: 0,
      tauxReussite: 0,
    };

    try {
      setErrorMsg('');
      onAdd(newFormation);
      onClose();
    } catch (error) {
      setErrorMsg(
        getErrorMessage(error, 'La création de la formation a échoué.'),
      );
    }
  };

  return (
    <>
      {/* Overlay – clicking on it closes the modal */}
      <div className="fixed inset-0 bg-gray-900/50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Nouvelle Formation
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Créez une formation puis ajoutez-y des participants
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6">
              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la formation *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.nom}
                    onChange={(e) =>
                      setFormData({ ...formData, nom: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Ex: Couture et Confection"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domaine *
                  </label>
                  <select
                    data-required="true"
                    value={formData.domaine}
                    onChange={(e) =>
                      setFormData({ ...formData, domaine: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Artisanat">Artisanat</option>
                    <option value="Services">Services</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Technique">Technique</option>
                    <option value="Agroalimentaire">Agroalimentaire</option>
                    <option value="Commerce">Commerce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.duree}
                    onChange={(e) =>
                      setFormData({ ...formData, duree: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Ex: 6 mois"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.responsable}
                    onChange={(e) =>
                      setFormData({ ...formData, responsable: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Nom du responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (FCFA) *
                  </label>
                  <input
                    type="number"
                    data-required="true"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    data-required="true"
                    value={formData.dateDebut}
                    onChange={(e) =>
                      setFormData({ ...formData, dateDebut: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    data-required="true"
                    value={formData.dateFin}
                    onChange={(e) =>
                      setFormData({ ...formData, dateFin: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <i className="ri-information-line text-emerald-600 text-lg mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-800 font-medium">
                    Après la création
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Vous pourrez ajouter des participants à cette formation
                    depuis la fiche détaillée ou via le bouton "Inscrire un
                    jeune".
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line mr-1" />
                  Créer la formation
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
