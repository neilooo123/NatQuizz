import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { readPhotoMetadata, type PhotoMetadata } from '../photos/exif'
import { processPhoto, type ProcessedPhoto } from '../photos/processPhoto'
import { Icon } from './Icon'

export interface PickedPhoto {
  photo: ProcessedPhoto
  metadata: PhotoMetadata
  /** Vrai si la photo vient d'être prise avec l'appareil photo (et non choisie dans la galerie). */
  fromCamera: boolean
}

interface Props {
  /** Photo déjà choisie, affichée en aperçu. */
  preview?: Blob | null
  onPicked: (picked: PickedPhoto) => void
}

/** Boutons « Prendre une photo » et « Choisir dans la galerie », avec aperçu. */
export function PhotoPicker({ preview, onPicked }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(preview)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview])

  async function handleFile(event: ChangeEvent<HTMLInputElement>, fromCamera: boolean) {
    const file = event.target.files?.[0]
    event.target.value = '' // permet de reprendre la même photo
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const [photo, metadata] = await Promise.all([processPhoto(file), readPhotoMetadata(file)])
      onPicked({ photo, metadata, fromCamera })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      {previewUrl && <img src={previewUrl} alt="Aperçu de la photo" className="photo-large" />}
      {busy && <div className="notice">Préparation de la photo…</div>}
      {error && <div className="notice error">{error}</div>}

      <div className="row">
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => cameraInput.current?.click()} disabled={busy}>
          <Icon name="camera" /> {previewUrl ? 'Reprendre' : 'Prendre une photo'}
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => galleryInput.current?.click()} disabled={busy}>
          <Icon name="image" /> Galerie
        </button>
      </div>

      {/* capture="environment" ouvre directement l'appareil photo arrière sur téléphone */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e, true)} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => handleFile(e, false)} />
    </div>
  )
}
