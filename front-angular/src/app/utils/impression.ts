/**
 * Imprime un seul document (reçu, rapport, attestation) sans le reste de l'application.
 *
 * Le document est copié à la racine de la page le temps de l'impression : les fenêtres
 * qui l'entourent (fond, défilement, hauteur limitée) ne peuvent donc plus le masquer
 * ni le couper. La copie est retirée après l'impression (événement `afterprint`).
 */
export function imprimerDocument(element: HTMLElement | null | undefined, format: 'portrait' | 'paysage' = 'portrait'): void {
  if (!element) {
    window.print();
    return;
  }
  document.querySelectorAll('.zone-impression').forEach((ancienne) => ancienne.remove());
  const zone = document.createElement('div');
  zone.className = `zone-impression zone-impression-${format}`;
  zone.appendChild(element.cloneNode(true));
  document.body.appendChild(zone);
  document.body.classList.add('impression-en-cours');
  const nettoyer = () => {
    zone.remove();
    document.body.classList.remove('impression-en-cours');
    window.removeEventListener('afterprint', nettoyer);
  };
  window.addEventListener('afterprint', nettoyer);
  window.print();
}
