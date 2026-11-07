/**
 * Libellés des documents d'état civil tels qu'on les lit sur un registre (« Extrait de décès »).
 * Une demande peut avoir été enregistrée avec l'identifiant du catalogue des taxes
 * (« etat-civil-deces-extrait-de-deces ») ou son nom brut (« Deces - Extrait de deces ») :
 * toutes ces formes sont ramenées au même libellé, à l'affichage comme à l'enregistrement.
 */
const LABELS: Array<[string, string]> = [
  ['Naissance - Bulletin de naissance', 'Bulletin de naissance'],
  ['Naissance - Extrait de naissance', 'Extrait de naissance'],
  ['Naissance - Copie litterale de naissance', 'Copie littérale de naissance'],
  ['Deces - Extrait de deces', 'Extrait de décès'],
  ['Deces - Copie litterale de deces', 'Copie littérale de décès'],
  ["Deces - Permis d'inhumation", "Permis d'inhumation"],
  ['Mariage - Extrait de mariage', 'Extrait de mariage'],
  ['Mariage - Celebration de mariage (general)', 'Célébration de mariage'],
  ['Mariage - Celebration mariage couple senegalais', 'Célébration de mariage (couple sénégalais)'],
  ['Mariage - Celebration mariage couple etranger', 'Célébration de mariage (couple étranger)'],
  ['Mariage - Copie litterale de mariage', 'Copie littérale de mariage'],
  ['Mariage - Certificat de non divorce', 'Certificat de non-divorce'],
  ['Mariage - Certificat de divorce', 'Certificat de divorce'],
  ['Divers - Certificat de vie comparant', 'Certificat de vie (comparant)'],
  ['Divers - Certificat de vie collectif', 'Certificat de vie collectif'],
  ["Divers - Certificat de vie et d'entretien", "Certificat de vie et d'entretien"],
  ["Divers - Certificat d'individualite", "Certificat d'individualité"],
  ['Divers - Certificat de celibat', 'Certificat de célibat'],
  ['Divers - Certificat de residence', 'Certificat de résidence'],
  ['Divers - Legalisation', 'Légalisation'],
  ['Divers - Certificat de non inscription', 'Certificat de non-inscription'],
  // Anciennes saisies libres.
  ['Legalisation de signature', 'Légalisation de signature'],
  ['Certificat de vie', 'Certificat de vie'],
  ['Acte de mariage', 'Acte de mariage'],
];

/** Même règle que l'identifiant du catalogue (municipalTariffs.slugify) : minuscules, sans accents, tirets. */
function slug(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const BY_KEY = new Map<string, string>();
for (const [catalogName, label] of LABELS) {
  for (const key of [slug(catalogName), `etat-civil-${slug(catalogName)}`, slug(label)]) {
    BY_KEY.set(key, label);
  }
}

/** Libellé lisible d'un type de document, quelle que soit la forme enregistrée. */
export function documentLabel(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return value;
  const label = BY_KEY.get(slug(value));
  if (label) return label;
  // Identifiant ou nom de catalogue inconnu : « etat-civil-deces-xxx » → « Xxx », « Deces - Xxx » → « Xxx ».
  const withoutPrefix = value
    .replace(/^etat-civil-(naissance|deces|mariage|divers)-/i, '')
    .replace(/^(naissance|deces|décès|mariage|divers)\s*-\s*/i, '');
  const text = /^[a-z0-9-]+$/.test(withoutPrefix) ? withoutPrefix.replace(/-/g, ' ') : withoutPrefix;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
