import type { ReactNode } from 'react';

export const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
export const PRIMARY_BUTTON = 'inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60';

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className={`bg-white rounded-xl p-6 w-full ${wide ? 'max-w-lg' : 'max-w-md'} mx-4 my-8`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, submitLabel, submitting }: { onCancel: () => void; submitLabel: string; submitting?: boolean }) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        Annuler
      </button>
      <button type="submit" disabled={submitting} className={PRIMARY_BUTTON}>
        <i className="ri-save-3-line"></i>
        {submitting ? 'Enregistrement...' : submitLabel}
      </button>
    </div>
  );
}
