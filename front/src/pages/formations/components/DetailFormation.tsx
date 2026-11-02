
import { useState } from 'react';
import type { FormationType, JeuneType } from '../page';

interface DetailFormationProps {
  formation: FormationType;
  jeunes: JeuneType[];
  allFormations: FormationType[];
  onClose: () => void;
  onInscrireJeune: () => void;
  onRemoveJeune: (jeuneId: string) => void;
}

export default function DetailFormation({
  formation,
  jeunes,
  onClose,
  onInscrireJeune,
  onRemoveJeune,
}: DetailFormationProps) {
  const [searchJeune, setSearchJeune] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'inscrits' | 'stats'>('inscrits');
  const [errorMsg, setErrorMsg] = useState('');

  // -------------------------------------------------------------------------
  // Helper functions – wrapped in try/catch to avoid runtime crashes on bad data
  // -------------------------------------------------------------------------
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatMontant = (montant: number) => {
    try {
      return new Intl.NumberFormat('fr-FR').format(montant);
    } catch {
      return String(montant);
    }
  };

  // -------------------------------------------------------------------------
  // Data preparation
  // -------------------------------------------------------------------------
  const filteredJeunes = jeunes.filter((j) =>
    j.nom.toLowerCase().includes(searchJeune.toLowerCase()) ||
    j.prenom.toLowerCase().includes(searchJeune.toLowerCase()) ||
    j.cni.includes(searchJeune)
  );

  const hommes = jeunes.filter((j) => j.sexe === 'M').length;
  const femmes = jeunes.filter((j) => j.sexe === 'F').length;
  const certifies = jeunes.filter((j) => j.statutFinal === 'Certifié').length;

  const handleConfirmRemove = (id: string) => {
    try {
      setErrorMsg('');
      onRemoveJeune(id);
    } catch {
      setErrorMsg("Impossible de supprimer ce participant.");
    } finally {
      setConfirmRemoveId(null);
    }
  };

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------
  return (
    <>
      {/* Overlay – click to close */}
      <div className="fixed inset-0 bg-gray-900/50 z-50" onClick={onClose} />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* ==================== Header ==================== */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{formation.nom}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      formation.statut === 'En cours'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {formation.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formation.domaine} &bull; {formation.duree} &bull; {formation.responsable}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            {/* ==================== Quick Infos ==================== */}
            <div className="px-6 pt-5 flex-shrink-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{jeunes.length}</p>
                  <p className="text-xs text-emerald-600">Inscrits</p>
                </div>

                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-teal-700">{certifies}</p>
                  <p className="text-xs text-teal-600">Certifiés</p>
                </div>

                <div className="bg-cyan-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-cyan-700">{formatMontant(formation.budget)}</p>
                  <p className="text-xs text-cyan-600">Budget FCFA</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line" /> {formatDate(formation.dateDebut)} -{' '}
                  {formatDate(formation.dateFin)}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-men-line" /> {hommes} H
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-women-line" /> {femmes} F
                </span>
              </div>

              {/* -------------------- Sub‑tabs -------------------- */}
              <div className="flex gap-1 border-b border-gray-200">
                <button
                  onClick={() => setActiveSection('inscrits')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeSection === 'inscrits'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="ri-team-line mr-1.5" />
                  Participants ({jeunes.length})
                </button>

                <button
                  onClick={() => setActiveSection('stats')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeSection === 'stats'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="ri-bar-chart-line mr-1.5" />
                  Statistiques
                </button>
              </div>
            </div>

            {/* ==================== Main Content ==================== */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {/* -------------------- Participants List -------------------- */}
              {activeSection === 'inscrits' && (
                <div className="space-y-4">
                  {/* Search bar + action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un participant..."
                        value={searchJeune}
                        onChange={(e) => setSearchJeune(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      {formation.statut === 'En cours' && (
                        <button
                          onClick={onInscrireJeune}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-user-add-line mr-1" />
                          Ajouter un participant
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Participants */}
                  {filteredJeunes.length > 0 ? (
                    <div className="space-y-2">
                      {filteredJeunes.map((jeune) => (
                        <div
                          key={jeune.id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={jeune.photo}
                              alt={`${jeune.prenom} ${jeune.nom}`}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {jeune.prenom} {jeune.nom}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                  jeune.statutFinal === 'Certifié'
                                    ? 'bg-green-50 text-green-700'
                                    : jeune.statutFinal === 'En cours'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {jeune.statutFinal}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                              <span>
                                <i className="ri-phone-line mr-1" />
                                {jeune.telephone}
                              </span>
                              <span>
                                <i className="ri-graduation-cap-line mr-1" />
                                {jeune.niveauEtude}
                              </span>
                              <span>{jeune.sexe === 'M' ? 'Homme' : 'Femme'}</span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 mr-2">
                            <p
                              className={`text-sm font-bold ${
                                jeune.tauxAssiduite >= 90
                                  ? 'text-green-600'
                                  : jeune.tauxAssiduite >= 75
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {jeune.tauxAssiduite}%
                            </p>
                            <p className="text-xs text-gray-400">assiduité</p>
                          </div>

                          <div className="flex-shrink-0">
                            {confirmRemoveId === jeune.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleConfirmRemove(jeune.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs whitespace-nowrap cursor-pointer hover:bg-red-700 transition-colors"
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs whitespace-nowrap cursor-pointer hover:bg-gray-300 transition-colors"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRemoveId(jeune.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                title="Retirer de la formation"
                              >
                                <i className="ri-user-unfollow-line text-lg" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Empty / no‑result state
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-team-line text-2xl text-gray-400" />
                      </div>

                      {jeunes.length === 0 ? (
                        <>
                          <p className="text-gray-600 font-medium mb-1">Aucun participant inscrit</p>
                          <p className="text-sm text-gray-400 mb-4">
                            Commencez par ajouter des jeunes à cette formation
                          </p>
                          {formation.statut === 'En cours' && (
                            <button
                              onClick={onInscrireJeune}
                              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm whitespace-nowrap cursor-pointer"
                            >
                              <i className="ri-user-add-line mr-1" />
                              Inscrire le premier participant
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">
                          Aucun résultat pour &quot;{searchJeune}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- Statistics -------------------- */}
              {activeSection === 'stats' && (
                <div className="space-y-6">
                  {/* Gender distribution */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Répartition par sexe
                    </h4>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-emerald-50 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <i className="ri-men-line text-emerald-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-700">{hommes}</p>
                          <p className="text-xs text-emerald-600">
                            Hommes ({jeunes.length > 0 ? Math.round((hommes / jeunes.length) * 100) : 0}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 bg-pink-50 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                          <i className="ri-women-line text-pink-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-pink-700">{femmes}</p>
                          <p className="text-xs text-pink-600">
                            Femmes ({jeunes.length > 0 ? Math.round((femmes / jeunes.length) * 100) : 0}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education level distribution */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Répartition par niveau d’étude
                    </h4>
                    <div className="space-y-2">
                      {['Primaire', 'Collège', 'Lycée', 'Supérieur', 'Aucun'].map((niveau) => {
                        const count = jeunes.filter((j) => j.niveauEtude === niveau).length;
                        const pct = jeunes.length > 0 ? Math.round((count / jeunes.length) * 100) : 0;
                        if (count === 0) return null;
                        return (
                          <div key={niveau}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700">{niveau}</span>
                              <span className="text-sm font-medium text-gray-900">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status distribution – className built via string concatenation to avoid template‑literal parsing issues */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Répartition par statut
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'En cours', color: 'emerald', icon: 'ri-loader-4-line' },
                        { label: 'Certifié', color: 'green', icon: 'ri-award-line' },
                        { label: 'Abandon', color: 'red', icon: 'ri-close-circle-line' },
                      ].map((s) => {
                        const count = jeunes.filter((j) => j.statutFinal === s.label).length;
                        const bgClass = 'bg-' + s.color + '-50';
                        const textClass = 'text-' + s.color + '-700';
                        const iconClass = s.icon + ' text-' + s.color + '-600 text-xl mb-1';
                        return (
                          <div key={s.label} className={`${bgClass} rounded-lg p-4 text-center`}>
                            <i className={iconClass} />
                            <p className={`text-xl font-bold ${textClass}`}>{count}</p>
                            <p className={`text-xs ${textClass}`}>{s.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top assiduité */}
                  {jeunes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Meilleure assiduité
                      </h4>
                      <div className="space-y-2">
                        {[...jeunes]
                          .sort((a, b) => b.tauxAssiduite - a.tauxAssiduite)
                          .slice(0, 5)
                          .map((j, i) => (
                            <div
                              key={j.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                            >
                              <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </span>
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                {j.photo ? (
                                  <img src={j.photo} alt="" className="w-full h-full object-cover object-top" />
                                ) : (
                                  `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`.toUpperCase() || 'J'
                                )}
                              </div>
                              <span className="text-sm text-gray-900 flex-1">
                                {j.prenom} {j.nom}
                              </span>
                              <span
                                className={`text-sm font-bold ${
                                  j.tauxAssiduite >= 90 ? 'text-green-600' : 'text-amber-600'
                                }`}
                              >
                                {j.tauxAssiduite}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== Footer ==================== */}
            <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Fermer
              </button>

              {formation.statut === 'En cours' && (
                <button
                  onClick={onInscrireJeune}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-user-add-line mr-1" />
                  Ajouter un participant
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
