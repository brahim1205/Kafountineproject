
import React, { useState } from 'react';
import type { FormationType, JeuneType } from '../page';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../../utils/formValidation';

interface InscriptionJeuneProps {
  formations: FormationType[];
  preselectedFormationId?: string;
  onClose: () => void;
  onAdd: (jeune: JeuneType) => void;
}

export default function InscriptionJeune({
  formations,
  preselectedFormationId,
  onClose,
  onAdd,
}: InscriptionJeuneProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    formationId: preselectedFormationId || '',
    nom: '',
    prenom: '',
    cni: '',
    telephone: '',
    adresse: '',
    niveauEtude: '',
    sexe: '',
    dateNaissance: '',
    photo: '',
  });

  const formationsActives = formations.filter((f) => f.statut === 'En cours');
  const selectedFormation = formations.find(
    (f) => f.id === formData.formationId
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }

    const newJeune: JeuneType = {
      id: 'JEU' + Date.now().toString().slice(-6),
      formationId: formData.formationId,
      nom: formData.nom,
      prenom: formData.prenom,
      cni: formData.cni,
      telephone: formData.telephone,
      adresse: formData.adresse,
      niveauEtude: formData.niveauEtude,
      sexe: formData.sexe,
      dateNaissance: formData.dateNaissance,
      // Default avatar using UI Avatars (reliable service)
      photo:
        formData.photo ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.prenom || 'J') + ' ' + (formData.nom || 'N'))}&background=0D8ABC&color=fff&size=128`,
      dateInscription: new Date().toISOString().split('T')[0],
      tauxAssiduite: 100,
      statutFinal: 'En cours',
      presences: 0,
      absences: 0,
    };

    try {
      setErrorMsg('');
      onAdd(newJeune);
      onClose();
    } catch (error) {
      setErrorMsg(
        getErrorMessage(error, "L'inscription du jeune a échoué."),
      );
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-900/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal container */}
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Inscrire un jeune</h2>
                {selectedFormation && (
                  <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                    <i className="ri-book-line"></i>
                    {selectedFormation.nom}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6">
              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Formation */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formation *
                  </label>
                  <select
                    data-required="true"
                    value={formData.formationId}
                    onChange={(e) =>
                      setFormData({ ...formData, formationId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="">Sélectionner une formation</option>
                    {formationsActives.map((formation) => (
                      <option key={formation.id} value={formation.id}>
                        {formation.nom} ({formation.nombreInscrits} inscrits)
                      </option>
                    ))}
                  </select>
                  {formationsActives.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Aucune formation en cours disponible. Créez d'abord une formation.
                    </p>
                  )}
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.prenom}
                    onChange={(e) =>
                      setFormData({ ...formData, prenom: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Prénom"
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.nom}
                    onChange={(e) =>
                      setFormData({ ...formData, nom: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Nom de famille"
                  />
                </div>

                {/* CNI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNI *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.cni}
                    onChange={(e) =>
                      setFormData({ ...formData, cni: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="1234567890123"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    data-required="true"
                    value={formData.telephone}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-5

0 focus:border-transparent text-sm"
                    placeholder="771234567"
                  />
                </div>

                {/* Adresse */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    data-required="true"
                    value={formData.adresse}
                    onChange={(e) =>
                      setFormData({ ...formData, adresse: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Quartier, Kafountine"
                  />
                </div>

                {/* Niveau d'étude */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau d’étude *
                  </label>
                  <select
                    data-required="true"
                    value={formData.niveauEtude}
                    onChange={(e) =>
                      setFormData({ ...formData, niveauEtude: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Aucun">Aucun</option>
                    <option value="Primaire">Primaire</option>
                    <option value="Collège">Collège</option>
                    <option value="Lycée">Lycée</option>
                    <option value="Supérieur">Supérieur</option>
                  </select>
                </div>

                {/* Sexe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sexe *
                  </label>
                  <select
                    data-required="true"
                    value={formData.sexe}
                    onChange={(e) =>
                      setFormData({ ...formData, sexe: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    data-required="true"
                    value={formData.dateNaissance}
                    onChange={(e) =>
                      setFormData({ ...formData, dateNaissance: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({
                          ...formData,
                          photo: URL.createObjectURL(file),
                        });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Action buttons */}
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
                  disabled={formationsActives.length === 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-user-add-line mr-1"></i>
                  Inscrire le jeune
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
