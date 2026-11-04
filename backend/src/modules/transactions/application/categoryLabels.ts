import type { TaxCatalog } from '../domain/TaxCatalog';

export type CategoryLabeler = (categorie: string) => string;

/** Clé de comparaison : sans accents, sans casse, séparateurs unifiés (« ETAT_CIVIL », « État civil », « etat-civil » → « etat-civil »). */
export function categoryKey(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Libellés des recettes dans les statistiques. Une même catégorie arrive sous plusieurs formes :
 * identifiant de l'assistant Taxes (« etat-civil »), code historique (« ETAT_CIVIL »), libellé du
 * catalogue (« Etat civil ») ou nom du module (« État civil »). Toutes sont ramenées au même libellé.
 */
const CANONICAL: Array<[string, string[]]> = [
  ['État civil', ['etat-civil']],
  ['Urbanisme', ['urbanisme', 'urbanisme-habitat']],
  ['Marché', ['marche']],
  ['Motos', ['motos', 'moto']],
  ['Stationnement et transport', ['stationnement-transport', 'transport']],
  ['Occupation et réglementation', ['occupation-reglementation']],
  ['Ressources naturelles', ['ressources-naturelles']],
  ['Pénalités', ['penalites', 'penalite']],
  ['Taxes', ['taxe', 'taxes']],
  ['Autres', ['autre', 'autres']],
];

const CANONICAL_BY_KEY = new Map(CANONICAL.flatMap(([label, keys]) => keys.map((key) => [key, label] as const)));

function prettify(raw: string) {
  // Code technique en capitales (« DROITS_PLACE ») : on l'affiche comme un libellé.
  if (/^[A-Z0-9_]+$/.test(raw) && /[A-Z]/.test(raw)) {
    const words = raw.toLowerCase().split('_').filter(Boolean).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return raw;
}

export async function buildCategoryLabeler(catalog?: TaxCatalog): Promise<CategoryLabeler> {
  const labels = new Map(CANONICAL_BY_KEY);
  if (catalog) {
    try {
      for (const category of await catalog.listCategories()) {
        const label = labels.get(categoryKey(category.id)) || labels.get(categoryKey(category.nom)) || category.nom;
        if (!labels.has(categoryKey(category.id))) labels.set(categoryKey(category.id), label);
        if (!labels.has(categoryKey(category.nom))) labels.set(categoryKey(category.nom), label);
      }
    } catch {
      // Catalogue indisponible : la nomenclature fixe suffit.
    }
  }
  return (categorie: string) => {
    const raw = String(categorie || '').trim();
    if (!raw) return 'Autres';
    return labels.get(categoryKey(raw)) || prettify(raw);
  };
}
