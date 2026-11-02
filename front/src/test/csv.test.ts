import { describe, expect, it } from 'vitest';
import { toCsv } from '../utils/csv';

describe('toCsv', () => {
  it('laisse les valeurs simples telles quelles', () => {
    expect(toCsv([['Matricule', 'Montant'], ['DK-1234', 1000]])).toBe('Matricule,Montant\r\nDK-1234,1000');
  });

  it('échappe les virgules, guillemets et sauts de ligne', () => {
    expect(toCsv([['Diallo, Fatou', 'Dit "Fafa"', 'ligne1\nligne2']])).toBe('"Diallo, Fatou","Dit ""Fafa""","ligne1\nligne2"');
  });

  it('rend les valeurs absentes comme des cellules vides', () => {
    expect(toCsv([[null, undefined, 0, false]])).toBe(',,0,false');
  });
});
