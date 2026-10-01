import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, SwitchCamera, X } from 'lucide-react'

type Props = {
  onCapture: (blob: Blob) => void
  onClose: () => void
  /** Opens the operating system's camera via <input capture> instead. */
  onFallback: () => void
}

/** Live in-app camera using getUserMedia. */
export function CameraSheet({ onCapture, onClose, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [state, setState] = useState<'starting' | 'live' | 'denied' | 'unavailable'>('starting')
  const [snapping, setSnapping] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState('starting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then(async (stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setState('live')
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        setState(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'unavailable')
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing])

  function snap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    setSnapping(true)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        setSnapping(false)
        if (blob) onCapture(blob)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink text-paper" role="dialog" aria-modal aria-label="Câmera">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <button className="btn btn-soft btn-icon" onClick={onClose} aria-label="Fechar câmera">
          <X size={20} />
        </button>
        <span className="font-display text-lg font-bold">Registre a sua ação</span>
        <button
          className="btn btn-soft btn-icon"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          aria-label="Trocar câmera"
          disabled={state !== 'live'}
        >
          <SwitchCamera size={20} />
        </button>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-3xl border-2 border-paper/30 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
        />
        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" />
            <p>Abrindo a câmera…</p>
          </div>
        )}
        {(state === 'denied' || state === 'unavailable') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <CameraOff size={36} />
            <p className="font-display text-xl font-bold">
              {state === 'denied' ? 'Permissão de câmera negada' : 'Câmera indisponível'}
            </p>
            <p className="text-sm text-paper/80">
              {state === 'denied'
                ? 'Para tirar a foto aqui, permita o acesso à câmera nas configurações do navegador para este site. Você também pode usar a câmera do sistema.'
                : 'Não conseguimos acessar a câmera neste dispositivo. Tente a câmera do sistema ou escolha uma foto da galeria.'}
            </p>
            <button className="btn btn-primary" onClick={onFallback}>
              <Camera size={18} /> Usar câmera do sistema
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={snap}
          disabled={state !== 'live' || snapping}
          aria-label="Tirar foto"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-paper bg-signal transition-transform active:scale-90 disabled:opacity-40"
        >
          {snapping ? <Loader2 className="animate-spin text-ink" /> : <Camera size={30} className="text-ink" />}
        </button>
      </div>
    </div>
  )
}
