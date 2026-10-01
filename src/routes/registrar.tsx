import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Camera, CircleAlert, ImagePlus, Loader2, RefreshCw, Send, Trash2, WifiOff } from 'lucide-react'
import { CameraSheet } from '@/components/CameraSheet'
import { errorMessage, uploadForm } from '@/lib/api'
import type { Post } from '@/lib/api'
import { ImageError, prepareImage } from '@/lib/image'
import { useMe } from '@/lib/identity'
import { useOnline } from '@/lib/online'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/registrar')({
  head: () => ({ meta: [{ title: 'Registrar uma ação — Elaine' }] }),
  component: NewAction,
})

const MAX_TEXT = 1000

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }

function NewAction() {
  const { me } = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const online = useOnline()

  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [cameraOpen, setCameraOpen] = useState(false)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url)
    },
    [photo],
  )

  async function acceptImage(input: Blob) {
    setProcessing(true)
    setPhotoError(null)
    try {
      const blob = await prepareImage(input)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setPhotoError(e instanceof ImageError ? e.message : 'Não foi possível usar esta imagem.')
    } finally {
      setProcessing(false)
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) acceptImage(file)
  }

  function openCamera() {
    if (navigator.mediaDevices?.getUserMedia && window.isSecureContext) setCameraOpen(true)
    else cameraInput.current?.click()
  }

  const busy = phase.kind === 'uploading' || phase.kind === 'saving'
  const trimmed = text.trim()
  const canPublish = (photo || trimmed) && !busy && !processing && online

  async function publish() {
    if (!canPublish) return
    const form = new FormData()
    form.set('text', trimmed)
    if (photo) form.set('image', photo.blob, 'acao.jpg')
    setPhase({ kind: 'uploading', progress: 0 })
    try {
      await uploadForm<{ post: Post }>('/api/posts', form, (f) =>
        setPhase(f >= 1 ? { kind: 'saving' } : { kind: 'uploading', progress: f }),
      )
      toast('success', 'Ação publicada! Ela já está no feed público.')
      navigate({ to: '/' })
    } catch (e) {
      setPhase({ kind: 'error', message: errorMessage(e) })
    }
  }

  return (
    <div className="pt-5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-soft">Nova ação de {me.nickname}</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold leading-none">Registrar uma ação</h1>
      <p className="mt-2 text-ink-soft">Mostre o que você fez: uma foto, um texto ou os dois.</p>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" hidden onChange={onFile} />

      <section className="card mt-6 overflow-hidden">
        {photo ? (
          <div className="relative border-b-2 border-ink bg-paper-deep">
            <img src={photo.url} alt="Pré-visualização da foto" className="block max-h-[60vh] w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-10">
              <button className="btn btn-soft btn-sm" onClick={openCamera} disabled={busy}>
                <RefreshCw size={15} /> Trocar
              </button>
              <button className="btn btn-soft btn-sm" onClick={() => galleryInput.current?.click()} disabled={busy}>
                <ImagePlus size={15} /> Galeria
              </button>
              <button className="btn btn-danger btn-sm ml-auto" onClick={() => setPhoto(null)} disabled={busy}>
                <Trash2 size={15} /> Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 border-b-2 border-dashed border-line bg-paper px-5 py-8 text-center">
            {processing ? (
              <>
                <Loader2 className="animate-spin" size={32} />
                <p className="font-semibold">Preparando a foto…</p>
              </>
            ) : (
              <>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-sun">
                  <Camera size={28} />
                </span>
                <p className="font-display text-xl font-bold">Adicione a evidência da sua ação</p>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  <button className="btn btn-dark btn-lg" onClick={openCamera}>
                    <Camera size={20} /> Tirar foto
                  </button>
                  <button className="btn btn-sun btn-lg" onClick={() => galleryInput.current?.click()}>
                    <ImagePlus size={20} /> Escolher da galeria
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {photoError && (
          <p className="flex items-center gap-2 bg-danger px-4 py-3 text-sm font-semibold text-white">
            <CircleAlert size={16} /> {photoError}
          </p>
        )}

        <div className="p-4">
          <label htmlFor="text" className="font-bold">
            O que você fez?
          </label>
          <textarea
            id="text"
            className="field mt-2 min-h-32 resize-y"
            placeholder="Ex.: Plantei uma muda de ipê na calçada de casa."
            maxLength={MAX_TEXT}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <p className={`mt-1 text-right text-xs ${text.length > MAX_TEXT - 50 ? 'text-danger' : 'text-ink-soft'}`}>
            {text.length}/{MAX_TEXT}
          </p>
        </div>
      </section>

      {!online && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-ink bg-sun p-3 text-sm font-semibold">
          <WifiOff size={18} className="shrink-0" /> Sem conexão. Sua ação só será publicada quando você estiver
          conectado — nada é enviado em segundo plano.
        </p>
      )}

      {phase.kind === 'error' && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-ink bg-danger p-3 text-sm font-semibold text-white">
          <CircleAlert size={18} className="shrink-0" /> Não foi possível publicar: {phase.message} Seu rascunho foi
          mantido — tente de novo.
        </p>
      )}

      <button className="btn btn-primary btn-lg relative mt-5 w-full overflow-hidden" onClick={publish} disabled={!canPublish}>
        {phase.kind === 'uploading' && (
          <span
            className="absolute inset-y-0 left-0 bg-sun transition-[width] duration-200"
            style={{ width: `${Math.round(phase.progress * 100)}%` }}
            aria-hidden
          />
        )}
        <span className="relative flex items-center gap-2">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          {phase.kind === 'uploading'
            ? `Enviando foto… ${Math.round(phase.progress * 100)}%`
            : phase.kind === 'saving'
              ? 'Publicando…'
              : 'Publicar ação'}
        </span>
      </button>
      {!photo && !trimmed && (
        <p className="mt-2 text-center text-sm text-ink-soft">Adicione uma foto ou um texto para publicar.</p>
      )}

      {cameraOpen && (
        <CameraSheet
          onClose={() => setCameraOpen(false)}
          onCapture={(blob) => {
            setCameraOpen(false)
            acceptImage(blob)
          }}
          onFallback={() => {
            setCameraOpen(false)
            cameraInput.current?.click()
          }}
        />
      )}
    </div>
  )
}
