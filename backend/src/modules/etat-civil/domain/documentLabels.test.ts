import { documentLabel } from './documentLabels';

describe('documentLabel', () => {
  it.each([
    ['etat-civil-deces-extrait-de-deces', 'Extrait de décès'],
    ['etat-civil-mariage-celebration-mariage-couple-etranger', 'Célébration de mariage (couple étranger)'],
    ['Deces - Extrait de deces', 'Extrait de décès'],
    ['Naissance - Extrait de naissance', 'Extrait de naissance'],
    ['Extrait de naissance', 'Extrait de naissance'],
    ['Certificat de résidence', 'Certificat de résidence'],
    ['certificat de residence', 'Certificat de résidence'],
    ['Acte de mariage', 'Acte de mariage'],
  ])('« %s » → « %s »', (raw, label) => {
    expect(documentLabel(raw)).toBe(label);
  });

  it('rend lisible un identifiant inconnu au lieu de l’afficher brut', () => {
    expect(documentLabel('etat-civil-divers-attestation-nouvelle')).toBe('Attestation nouvelle');
    expect(documentLabel('Mariage - Livret de famille')).toBe('Livret de famille');
  });
});
