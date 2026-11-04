import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RecuPDF from '../../../components/feature/RecuPDF';
import { useYear } from '../../../contexts/YearContext';
import { getMotosStats } from '../../../services/motos';
import { getEtatCivilStats } from '../../../services/etatCivil';
import { getUrbanismeStats } from '../../../services/urbanisme';
import { getMarcheStats } from '../../../services/marche';
import { getStoredUserId, getStoredUserName } from '../../../services/auth';
import { getTransactions, type TransactionItem } from '../../../services/taxes';

type AgentCollecte = {
  id: string;
  type: string;
  contribuable: string;
  montant: number;
  heure: string;
  date: string;
};

type ReceiptData = {
  ticketNumber: string;
  date: string;
  time: string;
  contributor: string;
  type: string;
  amount: number;
  agent: string;
};

/** Tickets affichés pour la journée ; le total et le nombre viennent du serveur, au-delà de cette liste. */
const DAY_LIST_LIMIT = 300;

const toCollecte = (t: TransactionItem): AgentCollecte => {
  const parsed = t.date ? new Date(t.date) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  return {
    id: t.numero || t.id,
    type: t.type || t.service || 'Transaction',
    contribuable: t.contribuable?.prenom ? `${t.contribuable.prenom} ${t.contribuable.nom}` : t.contribuableNom || '-',
    montant: t.montant || 0,
    heure: valid ? valid.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    date: valid ? valid.toISOString().slice(0, 10) : '',
  };
};

