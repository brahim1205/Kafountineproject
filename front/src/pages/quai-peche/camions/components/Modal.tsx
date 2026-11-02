import type { ReactNode } from 'react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export default function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

export function FooterButtons({ onCancel, form, submitting }: { onCancel: () => void; form: string; submitting: boolean }) {
  return (
    <>
      <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
        Annuler
      </button>
      <button
        type="submit"
        form={form}
        disabled={submitting}
        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
