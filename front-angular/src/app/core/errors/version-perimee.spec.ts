import { describe, expect, it, vi } from 'vitest';
import { estModuleIntrouvable, rechargerVersPageActuelle } from './version-perimee';

function stockageMemoire() {
  const valeurs = new Map<string, string>();
  return {
    getItem: (cle: string) => valeurs.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => void valeurs.set(cle, valeur),
  };
}

describe('estModuleIntrouvable', () => {
  it('reconnaît les messages des navigateurs', () => {
    expect(estModuleIntrouvable(new TypeError('Failed to fetch dynamically imported module: https://x/chunk-AB12CD34.js'))).toBe(true);
    expect(estModuleIntrouvable(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(estModuleIntrouvable(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('ignore les autres erreurs', () => {
    expect(estModuleIntrouvable(new TypeError('x est undefined'))).toBe(false);
  });
});

describe('rechargerVersPageActuelle', () => {
  it('recharge une fois puis laisse passer pendant 30 secondes', () => {
    const naviguer = vi.fn();
    const stockage = stockageMemoire();
    expect(rechargerVersPageActuelle('/tickets', naviguer, stockage, 1_000_000)).toBe(true);
    expect(naviguer).toHaveBeenCalledWith('/tickets');
    expect(rechargerVersPageActuelle('/tickets', naviguer, stockage, 1_010_000)).toBe(false);
    expect(rechargerVersPageActuelle('/tickets', naviguer, stockage, 1_040_000)).toBe(true);
    expect(naviguer).toHaveBeenCalledTimes(2);
  });

  it('ne recharge pas sans stockage de session, pour ne jamais boucler', () => {
    const naviguer = vi.fn();
    expect(rechargerVersPageActuelle('/tickets', naviguer, null)).toBe(false);
    expect(naviguer).not.toHaveBeenCalled();
  });
});
