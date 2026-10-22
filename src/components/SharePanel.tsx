import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { getDb } from '../db/db'
import { createShare } from '../share/share'
import { Icon } from './Icon'
import { Modal } from './Modal'

interface Props {
  speciesId: string
  speciesName: string
  observationId?: string
  onClose: () => void
}

/** Affiche le QR code et le lien de partage d'une fiche espèce. */
export function SharePanel({ speciesId, speciesName, observationId, onClose }: Props) {
  const { localMode } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    createShare(getDb(), speciesId, observationId)
      .then(async (link) => {
        const image = await QRCode.toDataURL(link, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 600,
          color: { dark: '#3e2c23', light: '#fffdf9' },
        })
        if (!cancelled) {
          setUrl(link)
          setQr(image)
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [speciesId, observationId])

  async function shareLink() {
    if (!url) return
    try {
      await navigator.share({ title: `NatQuizz : ${speciesName}`, text: `Fiche « ${speciesName} » sur NatQuizz`, url })
    } catch {
      // Partage annulé par l'utilisateur.
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Lien copié !')
    } catch {
      setMessage('Copie impossible : sélectionne le lien à la main.')
    }
  }

  return (
    <Modal title="Partager la fiche" onClose={onClose}>
      <p className="muted">
        Fais scanner ce QR code avec NatQuizz (bouton <strong>Scanner une fiche</strong> sur l'accueil), ou envoie le lien.
      </p>
      {error && <div className="notice error">{error}</div>}
      {qr ? (
        <div className="qr-box">
          <img src={qr} alt={`QR code de la fiche ${speciesName}`} />
        </div>
      ) : (
        !error && <div className="notice">Préparation du QR code…</div>
      )}
      {localMode ? (
        <div className="notice">Mode local : les photos ne peuvent pas être partagées sans compte.</div>
      ) : (
        <p className="small muted">
          Les infos texte sont dans le QR code. Les photos seront disponibles dès ta prochaine synchronisation (il faut du réseau).
        </p>
      )}
      <div className="row">
        {'share' in navigator && (
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={shareLink} disabled={!url}>
            <Icon name="share" /> Envoyer le lien
          </button>
        )}
        <button type="button" className="btn" style={{ flex: 1 }} onClick={copyLink} disabled={!url}>
          Copier le lien
        </button>
      </div>
      {message && <div className="notice success">{message}</div>}
    </Modal>
  )
}
