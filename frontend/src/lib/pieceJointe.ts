// Pièces jointes (justificatifs) : lecture d'un fichier en data URL et ouverture dans un nouvel onglet.

export const PIECE_TYPES_ACCEPTES = 'image/png,image/jpeg,image/webp,application/pdf';
const PIECE_TAILLE_MAX = 2.9 * 1024 * 1024; // le backend accepte ~3 Mo une fois encodé en base64

export function lireFichierEnDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type)) {
      reject(new Error('Fichier non accepté : image (PNG, JPG, WebP) ou PDF uniquement'));
      return;
    }
    if (file.size > PIECE_TAILLE_MAX) {
      reject(new Error('Fichier trop volumineux (3 Mo maximum)'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

/** Ouvre une data URL dans un nouvel onglet (les navigateurs bloquent la navigation directe vers data:). */
export function ouvrirPiece(dataUrl: string) {
  const [entete, base64] = dataUrl.split(',');
  const type = /data:([^;]+);/.exec(entete)?.[1] || 'application/octet-stream';
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([octets], { type }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
