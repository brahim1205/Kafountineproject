import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPortalSession, getContribuable, savePortalSession } from '../services/portalAuth';

describe('portalAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    clearPortalSession();
  });

  it('stores portal identity in sessionStorage instead of localStorage', () => {
    savePortalSession('', {
      id: 'contrib-1',
      nin: 'NIN-001',
      nom: 'Sow',
      prenom: 'Awa',
      telephone: '+221771234567',
    });

    expect(sessionStorage.getItem('contribuable')).toContain('contrib-1');
    expect(localStorage.getItem('contribuable')).toBeNull();
    expect(getContribuable()?.id).toBe('contrib-1');
  });
});
