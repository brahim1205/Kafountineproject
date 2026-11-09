import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subscription, from } from 'rxjs';
import { Page, PageMeta } from '../../core/api/api.models';

export interface ListQuery {
  page: number;
  limit: number;
  search: string;
  statut: string;
}

const EMPTY_META: PageMeta = { page: 1, limit: 50, total: 0, totalPages: 1 };
const ALL_VALUES = new Set(['all', 'tous', 'Tous', '']);
const SEARCH_DELAY_MS = 300;

/**
 * Liste paginée, recherchée et filtrée par le serveur : seule la page affichée est chargée.
 * `key` regroupe les autres critères (année, type…) et relance le chargement quand il change.
 * À appeler dans un contexte d'injection (champ ou constructeur de composant).
 */
export function serverList<T>(
  fetchPage: (query: ListQuery) => Observable<Page<T>> | Promise<Page<T> | { data: T[]; meta?: PageMeta }>,
  key: Signal<unknown>,
  options: { pageSize?: number; initialStatut?: string } = {},
) {
  const pageSize = options.pageSize ?? 50;
  const page = signal(1);
  const search = signal('');
  const appliedSearch = signal('');
  const statut = signal(options.initialStatut ?? 'all');
  const items = signal<T[]>([]);
  const meta = signal<PageMeta>(EMPTY_META);
  const loading = signal(true);
  const error = signal('');
  const reloadKey = signal(0);
  const statutValue = computed(() => (ALL_VALUES.has(statut()) ? '' : statut()));

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let subscription: Subscription | undefined;

  effect((onCleanup) => {
    const value = search();
    searchTimer = setTimeout(() => {
      appliedSearch.set(value.trim());
      page.set(1);
    }, SEARCH_DELAY_MS);
    onCleanup(() => clearTimeout(searchTimer));
  });

  let previousKey: string | undefined;
  effect(() => {
    const current = JSON.stringify(key());
    if (previousKey !== undefined && current !== previousKey) {
      page.set(1);
    }
    previousKey = current;
  });

  effect(() => {
    const query: ListQuery = { page: page(), limit: pageSize, search: appliedSearch(), statut: statutValue() };
    key();
    reloadKey();
    subscription?.unsubscribe();
    subscription = untracked(() => {
      loading.set(true);
      return from(fetchPage(query));
    }).subscribe({
      next: (result) => {
        items.set(result.data);
        meta.set(result.meta ?? EMPTY_META);
        error.set('');
        loading.set(false);
      },
      error: () => {
        items.set([]);
        meta.set(EMPTY_META);
        error.set('Impossible de charger la liste.');
        loading.set(false);
      },
    });
  });

  inject(DestroyRef).onDestroy(() => subscription?.unsubscribe());

  const counts = computed(() => meta().counts ?? {});
  return {
    items,
    meta,
    page,
    search,
    appliedSearch,
    statut,
    statutValue,
    loading,
    error,
    counts,
    yearTotal: computed(() => Object.values(counts()).reduce((sum, value) => sum + value, 0)),
    totalPages: computed(() => Math.max(1, meta().totalPages ?? Math.ceil(meta().total / pageSize))),
    setSearch(value: string) {
      search.set(value);
    },
    setPage(value: number) {
      page.set(value);
    },
    setItems(value: T[]) {
      items.set(value);
    },
    setStatut(value: string) {
      statut.set(value);
      page.set(1);
    },
    reload() {
      reloadKey.update((value) => value + 1);
    },
  };
}

/** Récupère toutes les pages d'une sélection, pour les exports. */
export async function fetchAllPages<T>(fetchPage: (page: number, limit: number) => Promise<{ data: T[]; meta?: PageMeta }>): Promise<T[]> {
  const limit = 500;
  const all: T[] = [];
  for (let page = 1; ; page += 1) {
    const { data, meta } = await fetchPage(page, limit);
    all.push(...data);
    if (data.length === 0 || all.length >= (meta?.total ?? all.length)) return all;
  }
}
