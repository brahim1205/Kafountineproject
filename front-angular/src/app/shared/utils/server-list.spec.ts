import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from './server-list';

describe('fetchAllPages', () => {
  it('parcourt toutes les pages jusqu’au total annoncé', async () => {
    const fetchPage = vi.fn(async (page: number, limit: number) => ({
      data: page < 3 ? Array.from({ length: limit }, (_, i) => `${page}-${i}`) : ['fin'],
      meta: { page, limit, total: 2 * limit + 1, totalPages: 3 },
    }));

    const all = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(all).toHaveLength(1001);
    expect(all.at(-1)).toBe('fin');
  });

  it('s’arrête sur une page vide', async () => {
    const fetchPage = vi.fn(async () => ({ data: [] as string[] }));

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
