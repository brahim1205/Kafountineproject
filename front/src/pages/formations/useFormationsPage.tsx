import { useState, useCallback, useEffect } from 'react';
import { createFormation, createJeune, deleteFormation, deleteJeune, getFormationStats, inscrireJeuneFormation, listFormations, listJeunes, updateFormation, type Formation, type Jeune, type JeuneFormationEnrollment, type FormationStats } from '../../services/formations';
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

export const EMPTY_FORMATION_STATS: FormationStats = {
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

export function mapFormationToUi(item: Formation): FormationType {
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

export function mapJeuneToUi(jeune: Jeune, enrollment: JeuneFormationEnrollment | null): JeuneType {
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
    photo: jeune.photo || '',
    dateInscription: enrollment?.dateInscription || jeune.createdAt || '',
    tauxAssiduite: enrollment?.tauxAssiduite || 0,
    statutFinal: enrollment?.statutFinal || 'En cours',
    presences: enrollment?.presences || 0,
    absences: enrollment?.absences || 0,
  };
}

export function useFormationsPage() {
  const [activeTab, setActiveTab] = useState<'formations' | 'jeunes' | 'statistiques'>('formations');
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


  return { activeTab, domaines, errorMsg, filterDomaine, filterStatut, filteredFormations, filteredJeunes, formationsEnCours, formationsList, formationsStats, formationsTerminees, getJeunesForFormation, handleAddFormation, handleAddJeune, handleDeleteFormation, handleEditFormation, handleRemoveJeune, isCurrentYear, jeunesCertifies, searchTerm, selectedFormationId, setActiveTab, setFilterDomaine, setFilterStatut, setSearchTerm, setSelectedFormationId, setShowDetailFormation, setShowInscriptionJeune, setShowNouvelleFormation, showDetailFormation, showInscriptionJeune, showNouvelleFormation, successMsg, totalJeunes };
}
