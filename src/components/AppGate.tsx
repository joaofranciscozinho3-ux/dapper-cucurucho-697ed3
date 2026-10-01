import type { ReactNode } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useIdentity } from '@/lib/identity'
import { AppShell } from './AppShell'
import { Logo } from './Logo'
import { Onboarding } from './Onboarding'

/** Decides what to show based on the device's anonymous identity. */
export function AppGate({ children }: { children: ReactNode }) {
  const { status, retry } = useIdentity()

  if (status.kind === 'loading') {
    return (
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-4">
        <Logo className="text-4xl" />
        <p className="text-ink-soft">Reconhecendo seu dispositivo…</p>
      </div>
    )
  }

  if (status.kind === 'offline') {
    return (
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-sun">
          <WifiOff />
        </span>
        <h1 className="font-display text-3xl font-extrabold">Sem conexão</h1>
        <p className="text-ink-soft">
          O Elaine é um feed público compartilhado. É preciso estar conectado para reconhecer sua
          identidade, carregar as ações e publicar.
        </p>
        <button className="btn btn-dark btn-lg" onClick={retry}>
          <RefreshCw size={18} /> Tentar de novo
        </button>
      </div>
    )
  }

  if (status.kind === 'new' || status.kind === 'lost') return <Onboarding />

  return <AppShell>{children}</AppShell>
}
