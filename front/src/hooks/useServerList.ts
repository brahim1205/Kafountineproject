import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageMeta } from '../services/api';

export type ListQuery = { page: number; limit: number; search: string; statut: string };
export type ListPage<T> = { data: T[]; meta: PageMeta };

const EMPTY_META: PageMeta = { page: 1, limit: 50, total: 0, totalPages: 1 };
const ALL_VALUES = new Set(['all', 'tous', 'Tous', '']);
const SEARCH_DELAY_MS = 300;

/**
 * Liste paginée, recherchée et filtrée par le serveur : le navigateur ne reçoit que la page affichée,
 * quel que soit le volume de l'année. `deps` regroupe les autres critères (année, type…).
 */
export function useServerList<T>(
  fetchPage: (query: ListQuery) => Promise<ListPage<T>>,
  deps: unknown[],
  options: { pageSize?: number; initialStatut?: string } = {}
) {
  const pageSize = options.pageSize ?? 50;
  const fetcher = useRef(fetchPage);
  fetcher.current = fetchPage;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statut, setStatutValue] = useState(options.initialStatut ?? 'all');
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [depsKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetcher
      .current({ page, limit: pageSize, search: appliedSearch, statut: ALL_VALUES.has(statut) ? '' : statut })
      .then((result) => {
        if (!active) return;
        setItems(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setMeta(EMPTY_META);
        setError('Impossible de charger la liste.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, pageSize, appliedSearch, statut, depsKey, reloadKey]);

  const setStatut = useCallback((value: string) => {
    setStatutValue(value);
    setPage(1);
  }, []);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const counts = meta.counts ?? {};
  const yearTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    items, setItems, meta, page, setPage, search, setSearch, statut, setStatut, loading, error, reload, counts, yearTotal,
    totalPages: Math.max(1, meta.totalPages ?? Math.ceil(meta.total / pageSize)),
    appliedSearch,
    statutValue: ALL_VALUES.has(statut) ? '' : statut,
  };
}

/** Récupère toutes les pages d'une sélection, pour les exports. */
export async function fetchAllPages<T>(fetchPage: (page: number, limit: number) => Promise<ListPage<T>>): Promise<T[]> {
  const limit = 500;
  const all: T[] = [];
  for (let page = 1; ; page += 1) {
    const { data, meta } = await fetchPage(page, limit);
    all.push(...data);
    if (data.length === 0 || all.length >= meta.total) return all;
  }
}
