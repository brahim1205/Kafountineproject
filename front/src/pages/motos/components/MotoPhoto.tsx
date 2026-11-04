import { useState } from 'react';

type MotoPhotoProps = {
  src?: string | null;
  alt: string;
  /** Classes de taille, communes à la photo et à son remplaçant. */
  sizeClass: string;
};

/** Photo de la moto, ou une icône si elle est absente ou ne se charge pas (lien mort, image supprimée). */
export default function MotoPhoto({ src, alt, sizeClass }: MotoPhotoProps) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`${sizeClass} shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700`}>
        <i className="ri-motorbike-line text-3xl"></i>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`${sizeClass} shrink-0 object-cover rounded-lg`} />;
}
