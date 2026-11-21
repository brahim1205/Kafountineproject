import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientErrorHandler, decrireErreur } from './client-error-handler';

describe('decrireErreur', () => {
  it('garde le type, le message et la pile', () => {
    const rapport = decrireErreur(new TypeError('x est undefined'));
    expect(rapport.message).toBe('TypeError: x est undefined');
    expect(rapport.stack).toContain('x est undefined');
  });

  it('tronque les messages trop longs', () => {
    expect(decrireErreur('a'.repeat(5000)).message).toHaveLength(1000);
  });
});

describe('ClientErrorHandler', () => {
  const envoi = vi.fn(() => Promise.resolve(new Response()));

  beforeEach(() => {
    vi.stubGlobal('fetch', envoi);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    envoi.mockClear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("transmet l'erreur au serveur une seule fois", () => {
    const handler = new ClientErrorHandler();
    handler.handleError(new Error('écran cassé'));
    handler.handleError(new Error('écran cassé'));
    expect(envoi).toHaveBeenCalledTimes(1);
    expect(envoi.mock.calls[0]).toEqual(['/api/v1/client-errors', expect.objectContaining({ method: 'POST', credentials: 'include' })]);
  });

  it("n'envoie pas les erreurs d'API, déjà journalisées par le serveur", () => {
    new ClientErrorHandler().handleError(new HttpErrorResponse({ status: 500 }));
    expect(envoi).not.toHaveBeenCalled();
  });

  it('limite le nombre de rapports par page', () => {
    const handler = new ClientErrorHandler();
    for (let i = 0; i < 30; i++) handler.handleError(new Error(`erreur ${i}`));
    expect(envoi).toHaveBeenCalledTimes(10);
  });
});
