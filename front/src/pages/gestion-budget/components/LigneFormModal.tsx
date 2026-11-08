import { useState } from 'react';
import Modal, { Field, FooterButtons } from '../../../components/feature/Modal';
import type { LigneBudgetaire, LigneBudgetairePayload } from '../../../services/budget';

const INPUT_CLASS = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

type LigneFormModalProps = {
  /** Absente : création d'une ligne ; présente : modification, avec le montant dépensé. */
  ligne?: LigneBudgetaire;
  onClose: () => void;
  onSubmit: (payload: LigneBudgetairePayload) => Promise<void>;
};

export default function LigneFormModal({ ligne, onClose, onSubmit }: LigneFormModalProps) {
  const isEdit = Boolean(ligne);
  const [form, setForm] = useState({
    code: ligne?.code ?? '',
    libelle: ligne?.libelle ?? '',
    description: ligne?.description ?? '',
    prevu: ligne ? String(ligne.prevu) : '',
    depense: ligne ? String(ligne.depense) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.code.trim() || !form.libelle.trim() || !form.prevu.trim()) {
      setError('Le code, le libellé et le montant budgétisé sont requis.');
      return;
    }
    if (Number(form.prevu) < 0 || Number(form.depense || '0') < 0) {
      setError(isEdit ? 'Les montants doivent être positifs.' : 'Le montant budgétisé doit être positif.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        code: form.code.trim(),
        libelle: form.libelle.trim(),
        description: form.description.trim() || null,
        prevu: Number(form.prevu),
        ...(isEdit ? { depense: Number(form.depense || '0') } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? 'Mise à jour impossible.' : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Modifier la Ligne Budgétaire' : 'Nouvelle Ligne Budgétaire'}
      onClose={onClose}
      footer={<FooterButtons onCancel={onClose} form="form-ligne-budget" submitting={saving} label={isEdit ? 'Enregistrer' : 'Créer la ligne'} />}
    >
      <form id="form-ligne-budget" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Code budgétaire">
          <input type="text" placeholder="Ex: 609" value={form.code} onChange={set('code')} className={INPUT_CLASS} />
        </Field>
        <Field label="Nom de la catégorie">
          <input type="text" placeholder="Ex: Formation professionnelle" value={form.libelle} onChange={set('libelle')} className={INPUT_CLASS} />
        </Field>
        <Field label="Montant budgétisé (FCFA)">
          <input type="number" min="0" placeholder="Ex: 1000000" value={form.prevu} onChange={set('prevu')} className={INPUT_CLASS} />
        </Field>
        {isEdit && (
          <Field label="Dépensé (FCFA)">
            <input type="number" min="0" value={form.depense} onChange={set('depense')} className={INPUT_CLASS} />
          </Field>
        )}
        <Field label="Description">
          <textarea
            rows={3}
            placeholder="Description de la catégorie budgétaire..."
            value={form.description}
            onChange={set('description')}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>
      </form>
    </Modal>
  );
}
