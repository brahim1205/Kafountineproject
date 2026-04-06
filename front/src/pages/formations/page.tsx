
import { useState, useCallback, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import StatsCard from './components/StatsCard';
import FormationCard from './components/FormationCard';
import JeuneCard from './components/JeuneCard';
import NouvelleFormation from './components/NouvelleFormation';
import InscriptionJeune from './components/InscriptionJeune';
import StatistiquesFormations from './components/StatistiquesFormations';
import DetailFormation from './components/DetailFormation';
import {
  createFormation,
  createJeune,
  deleteFormation,
  deleteJeune,
  getFormationStats,
  inscrireJeuneFormation,
  listFormations,
  listJeunes,
  updateFormation,
  type Formation,
  type Jeune,
  type JeuneFormationEnrollment,
  type FormationStats,
} from '../../services/formations';
import { getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';

export interface FormationType {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  nombreInscrits: number;
  nombreCertifies: number;
  tauxReussite: number;
}

export interface JeuneType {
  id: string;
  formationId: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaissance: string;
  photo: string;
  dateInscription: string;
  tauxAssiduite: number;
  statutFinal: string;
  presences: number;
  absences: number;
}

const EMPTY_FORMATION_STATS: FormationStats = {
  totalFormations: 0,
  formationsEnCours: 0,
  formationsTerminees: 0,
  totalJeunesFormes: 0,
  totalCertifies: 0,
  tauxReussiteGlobal: 0,
  budgetTotal: 0,
  repartitionDomaines: [],
  repartitionSexe: [],
  evolutionAnnuelle: [],
};

function mapFormationToUi(item: Formation): FormationType {
  return {
    id: item.id,
    nom: item.nom,
    domaine: item.domaine,
    duree: item.duree,
    responsable: item.responsable,
    budget: item.budget,
    dateDebut: item.dateDebut,
    dateFin: item.dateFin,
    statut: item.statut === 'EN_COURS' ? 'En cours' : item.statut === 'TERMINEE' ? 'Terminée' : item.statut === 'ANNULEE' ? 'Annulée' : 'Planifiée',
    nombreInscrits: item.nombreInscrits || 0,
    nombreCertifies: item.nombreCertifies || 0,
    tauxReussite: item.tauxReussite || 0,
  };
}

function mapJeuneToUi(jeune: Jeune, enrollment: JeuneFormationEnrollment | null): JeuneType {
  return {
    id: jeune.id,
    formationId: enrollment?.formationId || '',
    nom: jeune.nom,
    prenom: jeune.prenom,
    cni: jeune.cni,
    telephone: jeune.telephone,
    adresse: jeune.adresse,
    niveauEtude: jeune.niveauEtude,
    sexe: jeune.sexe,
    dateNaissance: jeune.dateNaiss,
    photo: jeune.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent((jeune.prenom || 'J') + '+' + (jeune.nom || 'N'))}&background=0D8ABC&color=fff&size=128`,
    dateInscription: enrollment?.dateInscription || jeune.createdAt || '',
    tauxAssiduite: enrollment?.tauxAssiduite || 0,
    statutFinal: enrollment?.statutFinal || 'En cours',
    presences: enrollment?.presences || 0,
    absences: enrollment?.absences || 0,
  };
}

export default function FormationsPage() {
  const [activeTab, setActiveTab] = useState<'formations' | 'jeunes' | 'statistiques'>('formations');
  const userRole = getStoredUserRole() || 'admin';
  const [formationsList, setFormationsList] = useState<FormationType[]>([]);
  const [jeunesList, setJeunesList] = useState<JeuneType[]>([]);
  const [formationsStats, setFormationsStats] = useState<FormationStats>(EMPTY_FORMATION_STATS);
  const [showNouvelleFormation, setShowNouvelleFormation] = useState(false);
  const [showInscriptionJeune, setShowInscriptionJeune] = useState(false);
  const [selectedFormationId, setSelectedFormationId] = useState<string>('');
  const [showDetailFormation, setShowDetailFormation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterDomaine, setFilterDomaine] = useState<string>('tous');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;

  const toApiStatus = (status: string): string => {
    if (status === 'En cours') return 'EN_COURS';
    if (status === 'Terminée') return 'TERMINEE';
    if (status === 'Annulée') return 'ANNULEE';
    return 'PLANIFIEE';
  };

  const loadData = useCallback(async () => {
    try {
      setErrorMsg('');
      const year = selectedYear || new Date().getFullYear();
      const [formations, jeunes, stats] = await Promise.all([
        listFormations(year), 
        listJeunes(year), 
        getFormationStats(year)
      ]);
      
      setFormationsList((formations || []).map(mapFormationToUi));

      const mappedJeunes: JeuneType[] = [];
      (jeunes || []).forEach((j: Jeune) => {
        const entries = Array.isArray(j.formations) && j.formations.length > 0 ? j.formations : [null];
        entries.forEach((enroll) => {
          mappedJeunes.push(mapJeuneToUi(j, enroll));
        });
      });
      setJeunesList(mappedJeunes.filter((j) => j.formationId));
      setFormationsStats(stats || EMPTY_FORMATION_STATS);
    } catch {
      setFormationsList([]);
      setJeunesList([]);
      setFormationsStats(EMPTY_FORMATION_STATS);
      setErrorMsg("Impossible de charger les données des formations.");
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = useCallback((msg: string) => {
    setErrorMsg('');
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }, []);

  // Ajouter une formation
  const handleAddFormation = useCallback(async (formation: FormationType) => {
    const year = selectedYear || new Date().getFullYear();
    try {
      await createFormation({
        nom: formation.nom,
        domaine: formation.domaine,
        duree: formation.duree,
        responsable: formation.responsable,
        budget: formation.budget,
        dateDebut: formation.dateDebut,
        dateFin: formation.dateFin,
        statut: toApiStatus(formation.statut),
        year: year,
      });
      // Attendre un peu pour s'assurer que la données est persistée
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
      showSuccess('Formation créée avec succès !');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création.";
      setErrorMsg(errorMessage);
    }
  }, [showSuccess, loadData, selectedYear]);

  // Modifier une formation
  const handleEditFormation = useCallback(async (updated: FormationType) => {
    try {
      await updateFormation(updated.id, {
        nom: updated.nom,
        domaine: updated.domaine,
        duree: updated.duree,
        responsable: updated.responsable,
        budget: updated.budget,
        dateDebut: updated.dateDebut,
        dateFin: updated.dateFin,
        statut: toApiStatus(updated.statut),
        year: selectedYear,
      });
      await loadData();
      showSuccess('Formation modifiée avec succès !');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erreur lors de la modification.');
    }
  }, [showSuccess, loadData, selectedYear]);

  // Supprimer une formation
  const handleDeleteFormation = useCallback(async (id: string) => {
    try {
      await deleteFormation(id);
      await loadData();
      showSuccess('Formation supprimée avec succès !');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    }
  }, [showSuccess, loadData]);

  // Inscrire un jeune
  const handleAddJeune = useCallback(async (jeune: JeuneType) => {
    try {
      const created = await createJeune({
        nom: jeune.nom,
        prenom: jeune.prenom,
        cni: jeune.cni,
        telephone: jeune.telephone,
        adresse: jeune.adresse,
        niveauEtude: jeune.niveauEtude,
        sexe: jeune.sexe,
        dateNaiss: jeune.dateNaissance,
        year: selectedYear,
      });
      await inscrireJeuneFormation(created.id, jeune.formationId);
      await loadData();
      showSuccess(`${jeune.prenom} ${jeune.nom} inscrit(e) avec succès !`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    }
  }, [showSuccess, loadData, selectedYear]);

  // Retirer un jeune
  const handleRemoveJeune = useCallback(async (jeuneId: string) => {
    const jeune = jeunesList.find(j => j.id === jeuneId);
    if (!jeune) return;
    try {
      await deleteJeune(jeuneId);
      await loadData();
      showSuccess(`${jeune.prenom} ${jeune.nom} retiré(e) de la formation.`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erreur lors de la suppression du jeune.');
    }
  }, [jeunesList, showSuccess, loadData]);

  const formationsEnCours = formationsList.filter(f => f.statut === 'En cours');
  const formationsTerminees = formationsList.filter(f => f.statut === 'Terminée');
  const totalJeunes = jeunesList.length;
  const jeunesCertifies = jeunesList.filter(j => j.statutFinal === 'Certifié').length;

  const filteredFormations = formationsList.filter(formation => {
    const matchSearch =
      formation.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formation.domaine.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formation.responsable.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'tous' || formation.statut === filterStatut;
    const matchDomaine = filterDomaine === 'tous' || formation.domaine === filterDomaine;
    return matchSearch && matchStatut && matchDomaine;
  });

  const filteredJeunes = jeunesList.filter(jeune => {
    const formation = formationsList.find(f => f.id === jeune.formationId);
    const matchSearch =
      jeune.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jeune.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jeune.cni.includes(searchTerm) ||
      (formation?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchSearch;
  });

  const domaines = Array.from(new Set(formationsList.map(f => f.domaine)));

  const getJeunesForFormation = (formationId: string) =>
    jeunesList.filter(j => j.formationId === formationId);

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
            {userRole !== 'super_admin' && isCurrentYear && (
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
            bgColor="bg-teal-50"
            iconColor="text-teal-600"
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
