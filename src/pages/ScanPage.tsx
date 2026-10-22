import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { extractShareParam } from '../share/encode'
import { createQrDetector } from '../share/scanner'

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return "L'accès à la caméra a été refusé. Autorise-le dans les réglages du navigateur."
  if (name === 'NotFoundError') return 'Aucune caméra trouvée sur cet appareil.'
  return "Impossible d'utiliser la caméra. Tu peux coller le lien reçu ci-dessous."
}

export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function start() {
      try {
        const detector = createQrDetector()
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const video = videoRef.current
        if (stopped || !video) return
        video.srcObject = stream
        await video.play()
        setScanning(true)

        // On analyse l'image de la caméra 4 fois par seconde.
        const tick = async () => {
          if (stopped) return
          try {
            const codes = await detector.detect(video)
            for (const code of codes) {
              const param = extractShareParam(code.rawValue)
              if (param) {
                navigator.vibrate?.(100)
                navigate(`/import?d=${param}`)
                return
              }
            }
          } catch {
            // Image pas encore prête : on réessaie.
          }
          timer = setTimeout(tick, 250)
        }
        void tick()
      } catch (e) {
        if (!stopped) setError(cameraErrorMessage(e))
      }
    }

    void start()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [navigate])

  function handlePaste(event: FormEvent) {
    event.preventDefault()
    const param = extractShareParam(pasted)
    if (param) navigate(`/import?d=${param}`)
    else setPasteError("Ce lien n'est pas un lien de partage NatQuizz.")
  }

  return (
    <div className="stack">
      <h1>Scanner une fiche</h1>
      <p className="muted">Vise le QR code affiché par l'autre personne (bouton « Partager » d'une fiche).</p>

      {error ? (
        <div className="notice error">{error}</div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
          {scanning && <div className="scanner-frame" />}
        </div>
      )}

      <form className="card stack" onSubmit={handlePaste}>
        <label className="field">
          <span>Ou colle un lien reçu</span>
          <input value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="https://…/#/import?d=…" />
        </label>
        {pasteError && <div className="notice error">{pasteError}</div>}
        <button className="btn" disabled={!pasted.trim()}>
          Ouvrir le lien
        </button>
      </form>
    </div>
  )
}
