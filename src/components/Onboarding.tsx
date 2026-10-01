import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Camera, KeyRound, Loader2, Send, Sprout, TriangleAlert } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { useIdentity } from '@/lib/identity'
import { Logo } from './Logo'
import { RecoveryKeyField, isRecoveryKeyLongEnough } from './RecoveryKeyField'

export function Onboarding() {
  const { status, create, restore, startFresh } = useIdentity()
  const lost = status.kind === 'lost'
  const [mode, setMode] = useState<'nick' | 'restore'>(lost ? 'restore' : 'nick')

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <Logo />

      <section className="rise mt-10">
        <h1 className="font-display text-[3.4rem] font-extrabold leading-[0.92] tracking-tight">
          Faça.
          <br />
          <span className="relative inline-block">
            Registre.
            <span className="absolute -bottom-1 left-0 -z-10 h-4 w-full -rotate-1 rounded bg-sun" />
          </span>
          <br />
          <span className="text-signal-deep">Compartilhe.</span>
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          Elaine é um mural público de ações concretas. Plantou, consertou, terminou, ajudou? Mostre
          a evidência e inspire outras pessoas a sair da intenção.
        </p>
        <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
          {[
            { icon: Sprout, label: 'Faça algo real' },
            { icon: Camera, label: 'Registre a prova' },
            { icon: Send, label: 'Publique no feed' },
          ].map(({ icon: Icon, label }, i) => (
            <li
              key={label}
              className="rise card flex flex-col items-center gap-2 px-2 py-3"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <Icon size={22} />
              {label}
            </li>
          ))}
        </ol>
      </section>

      {lost && (
        <div className="rise mt-8 flex gap-3 rounded-2xl border-2 border-ink bg-sun p-4 text-sm">
          <TriangleAlert className="shrink-0" size={20} />
          <div>
            <p className="font-bold">Não reconhecemos sua identidade neste dispositivo.</p>
            <p className="mt-1">
              {status.reason === 'corrupt'
                ? 'Os dados locais do Elaine neste navegador estão danificados.'
                : 'Os dados deste navegador foram apagados ou a identidade não existe mais.'}{' '}
              Se você criou uma <b>chave de recuperação</b>, digite-a abaixo. Sem ela não é possível
              recuperar a identidade anterior — o Elaine não usa login nem endereço IP.
            </p>
          </div>
        </div>
      )}

      <div className="rise mt-8" style={{ animationDelay: '380ms' }}>
        {mode === 'nick' ? (
          <NicknameForm onSubmit={create} />
        ) : (
          <RestoreForm onSubmit={restore} />
        )}
        <button
          type="button"
          className="btn btn-soft mt-3 w-full"
          onClick={() => {
            if (mode === 'restore' && lost) startFresh()
            setMode(mode === 'nick' ? 'restore' : 'nick')
          }}
        >
          {mode === 'nick' ? (
            <>
              <KeyRound size={18} /> Já tenho uma chave de recuperação
            </>
          ) : (
            'Começar com uma nova identidade'
          )}
        </button>
      </div>
    </div>
  )
}

function NicknameForm({ onSubmit }: { onSubmit: (nick: string, recoveryKey: string) => Promise<void> }) {
  const [nick, setNick] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = nick.trim().length >= 2 && isRecoveryKeyLongEnough(key)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(nick.trim(), key)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <label htmlFor="nick" className="font-display text-2xl font-extrabold leading-tight">
        Como você quer aparecer no Elaine?
      </label>
      <p className="mt-1 text-sm text-ink-soft">Sem cadastro, sem e-mail, sem senha. Você pode mudar depois.</p>
      <input
        id="nick"
        className="field mt-4 text-lg"
        placeholder="Ex.: Fulano1"
        autoComplete="nickname"
        maxLength={24}
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        autoFocus
      />
      <label htmlFor="new-key" className="mt-5 block font-display text-xl font-extrabold leading-tight">
        Crie sua chave de recuperação
      </label>
      <p className="mt-1 text-sm text-ink-soft">
        É com ela que você volta a ser você em outro aparelho ou se apagar os dados do navegador.
      </p>
      <RecoveryKeyField id="new-key" value={key} onChange={setKey} />
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      <button className="btn btn-primary btn-lg mt-4 w-full" disabled={!valid || busy}>
        {busy ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
        {busy ? 'Criando sua identidade…' : 'Continuar'}
      </button>
    </form>
  )
}

function RestoreForm({ onSubmit }: { onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(code.trim())
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <label htmlFor="code" className="font-display text-2xl font-extrabold leading-tight">
        Recuperar minha identidade
      </label>
      <p className="mt-1 text-sm text-ink-soft">
        Digite a chave de recuperação que você criou. Maiúsculas e acentos não importam.
      </p>
      <input
        id="code"
        className="field mt-4 text-lg"
        placeholder="Sua chave de recuperação"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      <button className="btn btn-dark btn-lg mt-4 w-full" disabled={!code.trim() || busy}>
        {busy ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
        {busy ? 'Verificando…' : 'Recuperar identidade'}
      </button>
    </form>
  )
}
