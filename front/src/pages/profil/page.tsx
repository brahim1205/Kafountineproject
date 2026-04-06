import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { getProfileData } from '../../services/profile';
import type { CurrentUser } from '../../services/auth';
import { getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';

export default function ProfilPage() {
  const { selectedYear } = useYear();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const userRole = useMemo(() => {
    const stored = getStoredUserRole();
    if (stored) return stored;
    return me?.role === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
  }, [me]);

  useEffect(() => {
    let mounted = true;
    getProfileData(selectedYear)
      .then((data) => {
        if (!mounted) return;
        setErrorMsg('');
        setMe(data.me);
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
  }, [selectedYear]);

  const initials = useMemo(() => {
    const prenom = String(me?.prenom || '').trim().charAt(0).toUpperCase();
    const nom = String(me?.nom || '').trim().charAt(0).toUpperCase();
    return `${prenom}${nom}` || 'US';
  }, [me]);

  const userRoleLabel = me?.role === 'ADMIN' ? 'Administrateur' : me?.role === 'COMPTABLE' ? 'Comptable' : 'Agent';

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

              {/* Paramètres du Compte - Réservé SUPER_ADMIN */}
              {userRole === 'super_admin' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Paramètres du Compte</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link to="/profil" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <i className="ri-user-settings-line text-xl text-gray-600"></i>
                      <span className="font-medium text-gray-900">Informations du profil</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">Gérez vos informations personnelles</p>
                  </Link>
                  <Link to="/parametres" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <i className="ri-lock-password-line text-xl text-gray-600"></i>
                      <span className="font-medium text-gray-900">Mot de passe</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">Changez votre mot de passe</p>
                  </Link>
                  <Link to="/parametres" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <i className="ri-notification-3-line text-xl text-gray-600"></i>
                      <span className="font-medium text-gray-900">Notifications</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">Configurez vos préférences</p>
                  </Link>
                  <Link to="/parametres" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <i className="ri-palette-line text-xl text-gray-600"></i>
                      <span className="font-medium text-gray-900">Apparence</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">Thème et affichage</p>
                  </Link>
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
