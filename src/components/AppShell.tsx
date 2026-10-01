import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { House, Plus, UserRound, WifiOff } from 'lucide-react'
import { useMe } from '@/lib/identity'
import { useOnline } from '@/lib/online'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

export function AppShell({ children }: { children: ReactNode }) {
  const { me } = useMe()
  const online = useOnline()

  return (
    <div className="relative z-10 min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Link to="/" aria-label="Elaine — início">
            <Logo />
          </Link>
          <Link
            to="/perfil"
            className="flex items-center gap-2 rounded-full border-2 border-ink bg-card py-1 pl-1 pr-3 text-sm font-bold shadow-[0_2px_0_var(--color-ink)]"
          >
            <Avatar id={me.id} nickname={me.nickname} size={28} />
            <span className="max-w-[9rem] truncate">{me.nickname}</span>
          </Link>
        </div>
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-semibold text-paper">
            <WifiOff size={16} /> Você está sem conexão. Conecte-se para ver o feed e publicar.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-xl px-4">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-card pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid h-[4.5rem] max-w-xl grid-cols-3 items-center px-4">
          <NavItem to="/" icon={<House size={22} />} label="Início" />
          <div className="flex justify-center">
            <Link
              to="/registrar"
              aria-label="Registrar uma ação"
              className="-mt-9 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-signal shadow-[0_4px_0_var(--color-ink)] transition-transform active:translate-y-1 active:shadow-none"
            >
              <Plus size={32} strokeWidth={3} />
            </Link>
          </div>
          <NavItem to="/perfil" icon={<UserRound size={22} />} label="Meu perfil" />
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: '/' | '/perfil'; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="mx-auto flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-xs font-bold text-ink-soft"
      activeProps={{ className: 'bg-paper-deep text-ink' }}
      activeOptions={{ exact: true }}
    >
      {icon}
      {label}
    </Link>
  )
}
