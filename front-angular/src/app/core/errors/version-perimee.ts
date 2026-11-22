const CLE_DERNIER_RECHARGEMENT = 'kafountine:rechargement-version';
const DELAI_ENTRE_RECHARGEMENTS_MS = 30_000;

/**
 * Messages des navigateurs quand un import dynamique échoue : après un déploiement, un onglet
 * resté ouvert réclame des fichiers JS de l'ancienne version, qui n'existent plus.
 */
const MOTIFS_MODULE_INTROUVABLE = [
  /Failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Failed to load module script/i,
  /ChunkLoadError/i,
];

export function estModuleIntrouvable(error: unknown): boolean {
  const texte = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return MOTIFS_MODULE_INTROUVABLE.some((motif) => motif.test(texte));
}

interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

function stockageSession(): Stockage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch (refus: unknown) {
    console.warn('Stockage de session indisponible', refus);
    return null;
  }
}

/**
 * Recharge la page pour récupérer la nouvelle version, au plus une fois toutes les 30 secondes :
 * si le fichier manque encore après rechargement, on laisse l'erreur s'afficher plutôt que boucler.
 * Renvoie vrai si un rechargement a été lancé.
 */
export function rechargerVersPageActuelle(
  destination: string,
  naviguer: (url: string) => void = (url) => location.assign(url),
  stockage: Stockage | null = stockageSession(),
  maintenant: number = Date.now(),
): boolean {
  if (!stockage) return false;
  try {
    const precedent = Number(stockage.getItem(CLE_DERNIER_RECHARGEMENT) ?? 0);
    if (maintenant - precedent < DELAI_ENTRE_RECHARGEMENTS_MS) return false;
    stockage.setItem(CLE_DERNIER_RECHARGEMENT, String(maintenant));
  } catch (refus: unknown) {
    console.warn('Rechargement automatique impossible', refus);
    return false;
  }
  naviguer(destination);
  return true;
}
