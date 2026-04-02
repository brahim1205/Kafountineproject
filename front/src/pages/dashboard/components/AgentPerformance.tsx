
import { useEffect, useState } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { getGlobalStats, type TopAgent } from '../../../services/statistiques';

type AgentPerformanceItem = {
  name: string;
  initials: string;
  amount: number;
  transactions: number;
};

export default function AgentPerformance() {
  const { selectedYear } = useYear();
  const [agents, setAgents] = useState<AgentPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await getGlobalStats(selectedYear);
        
        // Utiliser directement topAgents depuis l'API
        if (data?.topAgents && Array.isArray(data.topAgents)) {
          const formattedAgents = data.topAgents.map((agent: TopAgent): AgentPerformanceItem => ({
            name: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
            initials: agent.initiale || (agent.nom ? agent.nom[0] : '?'),
            amount: agent.collecte || 0,
            transactions: agent.transactions || 0
          }));
          setAgents(formattedAgents);
        } else {
          setAgents([]);
        }
      } catch {
        setAgents([]);
        setErrorMsg("Impossible de charger les performances des agents.");
      } finally {
        setLoading(false);
      }
    };
    
    loadAgents();
  }, [selectedYear]);

  const colors = ['bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance des agents</h3>
        <p className="text-sm text-gray-600 mt-1">Top 5 - Année {selectedYear}</p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{errorMsg || "Aucune donnée disponible pour cette année"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${colors[index]} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                {agent.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.transactions} transactions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{agent.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">FCFA</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="w-full mt-6 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap">
        Voir tous les agents
      </button>
    </div>
  );
}
