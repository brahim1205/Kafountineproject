import DashboardLayout from '../../components/feature/DashboardLayout';
import StatsCard from './components/StatsCard';
import FormationCard from './components/FormationCard';
import JeuneCard from './components/JeuneCard';
import NouvelleFormation from './components/NouvelleFormation';
import InscriptionJeune from './components/InscriptionJeune';
import StatistiquesFormations from './components/StatistiquesFormations';
import DetailFormation from './components/DetailFormation';
import { useFormationsPage } from './useFormationsPage';

export type { FormationType, JeuneType } from './useFormationsPage';

export default function FormationsPage() {
  const { activeTab, domaines, errorMsg, filterDomaine, filterStatut, filteredFormations, filteredJeunes, formationsEnCours, formationsList, formationsStats, formationsTerminees, getJeunesForFormation, handleAddFormation, handleAddJeune, handleDeleteFormation, handleEditFormation, handleRemoveJeune, isCurrentYear, jeunesCertifies, searchTerm, selectedFormationId, setActiveTab, setFilterDomaine, setFilterStatut, setSearchTerm, setSelectedFormationId, setShowDetailFormation, setShowInscriptionJeune, setShowNouvelleFormation, showDetailFormation, showInscriptionJeune, showNouvelleFormation, successMsg, totalJeunes } = useFormationsPage();
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <i className="ri-check-line text-lg"></i>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formations Professionnelles</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des formations gratuites de la mairie</p>
          </div>
          <div className="flex gap-2">
            {isCurrentYear && (
              <>
                <button
                  onClick={() => setShowInscriptionJeune(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-user-add-line"></i>
                  Inscrire un jeune
                </button>
                <button
                  onClick={() => setShowNouvelleFormation(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line"></i>
                  Nouvelle formation
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon="ri-book-open-line"
            label="Formations actives"
            value={formationsEnCours.length.toString()}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatsCard
            icon="ri-checkbox-circle-line"
            label="Formations terminées"
            value={formationsTerminees.length.toString()}
            bgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatsCard
            icon="ri-team-line"
            label="Jeunes inscrits"
            value={totalJeunes.toString()}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatsCard
            icon="ri-award-line"
            label="Certifiés"
            value={jeunesCertifies.toString()}
            bgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-1">
              {(['formations', 'jeunes', 'statistiques'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchTerm('');
                  }}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i
                    className={`${
                      tab === 'formations'
                        ? 'ri-book-line'
                        : tab === 'jeunes'
                        ? 'ri-user-line'
                        : 'ri-bar-chart-line'
                    } mr-2`}
                  ></i>
                  {tab === 'formations'
                    ? 'Formations'
                    : tab === 'jeunes'
                    ? 'Jeunes inscrits'
                    : 'Statistiques'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Formations Tab */}
            {activeTab === 'formations' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Rechercher une formation..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <select
                    value={filterStatut}
                    onChange={e => setFilterStatut(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="tous">Tous les statuts</option>
                    <option value="En cours">En cours</option>
                    <option value="Terminée">Terminée</option>
                  </select>
                  <select
                    value={filterDomaine}
                    onChange={e => setFilterDomaine(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="tous">Tous les domaines</option>
                    {domaines.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredFormations.map(formation => (
                    <FormationCard
                      key={formation.id}
                      formation={formation}
                      jeunesCount={getJeunesForFormation(formation.id).length}
                      onInscrireJeune={() => {
                        setSelectedFormationId(formation.id);
                        setShowInscriptionJeune(true);
                      }}
                      onVoirDetail={() => {
                        setSelectedFormationId(formation.id);
                        setShowDetailFormation(true);
                      }}
                      onEdit={handleEditFormation}
                      onDelete={handleDeleteFormation}
                    />
                  ))}
                </div>

                {filteredFormations.length === 0 && (
                  <div className="text-center py-12">
                    <i className="ri-book-line text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500">Aucune formation trouvée</p>
                  </div>
                )}
              </div>
            )}

            {/* Jeunes Tab */}
            {activeTab === 'jeunes' && (
              <div className="space-y-4">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Rechercher un jeune..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJeunes.map(jeune => (
                    <JeuneCard
                      key={jeune.id}
                      jeune={jeune}
                      formations={formationsList}
                      onRemove={handleRemoveJeune}
                    />
                  ))}
                </div>

                {filteredJeunes.length === 0 && (
                  <div className="text-center py-12">
                    <i className="ri-user-line text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500">Aucun jeune trouvé</p>
                  </div>
                )}
              </div>
            )}

            {/* Statistiques Tab */}
            {activeTab === 'statistiques' && <StatistiquesFormations stats={formationsStats} />}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNouvelleFormation && (
        <NouvelleFormation onClose={() => setShowNouvelleFormation(false)} onAdd={handleAddFormation} />
      )}
      {showInscriptionJeune && (
        <InscriptionJeune
          formations={formationsList}
          preselectedFormationId={selectedFormationId}
          onClose={() => {
            setShowInscriptionJeune(false);
            setSelectedFormationId('');
          }}
          onAdd={handleAddJeune}
        />
      )}
      {showDetailFormation && selectedFormationId && (
        <DetailFormation
          formation={formationsList.find(f => f.id === selectedFormationId)!}
          jeunes={getJeunesForFormation(selectedFormationId)}
          allFormations={formationsList}
          onClose={() => {
            setShowDetailFormation(false);
            setSelectedFormationId('');
          }}
          onInscrireJeune={() => {
            setShowDetailFormation(false);
            setShowInscriptionJeune(true);
          }}
          onRemoveJeune={handleRemoveJeune}
        />
      )}
    </DashboardLayout>
  );
}
