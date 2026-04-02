import { useState, useEffect } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '../../services/notifications';
import { useYear } from '../../contexts/YearContext';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filtreType, setFiltreType] = useState<string>('toutes');
  const [clignotement, setClignotement] = useState(false);
  const { selectedYear } = useYear();

  useEffect(() => {
    if (!isOpen) return;
    listNotifications({ year: selectedYear })
      .then((data) => {
        setNotifications(data || []);
      })
      .catch(() => setNotifications([]));
  }, [isOpen, selectedYear]);

  useEffect(() => {
    const hasCritique = notifications.some(n => !n.lu && n.type === 'alerte');
    if (hasCritique) {
      const interval = setInterval(() => {
        setClignotement(prev => !prev);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [notifications]);

  const notificationsNonLues = notifications.filter(n => !n.lu).length;

  const notificationsFiltrees = notifications.filter(n => {
    if (filtreType === 'toutes') return true;
    return n.type === filtreType;
  });

  const marquerCommeLu = (id: string) => {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, lu: true } : n))
    );
  };

  const marquerToutCommeLu = () => {
    markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
  };

  const getTempsEcoule = (timestamp: string) => {
    const maintenant = new Date();
    const date = new Date(timestamp);
    const diffMs = maintenant.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHeures = Math.floor(diffMins / 60);
    if (diffHeures < 24) return `Il y a ${diffHeures}h`;
    const diffJours = Math.floor(diffHeures / 24);
    return `Il y a ${diffJours}j`;
  };

  const getCouleurClasse = (couleur: string, lu: boolean) => {
    const opacity = lu ? '10' : '20';
    const textOpacity = lu ? 'text-gray-500' : 'text-gray-900';
    
    switch (couleur) {
      case 'emerald':
        return { bg: `bg-emerald-${opacity}`, text: 'text-emerald-600', border: 'border-emerald-200', textMain: textOpacity };
      case 'red':
        return { bg: `bg-red-${opacity}`, text: 'text-red-600', border: 'border-red-200', textMain: textOpacity };
      case 'orange':
        return { bg: `bg-orange-${opacity}`, text: 'text-orange-600', border: 'border-orange-200', textMain: textOpacity };
      default:
        return { bg: `bg-gray-${opacity}`, text: 'text-gray-600', border: 'border-gray-200', textMain: textOpacity };
    }
  };

  const typeToColor = (type: string): string => {
    switch (type) {
      case 'paiement':
        return 'emerald';
      case 'retard':
        return 'red';
      case 'alerte':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const typeToIcon = (type: string): string => {
    switch (type) {
      case 'paiement':
        return 'ri-money-dollar-circle-line';
      case 'retard':
        return 'ri-alert-line';
      case 'alerte':
        return 'ri-alarm-warning-line';
      default:
        return 'ri-notification-3-line';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      
      <div className="absolute right-0 top-16 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col animate-slideDown">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className={`ri-notification-3-line text-xl text-teal-600 ${clignotement ? 'animate-pulse' : ''}`}></i>
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {notificationsNonLues > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                  {notificationsNonLues}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl text-gray-600"></i>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFiltreType('toutes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filtreType === 'toutes'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFiltreType('paiement')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filtreType === 'paiement'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Paiements
            </button>
            <button
              onClick={() => setFiltreType('retard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filtreType === 'retard'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Retards
            </button>
            <button
              onClick={() => setFiltreType('alerte')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filtreType === 'alerte'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Alertes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notificationsFiltrees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <i className="ri-notification-off-line text-5xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 text-sm text-center">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notificationsFiltrees.map((notif) => {
                const couleurs = getCouleurClasse(typeToColor(notif.type), notif.lu);
                return (
                  <div
                    key={notif.id}
                    onClick={() => marquerCommeLu(notif.id)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notif.lu ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${couleurs.bg} flex-shrink-0`}>
                        <i className={`${typeToIcon(notif.type)} text-lg ${couleurs.text}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold text-sm ${couleurs.textMain}`}>
                            {notif.titre}
                          </h4>
                          {!notif.lu && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${notif.lu ? 'text-gray-500' : 'text-gray-700'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {getTempsEcoule(notif.timestamp)}
                          </span>
                          {notif.type === 'alerte' && !notif.lu && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded whitespace-nowrap">
                              Critique
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {notificationsNonLues > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={marquerToutCommeLu}
              className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Marquer tout comme lu
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
