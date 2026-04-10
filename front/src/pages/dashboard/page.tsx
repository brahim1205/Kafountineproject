import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/feature/DashboardLayout';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import ComptableDashboard from './components/ComptableDashboard';
import ServiceFinancesDashboard from './components/ServiceFinancesDashboard';
import QuaiPecheDashboard from './components/QuaiPecheDashboard';
import { clearSession, restoreSession } from '../../services/auth';

export default function Dashboard() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const session = await restoreSession();
        if (!mounted) {
          return;
        }

        if (!session) {
          setSessionInvalid(true);
          return;
        }

        setUserRole(session.userRole);
      } catch {
        clearSession();
        if (mounted) {
          setSessionInvalid(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (sessionInvalid) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Chargement du profil utilisateur...
        </div>
      </DashboardLayout>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'agent':
        return <AgentDashboard />;
      case 'comptable':
        return <ComptableDashboard />;
      case 'service_finances':
        return <ServiceFinancesDashboard />;
      case 'quai_peche':
        return <QuaiPecheDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
}
