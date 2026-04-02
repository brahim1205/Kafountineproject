
import { useState, useRef, useEffect } from 'react';
import type { FormationType } from '../page';

interface FormationCardProps {
  formation: FormationType;
  jeunesCount: number;
  onInscrireJeune: () => void;
  onVoirDetail: () => void;
  onEdit: (formation: FormationType) => void;
  onDelete: (id: string) => void;
}

export default function FormationCard({
  formation,
  jeunesCount,
  onInscrireJeune,
  onVoirDetail,
  onEdit,
  onDelete,
}: FormationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({ ...formation });
  const [errorMsg, setErrorMsg] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatMontant = (montant: number) =>
    new Intl.NumberFormat('fr-FR').format(montant);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      onEdit(editData);
      setShowEdit(false);
    } catch {
      setErrorMsg("Impossible d'enregistrer la formation.");
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 cursor-pointer" onClick={onVoirDetail}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900 hover:text-emerald-700 transition-colors">
                {formation.nom}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  formation.statut === 'En cours'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {formation.statut}
              </span>
            </div>
            <p className="text-sm text-gray-600">{formation.domaine}</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <i className="ri-time-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-gray-600">Durée : {formation.duree}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <i className="ri-user-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-gray-600">{formation.responsable}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <i className="ri-calendar-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-gray-600">
              {formatDate(formation.dateDebut)} - {formatDate(formation.dateFin)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <i className="ri-money-dollar-circle-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-gray-600">
              Budget : {formatMontant(formation.budget)} FCFA
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Inscrits</p>
            <p className="text-lg font-bold text-gray-900">{jeunesCount}</p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Certifiés</p>
            <p className="text-lg font-bold text-emerald-600">
              {formation.nombreCertifies}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Réussite</p>
            <p className="text-lg font-bold text-teal-600">
              {formation.tauxReussite}%
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onVoirDetail}
            className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            <i className="ri-eye-line mr-1"></i>
            Voir détails
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
            >
              <i className="ri-more-2-line"></i>
            </button>

            {showMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onVoirDetail();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <i className="ri-eye-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                  Voir les détails
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditData({ ...formation });
                    setShowEdit(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <i className="ri-edit-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                  Modifier
                </button>
                {formation.statut === 'En cours' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onInscrireJeune();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <i className="ri-user-add-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                    Inscrire un jeune
                  </button>
                )}
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-red-400 w-4 h-4 flex items-center justify-center"></i>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Modifier */}
      {showEdit && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 z-50"
            onClick={() => setShowEdit(false)}
          ></div>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    Modifier la formation
                  </h2>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-6">
                  {errorMsg && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom *
                      </label>
                      <input
                        type="text"
                        required
                        value={editData.nom}
                        onChange={(e) =>
                          setEditData({ ...editData, nom: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Domaine *
                      </label>
                      <select
                        required
                        value={editData.domaine}
                        onChange={(e) =>
                          setEditData({ ...editData, domaine: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                      >
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
                        required
                        value={editData.duree}
                        onChange={(e) =>
                          setEditData({ ...editData, duree: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsable *
                      </label>
                      <input
                        type="text"
                        required
                        value={editData.responsable}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            responsable: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget (FCFA) *
                      </label>
                      <input
                        type="number"
                        required
                        value={editData.budget}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            budget: Number(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date début *
                      </label>
                      <input
                        type="date"
                        required
                        value={editData.dateDebut}
                        onChange={(e) =>
                          setEditData({ ...editData, dateDebut: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date fin *
                      </label>
                      <input
                        type="date"
                        required
                        value={editData.dateFin}
                        onChange={(e) =>
                          setEditData({ ...editData, dateFin: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut
                      </label>
                      <select
                        value={editData.statut}
                        onChange={(e) =>
                          setEditData({ ...editData, statut: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                      >
                        <option value="En cours">En cours</option>
                        <option value="Terminée">Terminée</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowEdit(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Suppression */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 z-50"
            onClick={() => setShowDeleteConfirm(false)}
          ></div>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 text-center">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-delete-bin-line text-2xl text-red-600"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Supprimer cette formation ?
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>{formation.nom}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible. Tous les jeunes inscrits (
                    {jeunesCount}) seront également retirés.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        onDelete(formation.id);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
