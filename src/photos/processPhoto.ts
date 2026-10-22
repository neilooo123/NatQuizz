export interface ProcessedPhoto {
  /** Photo réduite (1600 px max) : environ 300 Ko au lieu de plusieurs Mo. */
  full: Blob
  /** Miniature (400 px max) pour les listes. */
  thumb: Blob
}

const FULL_SIZE = 1600
const THUMB_SIZE = 400

/** Réduit une photo et crée sa miniature, au format JPEG. */
export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const bitmap = await loadBitmap(file)
  try {
    return {
      full: await resize(bitmap, FULL_SIZE, 0.82),
      thumb: await resize(bitmap, THUMB_SIZE, 0.75),
    }
  } finally {
    bitmap.close()
  }
}

/** Crée seulement la miniature (pour une photo téléchargée depuis le cloud). */
export async function makeThumbnail(file: Blob): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  try {
    return await resize(bitmap, THUMB_SIZE, 0.75)
  } finally {
    bitmap.close()
  }
}

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    // « from-image » : respecte l'orientation enregistrée par l'appareil photo.
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Ce format d'image n'est pas pris en charge par ce navigateur.")
  }
}

function resize(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Impossible de traiter la photo.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Impossible de traiter la photo.'))),
      'image/jpeg',
      quality,
    )
  })
}
