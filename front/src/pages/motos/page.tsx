import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import RecuPDF from '../../components/feature/RecuPDF';
import { createMoto, createMotoPayment, getMotoConfiguration, getMotosStats, listMotoPayments, listMotos, updateMoto, validateMotoDuplicates, type Moto, type MotoPayment, type MotoStats } from '../../services/motos';
import { ensureContribuableByIdentity } from '../../services/contribuables';
import { getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';
import { useToast } from '../../components/feature/Toast';

type UiMoto = Moto & {
  photo: string;
  proprietaire: {
    nom: string;
    cni: string;
  };
  conducteur: {
    nom: string;
    cni: string;
  };
};

type UiMotoPayment = MotoPayment & {
  statut: string;
  datePaiement: string | null;
  proprietaire: string;
  matricule: string;
  agent: string;
};

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

export default function MotosPage() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const canManage = userRole !== 'super_admin' && userRole !== 'comptable' && isCurrentYear;
  const [activeTab, setActiveTab] = useState<'liste' | 'paiements' | 'retards'>('liste');
  const [showEnregistrement, setShowEnregistrement] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const [showChangement, setShowChangement] = useState(false);
  const [showRecuPDF, setShowRecuPDF] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedMoto, setSelectedMoto] = useState<UiMoto | null>(null);
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [motos, setMotos] = useState<UiMoto[]>([]);
  const [paiementsMotos, setPaiementsMotos] = useState<UiMotoPayment[]>([]);
  const [error, setError] = useState('');
  const [isSubmittingEnregistrement, setIsSubmittingEnregistrement] = useState(false);
  const [isSubmittingPaiement, setIsSubmittingPaiement] = useState(false);
  const [statistiquesMotos, setStatistiquesMotos] = useState<MotoStats>({
    totalMotos: 0,
    paiementsMois: 0,
    enRetard: 0,
    recettesMois: 0,
  });
  const [motoConfig, setMotoConfig] = useState({ tarifMensuel: 0, penaliteRetard: 0 });

  const loadData = async () => {
    try {
      setError('');
      const [motosData, paymentsData, stats, config] = await Promise.all([
        listMotos(selectedYear),
        listMotoPayments(selectedYear),
        getMotosStats(selectedYear),
        getMotoConfiguration(),
      ]);
      const motosMapped: UiMoto[] = (motosData || []).map((m) => ({
        ...m,
        photo: m.photo || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=400&fit=crop',
        proprietaire: {
          nom: `${m.proprietaire?.prenom || ''} ${m.proprietaire?.nom || ''}`.trim() || 'N/A',
          cni: m.proprietaire?.nin || '-',
        },
        conducteur: {
          nom: `${m.conducteur?.prenom || ''} ${m.conducteur?.nom || ''}`.trim() || 'N/A',
          cni: m.conducteur?.nin || '-',
        },
      }));
      const paymentsMapped: UiMotoPayment[] = (paymentsData || []).map((p) => ({
        ...p,
        statut: p.statut === 'PAYE' ? 'Payé' : p.statut === 'EN_ATTENTE' ? 'En attente' : 'En retard',
        datePaiement: p.datePaiement ? new Date(p.datePaiement).toISOString() : null,
        proprietaire: `${p.moto?.proprietaire?.prenom || ''} ${p.moto?.proprietaire?.nom || ''}`.trim() || 'N/A',
        matricule: p.moto?.matricule || '-',
        agent: p.agent || 'Agent Municipal',
      }));
      setMotos(motosMapped);
      setPaiementsMotos(paymentsMapped);
      setStatistiquesMotos(stats || {});
      setMotoConfig(config || { tarifMensuel: 0, penaliteRetard: 0 });
    } catch {
      setMotos([]);
      setPaiementsMotos([]);
      setStatistiquesMotos({
        totalMotos: 0,
        paiementsMois: 0,
        enRetard: 0,
        recettesMois: 0,
      });
      setMotoConfig({ tarifMensuel: 0, penaliteRetard: 0 });
      setError('Impossible de charger les données des motos.');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const motosRetard = useMemo(() => motos.filter((m) => m.enRetard), [motos]);
  const paiementsRecents = useMemo(() => paiementsMotos.filter((p) => p.statut === 'Payé').slice(0, 10), [paiementsMotos]);

  const filteredMotos = motos.filter((moto) => {
    const matchSearch = (moto.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (moto.proprietaire?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (moto.conducteur?.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'Tous' || 
                       (filterStatut === 'En retard' && moto.enRetard) ||
                       (filterStatut === 'À jour' && !moto.enRetard);
    return matchSearch && matchStatut;
  });

  const handlePaiement = (moto: UiMoto) => {
    setSelectedMoto(moto);
    setShowPaiement(true);
  };

  const handleChangement = (moto: UiMoto) => {
    setSelectedMoto(moto);
    setShowChangement(true);
  };

  const handleImprimerRecu = (paiement: UiMotoPayment) => {
    const recuData = {
      numero: paiement.numeroRecu,
      date: new Date(paiement.datePaiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      heure: new Date(paiement.datePaiement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contribuable: paiement.proprietaire,
      type: `Taxe moto Jakarta - ${paiement.mois}`,
      montant: paiement.montant,
      agent: paiement.agent
    };
    setTransactionData(recuData);
    setShowRecuPDF(true);
  };

  const handleSubmitEnregistrement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmittingEnregistrement(true);
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const matricule = (formData.get('matricule') as string) || '';
      const permis = (formData.get('permis') as string) || '';
      
      // Validation des doublons côté frontend
      const { matriculeExists, permisExists } = await validateMotoDuplicates(matricule, permis);
      
      if (matriculeExists) {
        setError('Ce numéro de matricule est déjà utilisé par une autre moto.');
        setIsSubmittingEnregistrement(false);
        return;
      }
      if (permisExists) {
        setError('Ce numéro de permis de conduire est déjà utilisé par une autre moto.');
        setIsSubmittingEnregistrement(false);
        return;
      }
      
      // Check if driver is same as owner
      const isSameDriver = (formData.get('isSameDriver') as string) === 'on';
      // First ensure the proprietaire exists
      const proprietaire = await ensureContribuableByIdentity({
        cni: (formData.get('cniProprietaire') as string) || '',
        fullName: (formData.get('nomProprietaire') as string) || '',
        telephone: (formData.get('telephoneProprietaire') as string) || '',
        adresse: (formData.get('adresseProprietaire') as string) || '',
      });
      // Handle driver - either same as owner or create separate
      let conducteurId = proprietaire.id;
      if (!isSameDriver && (formData.get('cniConducteur') as string)) {
        try {
          const conducteur = await ensureContribuableByIdentity({
            cni: (formData.get('cniConducteur') as string) || '',
            fullName: (formData.get('nomConducteur') as string) || '',
            telephone: (formData.get('telephoneConducteur') as string) || '',
            adresse: '',
          });
          conducteurId = conducteur.id;
        } catch {
          setError("Impossible d'enregistrer le conducteur.");
          setIsSubmittingEnregistrement(false);
          return;
        }
      }

      // Handle photo - read file if uploaded
      let photoUrl: string | undefined;
      const photoInput = form.querySelector('input[name="photo"]') as HTMLInputElement;
      if (photoInput && photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      // Create the moto - use selectedYear for consistency with current filter
      // This ensures the newly created moto appears in the current list view
      await createMoto({
        matricule: formData.get('matricule') as string,
        marque: formData.get('marque') as string,
        modele: formData.get('modele') as string,
        annee: selectedYear,
        couleur: formData.get('couleur') as string,
        proprietaireId: proprietaire.id,
        conducteurId: conducteurId,
        permis: formData.get('permis') as string,
        photo: photoUrl,
      });

      // Close modal first
      setShowEnregistrement(false);
      
      // Refresh the list and wait for it
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadData();
      setSuccessMessage('Moto enregistrée avec succès !');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('matricule')) {
        setError('Ce numéro de matricule est déjà utilisé par une autre moto.');
      } else if (message.includes('permis')) {
        setError('Ce numéro de permis de conduire est déjà utilisé par une autre moto.');
      } else if (message.includes('introuvable')) {
        setError(message);
      } else {
        setError(message || "Impossible d'enregistrer la moto");
      }
    } finally {
      setIsSubmittingEnregistrement(false);
    }
  };

  const handleSubmitPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPaiement(true);
    
    if (!selectedMoto) return;

    // Créer les données de transaction pour le reçu
    const now = new Date();
    const numeroRecu = `MOTO-${now.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;
    const montantTotal = selectedMoto.enRetard
      ? motoConfig.tarifMensuel + (selectedMoto.montantPenalite || motoConfig.penaliteRetard)
      : motoConfig.tarifMensuel;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const moisPaiement = formData.get('mois') as string;

    const newTransaction = {
      numero: numeroRecu,
      date: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contribuable: selectedMoto.proprietaire.nom,
      type: `Taxe moto Jakarta ${selectedMoto.matricule} - ${moisPaiement}${selectedMoto.enRetard ? ' (avec pénalité)' : ''}`,
      montant: montantTotal,
      agent: 'Agent Municipal'
    };

    try {
      await createMotoPayment({
        motoId: selectedMoto.id,
        reference: numeroRecu,
        mois: moisPaiement,
      });
      setTransactionData(newTransaction);
      setShowPaiement(false);
      setSelectedMoto(null);
      setSuccessMessage('Paiement enregistré avec succès !');
      setShowSuccessMessage(true);
      await loadData();
      setTimeout(() => {
        setShowSuccessMessage(false);
        setShowRecuPDF(true);
      }, 1000);
    } catch (error) {
      showToast("Impossible d'enregistrer le paiement.", 'error');
    } finally {
      setIsSubmittingPaiement(false);
    }
  };

  const handleSubmitChangement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const typeChangement = (formData.get('typeChangement') as string) || 'proprietaire';
      const nouveauNom = (formData.get('nouveauNom') as string) || '';
      const nouveauCNI = (formData.get('nouveauCNI') as string) || '';
      const nouveauTelephone = (formData.get('nouveauTelephone') as string) || '';
      const nouveauPermis = (formData.get('nouveauPermis') as string) || '';
      
      if (!nouveauNom || !nouveauCNI || !nouveauTelephone) {
        throw new Error('Le nom, le CNI et le téléphone sont requis');
      }

      // Create or find the new personne
      const nouvellePersonne = await ensureContribuableByIdentity({
        cni: nouveauCNI,
        fullName: nouveauNom,
        telephone: nouveauTelephone,
        adresse: (formData.get('nouvelleAdresse') as string) || '',
      });

      // Update the moto with new owner or driver
      if (typeChangement === 'proprietaire') {
        await updateMoto(selectedMoto.id, {
          proprietaireId: nouvellePersonne.id,
        });
      } else {
        await updateMoto(selectedMoto.id, {
          conducteurId: nouvellePersonne.id,
          permis: nouveauPermis,
        });
      }

      // Refresh the list
      loadData();
      
      setShowChangement(false);
      setSelectedMoto(null);
      setSuccessMessage('Changement enregistré avec succès !');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le changement");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Message de succès */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
            <i className="ri-checkbox-circle-line text-2xl"></i>
            <div>
              <p className="font-medium">{successMessage}</p>
              {successMessage.includes('Paiement') && (
                <p className="text-xs text-emerald-100">Génération du reçu en cours...</p>
              )}
            </div>
          </div>
        )}

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Motos Jakarta</h1>
            <p className="text-sm text-gray-600 mt-1">Suivi des motos-taxis et paiements mensuels</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowEnregistrement(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line text-lg"></i>
              Nouvelle Moto
            </button>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Motos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistiquesMotos.totalMotos}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <i className="ri-motorbike-line text-2xl text-emerald-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paiements ce mois</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistiquesMotos.paiementsMois}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En retard</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{statistiquesMotos.enRetard}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-alarm-warning-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recettes du mois</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(statistiquesMotos?.recettesMois || 0).toLocaleString()} FCFA</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-teal-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('liste')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'liste'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-list-check text-base mr-2"></i>
                Liste des motos
              </button>
              <button
                onClick={() => setActiveTab('paiements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'paiements'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-money-dollar-circle-line text-base mr-2"></i>
                Paiements récents
              </button>
              <button
                onClick={() => setActiveTab('retards')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'retards'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-alarm-warning-line text-base mr-2"></i>
                Retards ({motosRetard.length})
              </button>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {activeTab === 'liste' && (
              <div className="space-y-4">
                {/* Filtres */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                      <input
                        type="text"
                        placeholder="Rechercher par matricule, propriétaire ou conducteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                  >
                    <option>Tous</option>
                    <option>À jour</option>
                    <option>En retard</option>
                  </select>
                </div>

                {/* Liste des motos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredMotos.map((moto) => (
                    <div key={moto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex gap-4">
                        <img
                          src={moto.photo}
                          alt={`${moto.marque} ${moto.modele}`}
                          className="w-32 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{moto.matricule}</h3>
                              <p className="text-sm text-gray-600">{moto.marque} {moto.modele} ({moto.annee})</p>
                            </div>
                            {moto.enRetard ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded whitespace-nowrap">
                                En retard
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded whitespace-nowrap">
                                À jour
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm mb-3">
                            <div className="flex items-center gap-2 text-gray-600">
                              <i className="ri-user-line text-base"></i>
                              <span>Propriétaire: {moto.proprietaire.nom}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <i className="ri-steering-2-line text-base"></i>
                              <span>Conducteur: {moto.conducteur.nom}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <i className="ri-calendar-line text-base"></i>
                              <span>Prochain paiement: {moto.prochainPaiement ? new Date(moto.prochainPaiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non défini'}</span>
                            </div>
                            {moto.enRetard && (
                              <div className="flex items-center gap-2 text-red-600 font-medium">
                                <i className="ri-error-warning-line text-base"></i>
                                <span>Retard: {moto.joursRetard} jours - Pénalité: {moto.montantPenalite?.toLocaleString()} FCFA</span>
                              </div>
                            )}
                          </div>

                          {canManage && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePaiement(moto)}
                                className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <i className="ri-money-dollar-circle-line mr-1"></i>
                                Paiement
                              </button>
                              <button
                                onClick={() => handleChangement(moto)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <i className="ri-exchange-line"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'paiements' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">N° Reçu</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Matricule</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Propriétaire</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mois</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Montant</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Agent</th>
                      {canManage && (
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paiementsRecents.map((paiement) => (
                      <tr key={paiement.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">{paiement.numeroRecu}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{paiement.matricule}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{paiement.proprietaire}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{paiement.mois}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-emerald-600">{paiement.montant.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{paiement.datePaiement ? new Date(paiement.datePaiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{paiement.agent}</td>
                        {canManage && (
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => handleImprimerRecu(paiement)}
                              className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Imprimer le reçu"
                            >
                              <i className="ri-printer-line text-lg"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'retards' && (
              <div className="space-y-4">
                {canManage && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const csvContent = [
                          ['Matricule', 'Marque', 'Modèle', 'Propriétaire', 'Téléphone', 'Jours de retard', 'Montant pénalité', 'Dernier paiement'].join(','),
                          ...motosRetard.map(m => [
                            m.matricule,
                            m.marque,
                            m.modele,
                            m.proprietaire?.nom || '',
                            m.proprietaire?.telephone || '',
                            m.joursRetard,
                            m.montantPenalite,
                            m.dernierPaiement ? new Date(m.dernierPaiement).toLocaleDateString('fr-FR') : 'Aucun'
                          ].join(','))
                        ].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `motos-retard-${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <i className="ri-download-line"></i>
                      Télécharger la liste
                    </button>
                  </div>
                )}
                {motosRetard.map((moto) => (
                  <div key={moto.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-4">
                        <img
                          src={moto.photo}
                          alt={`${moto.marque} ${moto.modele}`}
                          className="w-24 h-20 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{moto.matricule}</h3>
                          <p className="text-sm text-gray-600 mb-2">{moto.marque} {moto.modele}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <i className="ri-user-line text-base"></i>
                              <span>{moto.proprietaire.nom}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <i className="ri-phone-line text-base"></i>
                              <span>{moto.proprietaire.telephone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded whitespace-nowrap inline-block mb-2">
                          {moto.joursRetard} jours de retard
                        </span>
                        <p className="text-sm text-gray-600">Dernier paiement</p>
                        <p className="text-sm font-medium text-gray-900">{moto.dernierPaiement ? new Date(moto.dernierPaiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Aucun'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-red-200">
                      <div>
                        <p className="text-sm text-gray-600">Montant à payer (avec pénalité)</p>
                        <p className="text-xl font-bold text-red-600">{(motoConfig.tarifMensuel + moto.montantPenalite).toLocaleString()} FCFA</p>
                        <p className="text-xs text-gray-500">Taxe: {motoConfig.tarifMensuel.toLocaleString()} FCFA + Pénalité: {moto.montantPenalite.toLocaleString()} FCFA</p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handlePaiement(moto)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-money-dollar-circle-line mr-2"></i>
                          Effectuer le paiement
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Enregistrement */}
        {canManage && showEnregistrement && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Enregistrer une nouvelle moto</h2>
                <button
                  onClick={() => setShowEnregistrement(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              
              <form onSubmit={handleSubmitEnregistrement} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations Moto */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <i className="ri-motorbike-line text-emerald-600"></i>
                      Informations de la moto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Matricule <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="matricule"
                          required
                          placeholder="DK-1234-AB"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                        <select name="marque" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer">
                          <option value="">Sélectionner</option>
                          <option value="Honda">Honda</option>
                          <option value="Yamaha">Yamaha</option>
                          <option value="Suzuki">Suzuki</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
                        <input
                          type="text"
                          name="modele"
                          required
                          placeholder="CG 125"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Année <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          name="annee"
                          required
                          placeholder="2024"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Couleur <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="couleur"
                          required
                          placeholder="Rouge"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                        <input
                          type="file"
                          name="photo"
                          accept="image/*"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations Propriétaire */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <i className="ri-user-line text-emerald-600"></i>
                      Informations du propriétaire
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="nomProprietaire"
                          required
                          placeholder="Mamadou Diallo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° CNI <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="cniProprietaire"
                          required
                          placeholder="1234567890123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          name="telephoneProprietaire"
                          required
                          placeholder="77 123 45 67"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                        <input
                          type="text"
                          name="adresseProprietaire"
                          placeholder="Quartier, Kafountine"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations Conducteur */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <i className="ri-steering-2-line text-emerald-600"></i>
                        Informations du conducteur
                      </h3>
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" name="isSameDriver" className="rounded cursor-pointer" />
                        Même que le propriétaire
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                        <input
                          type="text"
                          name="nomConducteur"
                          placeholder="Mamadou Diallo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° CNI</label>
                        <input
                          type="text"
                          name="cniConducteur"
                          placeholder="1234567890123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input
                          type="tel"
                          name="telephoneConducteur"
                          placeholder="77 123 45 67"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° Permis</label>
                        <input
                          type="text"
                          name="permisConducteur"
                          placeholder="A-2024-12345"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEnregistrement(false)}
                    disabled={isSubmittingEnregistrement}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEnregistrement}
                    className={`flex-1 px-4 py-2 text-white rounded-lg whitespace-nowrap cursor-pointer ${
                      isSubmittingEnregistrement ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 transition-colors'
                    }`}
                  >
                    <i className={`ri-${isSubmittingEnregistrement ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
                    {isSubmittingEnregistrement ? 'Enregistrement...' : 'Enregistrer la moto'}
                  </button>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mt-4">
                    <i className="ri-error-warning-line mr-2"></i>
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Modal Paiement */}
        {canManage && showPaiement && selectedMoto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-xl">
                <h2 className="text-xl font-bold">Enregistrer un paiement</h2>
                <p className="text-sm text-emerald-100 mt-1">{selectedMoto.matricule}</p>
              </div>
              
              <form onSubmit={handleSubmitPaiement} className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={selectedMoto.photo}
                      alt={selectedMoto.matricule}
                      className="w-20 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{selectedMoto.marque} {selectedMoto.modele}</p>
                      <p className="text-sm text-gray-600">{selectedMoto.proprietaire.nom}</p>
                    </div>
                  </div>
                  
                  {selectedMoto.enRetard && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        <i className="ri-error-warning-line mr-1"></i>
                        Paiement en retard de {selectedMoto.joursRetard} jours
                      </p>
                      <div className="text-sm text-red-700">
                        <p>Taxe mensuelle: {motoConfig.tarifMensuel.toLocaleString()} FCFA</p>
                        <p>Pénalité: {selectedMoto.montantPenalite.toLocaleString()} FCFA</p>
                        <p className="font-bold mt-1">Total à payer: {(motoConfig.tarifMensuel + selectedMoto.montantPenalite).toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  )}
                  
                  {!selectedMoto.enRetard && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-emerald-800">
                        <i className="ri-checkbox-circle-line mr-1"></i>
                        Paiement à jour
                      </p>
                      <p className="text-sm text-emerald-700 mt-1">Montant: {motoConfig.tarifMensuel.toLocaleString()} FCFA</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois de paiement</label>
                  <select 
                    name="mois"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                  >
                    <option>Janvier 2025</option>
                    <option>Février 2025</option>
                    <option>Mars 2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <select 
                    name="modePaiement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                  >
                    <option>Espèces</option>
                    <option>Mobile Money</option>
                    <option>Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                  <textarea
                    name="observations"
                    rows={3}
                    placeholder="Remarques éventuelles..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaiement(false);
                      setSelectedMoto(null);
                    }}
                    disabled={isSubmittingPaiement}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPaiement}
                    className={`flex-1 px-4 py-2 text-white rounded-lg whitespace-nowrap cursor-pointer ${
                      isSubmittingPaiement ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 transition-colors'
                    }`}
                  >
                    <i className={`ri-${isSubmittingPaiement ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
                    {isSubmittingPaiement ? 'Validation...' : 'Valider le paiement'}
                  </button>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mt-4">
                    <i className="ri-error-warning-line mr-2"></i>
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Modal Changement */}
        {canManage && showChangement && selectedMoto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Déclaration de changement</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedMoto.matricule}</p>
                </div>
                <button
                  onClick={() => setShowChangement(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              
              <form id="form-changement" onSubmit={handleSubmitChangement} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de changement</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                      <input type="radio" name="typeChangement" value="proprietaire" defaultChecked className="cursor-pointer" />
                      <div>
                        <p className="font-medium text-gray-900">Propriétaire</p>
                        <p className="text-xs text-gray-500">Transfert de propriété</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                      <input type="radio" name="typeChangement" value="conducteur" className="cursor-pointer" />
                      <div>
                        <p className="font-medium text-gray-900">Conducteur</p>
                        <p className="text-xs text-gray-500">Changement de conducteur</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Informations actuelles</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Propriétaire</p>
                      <p className="font-medium text-gray-900">{selectedMoto.proprietaire.nom}</p>
                      <p className="text-gray-500 text-xs">{selectedMoto.proprietaire.cni}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Conducteur</p>
                      <p className="font-medium text-gray-900">{selectedMoto.conducteur.nom}</p>
                      <p className="text-gray-500 text-xs">{selectedMoto.conducteur.cni}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Nouvelles informations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                      <input
                        type="text"
                        name="nouveauNom"
                        required
                        placeholder="Nouveau nom"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° CNI *</label>
                      <input
                        type="text"
                        name="nouveauCNI"
                        required
                        placeholder="1234567890123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                      <input
                        type="tel"
                        name="nouveauTelephone"
                        required
                        placeholder="77 123 45 67"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° Permis</label>
                      <input
                        type="text"
                        name="nouveauPermis"
                        placeholder="A-2024-12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                      <input
                        type="text"
                        name="nouvelleAdresse"
                        placeholder="Quartier, Kafountine"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motif du changement</label>
                  <textarea
                    rows={3}
                    placeholder="Précisez le motif..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>
              </form>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setShowChangement(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  form="form-changement"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Enregistrer le changement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Reçu PDF */}
        {showRecuPDF && transactionData && (
          <RecuPDF
            transaction={transactionData}
            onClose={() => {
              setShowRecuPDF(false);
              setTransactionData(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
