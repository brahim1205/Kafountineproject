import { useState, createContext, useContext, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'ri-check-line';
      case 'error': return 'ri-error-warning-line';
      case 'warning': return 'ri-alert-line';
      case 'info': return 'ri-information-line';
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container - Popup Style */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`${getColor(toast.type)} text-white px-6 py-4 rounded-b-lg shadow-xl flex items-center gap-3 w-full max-w-lg animate-slide-in-down`}
            style={{ marginTop: index * 10 }}
          >
            <i className={`${getIcon(toast.type)} text-xl`}></i>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