export default function AgentDashboard() {
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [selectedRecu, setSelectedRecu] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesCollectes, setMesCollectes] = useState<AgentCollecte[]>([]);
  const [totalJour, setTotalJour] = useState(0);
  const [nombreJour, setNombreJour] = useState(0);
  const [resumeLabel, setResumeLabel] = useState("Voici le résumé de votre journée de collecte");
  const [tachesCounts, setTachesCounts] = useState({
    motos: 0,
    etatCivil: 0,
    urbanisme: 0,
    marche: 0,
  });
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const agentName = getStoredUserName() || 'Kouassi Jean';
  const agentId = getStoredUserId();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const todayKey = new Date().toISOString().slice(0, 10);
        // Les tickets de l'agent, filtrés et totalisés par le serveur (et non parmi les derniers tickets de toute la commune).
        const dayOf = (day: string) =>
          getTransactions({ agentId: agentId || undefined, year: selectedYear, startDate: day, endDate: day, limit: DAY_LIST_LIMIT });

        try {
          const [todayResult, motosStats, etatCivilStats, urbanismeStats, marcheStats] = await Promise.all([
            agentId ? dayOf(todayKey) : Promise.resolve(null),
            getMotosStats(selectedYear).catch(() => null),
            getEtatCivilStats(selectedYear).catch(() => null),
            getUrbanismeStats(selectedYear).catch(() => null),
            getMarcheStats(selectedYear).catch(() => null),
          ]);

          let dayResult = todayResult;
          let dayKey = todayKey;
          if (agentId && todayResult && todayResult.total === 0) {
            // Pas de collecte aujourd'hui : dernière journée d'activité de l'agent dans l'année.
            const latest = await getTransactions({ agentId, year: selectedYear, limit: 1 });
            const latestDate = latest.data[0]?.date ? new Date(latest.data[0].date) : null;
            if (latestDate && !Number.isNaN(latestDate.getTime())) {
              dayKey = latestDate.toISOString().slice(0, 10);
              dayResult = await dayOf(dayKey);
            }
          }

          if (dayResult && dayResult.total > 0) {
            setMesCollectes(dayResult.data.map(toCollecte));
            setTotalJour(dayResult.montantPaye);
            setNombreJour(dayResult.total);
            if (dayKey === todayKey) {
              setResumeLabel("Voici le résumé de votre journée de collecte");
            } else {
              setResumeLabel(`Aucune collecte aujourd'hui. Dernière journée avec activité: ${new Date(dayKey).toLocaleDateString('fr-FR')}`);
            }
          } else {
            setMesCollectes([]);
            setTotalJour(0);
            setNombreJour(0);
            setResumeLabel("Aucune collecte enregistrée pour l'année sélectionnée");
          }

          setTachesCounts({
            motos: Number(motosStats?.enRetard || 0),
            etatCivil: Number(etatCivilStats?.enAttente || etatCivilStats?.data?.enAttente || 0),
            urbanisme: Number(urbanismeStats?.enAttente || urbanismeStats?.data?.enAttente || 0),
            marche: Number(marcheStats?.recettesEnRetard ? 1 : 0),
          });
        } catch {
          setMesCollectes([]);
          setTotalJour(0);
          setResumeLabel("Impossible de charger les collectes");
          setTachesCounts({ motos: 0, etatCivil: 0, urbanisme: 0, marche: 0 });
        }
      } catch {
        setMesCollectes([]);
        setTotalJour(0);
        setResumeLabel("Impossible de charger les collectes");
        setTachesCounts({ motos: 0, etatCivil: 0, urbanisme: 0, marche: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear, agentId]);

  const tachesEnCours = [
    { icon: 'ri-motorbike-line', label: 'Motos en retard de paiement', count: tachesCounts.motos, color: 'text-red-600 bg-red-50', link: '/motos' },
    { icon: 'ri-file-text-line', label: 'Demandes état civil à traiter', count: tachesCounts.etatCivil, color: 'text-amber-600 bg-amber-50', link: '/etat-civil' },
    { icon: 'ri-building-line', label: 'Dossiers urbanisme en attente', count: tachesCounts.urbanisme, color: 'text-sky-600 bg-sky-50', link: '/urbanisme' },
    { icon: 'ri-store-2-line', label: 'Paiements marché à encaisser', count: tachesCounts.marche, color: 'text-teal-600 bg-teal-50', link: '/marche' },
  ];

  const objectifJour = 80000;
  const progression = Math.min((totalJour / objectifJour) * 100, 100);

  const handlePrintRecu = (collecte: AgentCollecte) => {
    setSelectedRecu({
      ticketNumber: collecte.id,
      date: collecte.date,
      time: collecte.heure,
      contributor: collecte.contribuable,
      type: collecte.type,
      amount: collecte.montant,
      agent: agentName
    });
    setShowRecuModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {agentName.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-600 mt-1">{resumeLabel}</p>
        </div>
          {/* Badge année passée - lecture seule */}
          {!isCurrentYear && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <i className="ri-eye-line"></i>
              <span className="text-sm font-medium">Année {selectedYear} - Consultation seule</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* Boutons d'action rapide */}
          </div>
        </div>

        {/* Stats personnelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mes collectes du jour</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalJour.toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">FCFA</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tickets émis</p>
                <h3 className="text-2xl font-bold text-gray-900">{nombreJour.toLocaleString('fr-FR')}</h3>
                <p className="text-xs text-gray-500 mt-1">aujourd'hui</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <i className="ri-file-list-3-line text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contribuables servis</p>
                <h3 className="text-2xl font-bold text-gray-900">{new Set(mesCollectes.map((c) => c.contribuable)).size.toLocaleString('fr-FR')}</h3>
                <p className="text-xs text-gray-500 mt-1">personnes</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <i className="ri-user-line text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tâches en attente</p>
                <h3 className="text-2xl font-bold text-gray-900">{tachesEnCours.reduce((s, t) => s + t.count, 0)}</h3>
                <p className="text-xs text-gray-500 mt-1">à traiter</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <i className="ri-task-line text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Objectif + Tâches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Objectif du jour */}
          <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectif du jour</h3>
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36 mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={progression >= 100 ? '#10b981' : '#14b8a6'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${progression * 3.267} 326.7`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{Math.round(progression)}%</span>
                  <span className="text-xs text-gray-500">atteint</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                <strong className="text-gray-900">{totalJour.toLocaleString()} FCFA</strong> sur {objectifJour.toLocaleString()} FCFA
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Reste : {Math.max(0, objectifJour - totalJour).toLocaleString()} FCFA
              </p>
            </div>
          </div>

          {/* Tâches en cours */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tâches en attente</h3>
            <p className="text-sm text-gray-600 mb-4">Éléments nécessitant votre attention</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tachesEnCours.map((tache, idx) => (
                <Link
                  key={idx}
                  to={tache.link}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className={`w-11 h-11 rounded-lg ${tache.color} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${tache.icon} text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tache.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tache.count} élément{tache.count > 1 ? 's' : ''}</p>
                  </div>
                  <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-teal-600 text-lg"></i>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mes dernières collectes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mes collectes du jour</h3>
                <p className="text-sm text-gray-600 mt-1">Tickets émis par vous aujourd'hui</p>
              </div>
              <Link
                to="/recettes"
                className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Voir tout
              </Link>
            </div>
          </div>

          {mesCollectes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Aucune collecte aujourd'hui
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">N° Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Contribuable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Heure</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mesCollectes.map((collecte) => (
                    <tr key={collecte.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{collecte.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                          {collecte.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{collecte.contribuable}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{collecte.montant.toLocaleString()} FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{collecte.heure}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => handlePrintRecu(collecte)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Générer reçu PDF"
                        >
                          <i className="ri-printer-line text-lg"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Reçu PDF */}
      {showRecuModal && selectedRecu && (
        <RecuPDF
          ticketNumber={selectedRecu.ticketNumber}
          date={selectedRecu.date}
          time={selectedRecu.time}
          contributor={selectedRecu.contributor}
          type={selectedRecu.type}
          amount={selectedRecu.amount}
          agent={selectedRecu.agent}
          onClose={() => {
            setShowRecuModal(false);
            setSelectedRecu(null);
          }}
        />
      )}
    </>
  );
}
