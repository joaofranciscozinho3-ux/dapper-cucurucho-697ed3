import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  title: string
  body: ReactNode
  confirmLabel: string
  busyLabel: string
  busy: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ title, body, confirmLabel, busyLabel, busy, error, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button
        aria-label="Fechar"
        className="backdrop absolute inset-0 bg-ink/50"
        onClick={() => !busy && onCancel()}
      />
      <div className="sheet card relative m-3 w-full max-w-sm p-6">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        <div className="mt-2 text-ink-soft">{body}</div>
        {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn btn-soft" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
