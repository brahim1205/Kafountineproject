import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { getMyProfile } from '../../services/profile';
import type { CurrentUser } from '../../services/auth';
import ChangePasswordForm from './components/ChangePasswordForm';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
  SERVICE_FINANCES: 'Service des finances',
  QUAI_PECHE: 'Quai de pêche',
  ETAT_CIVIL: 'État civil',
  REGISSEUR: 'Régisseur',
};

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    getMyProfile()
      .then((data) => {
        if (!mounted) return;
        setErrorMsg('');
        setMe(data);
      })
      .catch(() => {
        if (!mounted) return;
        setMe(null);
        setErrorMsg("Impossible de charger le profil.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const prenom = String(me?.prenom || '').trim().charAt(0).toUpperCase();
    const nom = String(me?.nom || '').trim().charAt(0).toUpperCase();
    return `${prenom}${nom}` || 'US';
  }, [me]);

  const userRoleLabel = ROLE_LABELS[String(me?.role || '').toUpperCase()] || 'Agent';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading && <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">Chargement du profil...</div>}
          {!loading && errorMsg && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-sm text-red-700">{errorMsg}</div>
          )}

          {!loading && !errorMsg && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                <div className="px-6 pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16">
                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-4xl font-bold text-teal-600">{initials}</span>
                    </div>
                    <div className="flex-1 text-center sm:text-left sm:mt-12">
                      <h1 className="text-3xl font-bold text-gray-900">{`${me?.prenom || ''} ${me?.nom || ''}`.trim()}</h1>
                      <p className="text-lg text-gray-600 mt-1">{userRoleLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:mt-12">
                      <span className={`w-3 h-3 rounded-full ${me?.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className={`text-sm font-medium ${me?.isActive !== false ? 'text-green-600' : 'text-gray-500'}`}>{me?.isActive !== false ? 'Actif' : 'Inactif'}</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <i className="ri-mail-line text-xl text-gray-400"></i>
                      <span className="text-gray-700">{me?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <i className="ri-calendar-line text-xl text-gray-400"></i>
                      <span className="text-gray-700">Inscrit le {me?.createdAt ? new Date(me.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <ChangePasswordForm />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
