import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

type Toast = { id: number; kind: 'success' | 'error'; message: string }

const Ctx = createContext<(kind: Toast['kind'], message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role="status">
            {t.kind === 'success' ? <CircleCheck size={20} /> : <CircleAlert size={20} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
