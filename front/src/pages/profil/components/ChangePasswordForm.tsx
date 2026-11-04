import { useState } from 'react';
import { useToast } from '../../../components/feature/Toast';
import { changeMyPassword } from '../../../services/profile';
import { getErrorMessage } from '../../../utils/formValidation';

const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none';
const RULES = '12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.';

export default function ChangePasswordForm() {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get('currentPassword') || '');
    const next = String(data.get('newPassword') || '');
    const confirm = String(data.get('confirmPassword') || '');
    setError('');

    if (!current || !next) {
      setError('Renseignez votre mot de passe actuel et le nouveau.');
      return;
    }
    if (next !== confirm) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword(current, next);
      form.reset();
      showToast('Mot de passe modifié.', 'success');
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de modifier le mot de passe.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Changer mon mot de passe</h2>
      <p className="text-sm text-gray-600 mb-4">{RULES}</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {error && <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {[
          ['currentPassword', 'Mot de passe actuel', 'current-password'],
          ['newPassword', 'Nouveau mot de passe', 'new-password'],
          ['confirmPassword', 'Confirmer le nouveau', 'new-password'],
        ].map(([name, label, autoComplete]) => (
          <div key={name}>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input id={name} name={name} type="password" autoComplete={autoComplete} className={INPUT_CLASS} />
          </div>
        ))}
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  );
}
