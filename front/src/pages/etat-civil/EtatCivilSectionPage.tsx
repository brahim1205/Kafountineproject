import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/feature/DashboardLayout';
import HistoriqueDemandes from './components/HistoriqueDemandes';
import StatistiquesEtatCivil from './components/StatistiquesEtatCivil';
import TraiterDemande from './components/TraiterDemande';

type Section = 'nouvelle' | 'a-traiter' | 'historique' | 'statistiques';

const HEADERS: Record<Section, { title: string; subtitle: string }> = {
  nouvelle: { title: 'Nouvelle demande', subtitle: 'Enregistrer une demande de document' },
  'a-traiter': { title: 'Demandes à traiter', subtitle: 'Demandes en attente de délivrance ou de rejet' },
  historique: { title: 'Historique', subtitle: 'Toutes les demandes de l’année sélectionnée' },
  statistiques: { title: 'Statistiques', subtitle: 'Activité et recettes de l’état civil' },
};

export default function EtatCivilSectionPage({ section }: { section: Section }) {
  const navigate = useNavigate();
  const { title, subtitle } = HEADERS[section];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        {section === 'nouvelle' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <TraiterDemande onSuccess={() => navigate('/etat-civil/a-traiter')} />
          </div>
        )}
        {section === 'a-traiter' && <HistoriqueDemandes statut="EN_ATTENTE" />}
        {section === 'historique' && <HistoriqueDemandes />}
        {section === 'statistiques' && <StatistiquesEtatCivil />}
      </div>
    </DashboardLayout>
  );
}
