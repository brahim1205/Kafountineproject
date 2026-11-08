import { useEffect, useId, useRef, useState } from 'react';
import { listContribuables, type Contribuable } from '../../services/contribuables';

const SEARCH_INPUT_NAME = 'contribuableRecherche';
const MIN_QUERY_LENGTH = 2;

export const contribuableLabel = (c: Pick<Contribuable, 'prenom' | 'nom' | 'nin'>) =>
  `${`${c.prenom || ''} ${c.nom || ''}`.trim()} (${c.nin})`;

type ContribuableSelectProps = {
  /** Nom du champ caché qui porte l'identifiant choisi. */
  name: string;
  /** Contribuable déjà choisi (modification). */
  initial?: { id: string; label: string };
  inputClassName: string;
};

/**
 * Sélection d'un contribuable par recherche côté serveur (nom, téléphone, NIN).
 * Remplace une liste déroulante qui ne pouvait montrer que les 100 premiers contribuables.
 */
export default function ContribuableSelect({ name, initial, inputClassName }: ContribuableSelectProps) {
  const listId = useId();
  const [query, setQuery] = useState(initial?.label ?? '');
  const [selectedId, setSelectedId] = useState(initial?.id ?? '');
  const [results, setResults] = useState<Contribuable[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const search = query.trim();
    if (selectedId || search.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    const current = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await listContribuables({ search, limit: 8 });
        if (current === requestId.current) setResults(found);
      } catch {
        if (current === requestId.current) setResults([]);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, selectedId]);

  const choose = (c: Contribuable) => {
    setSelectedId(c.id);
    setQuery(contribuableLabel(c));
    setOpen(false);
  };

  const showList = open && !selectedId && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        name={SEARCH_INPUT_NAME}
        data-required="true"
        aria-label="Contribuable"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Rechercher par nom, téléphone ou NIN"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId('');
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={inputClassName}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500">Recherche...</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500">Aucun contribuable trouvé.</li>
          ) : (
            results.map((c) => (
              <li
                key={c.id}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                className="cursor-pointer px-4 py-2 text-sm text-gray-900 hover:bg-emerald-50"
              >
                {contribuableLabel(c)}
                {c.telephone && <span className="ml-2 text-xs text-gray-500">{c.telephone}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** À appeler après validateFormElement : signale un texte saisi sans contribuable choisi dans la liste. */
export function requireSelectedContribuable(form: HTMLFormElement, name: string): string | null {
  const id = String(new FormData(form).get(name) || '');
  if (id) return id;
  const input = form.elements.namedItem(SEARCH_INPUT_NAME);
  if (input instanceof HTMLInputElement) {
    input.setCustomValidity('Sélectionnez un contribuable dans la liste.');
    input.reportValidity();
    input.focus();
  }
  return null;
}
