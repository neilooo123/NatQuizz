import exifr from 'exifr'

export interface PhotoMetadata {
  takenAt: Date | null
  latitude: number | null
  longitude: number | null
}

/**
 * Lit la date de prise de vue et la position GPS enregistrées dans la photo
 * (données EXIF). Beaucoup de photos n'en ont pas : on renvoie alors null.
 */
export async function readPhotoMetadata(file: Blob): Promise<PhotoMetadata> {
  const result: PhotoMetadata = { takenAt: null, latitude: null, longitude: null }

  try {
    const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    const date = tags?.DateTimeOriginal ?? tags?.CreateDate
    if (date instanceof Date && !Number.isNaN(date.getTime())) result.takenAt = date
  } catch {
    // Pas de données EXIF lisibles.
  }

  try {
    const gps = await exifr.gps(file)
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      result.latitude = gps.latitude
      result.longitude = gps.longitude
    }
  } catch {
    // Pas de position dans la photo.
  }

  return result
}
