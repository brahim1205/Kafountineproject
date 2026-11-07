import { useState } from 'react';
import { createBackup, downloadBackup, restoreBackup, type BackupFile } from '../../../services/settings';
import { PRIMARY_BUTTON } from './ui';

type SauvegardeTabProps = {
  backups: BackupFile[];
  onChanged: (message: string) => void;
  onError: (message: string) => void;
  /** Consultation seule (administrateur). */
  readOnly?: boolean;
};

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export default function SauvegardeTab({ backups, onChanged, onError, readOnly = false }: SauvegardeTabProps) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string>, fallback: string) => {
    setBusy(true);
    try {
      onChanged(await action());
    } catch (error) {
      onError(errorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      await createBackup();
      return 'Sauvegarde créée avec succès.';
    }, 'La sauvegarde a échoué.');

  const restore = (filename: string) => {
    if (!confirm(`Restaurer la sauvegarde ${filename} ? Cette opération remplacera la base courante.`)) return;
    run(async () => {
      await restoreBackup(filename);
      return `Restauration terminée depuis ${filename}.`;
    }, 'La restauration a échoué.');
  };

  const download = async (filename: string) => {
    try {
      await downloadBackup(filename);
    } catch (error) {
      onError(errorMessage(error, 'Le téléchargement a échoué.'));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Sauvegardes et restauration</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Sauvegarde automatique</h3>
          <p className="text-sm text-gray-600">
            Une sauvegarde complète de la base (<code>pg_dump</code>) est exportée chaque nuit à 02:00 par la pipeline
            d'exploitation. Les sauvegardes ci-dessous sont des instantanés applicatifs créés à la demande.
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
          <div className="space-y-3">
            {!readOnly && (
              <button onClick={create} disabled={busy} className={`${PRIMARY_BUTTON} w-full justify-center`}>
                <i className="ri-save-3-line"></i>
                {busy ? 'Traitement...' : 'Créer une sauvegarde maintenant'}
              </button>
            )}
            <button
              onClick={() => backups[0] && download(backups[0].filename)}
              disabled={!backups[0]}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-60"
            >
              <i className="ri-download-line"></i>
              Télécharger la dernière sauvegarde
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-4">Sauvegardes récentes</h3>
        <div className="space-y-2">
          {backups.map((backup) => (
            <div key={backup.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <i className="ri-database-line text-gray-600"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900">{new Date(backup.createdAt).toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-500">{(backup.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Disponible</span>
                <button onClick={() => download(backup.filename)} className="text-sm text-gray-600 hover:text-teal-700">
                  Télécharger
                </button>
                {!readOnly && (
                  <button onClick={() => restore(backup.filename)} disabled={busy} className="text-sm text-teal-600 hover:text-teal-700">
                    Restaurer
                  </button>
                )}
              </div>
            </div>
          ))}
          {backups.length === 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
              Aucune sauvegarde disponible pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
