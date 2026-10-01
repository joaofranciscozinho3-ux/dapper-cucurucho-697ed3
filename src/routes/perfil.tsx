import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Check, KeyRound, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { PostCard, PostSkeleton } from '@/components/PostCard'
import { RecoveryKeyField, isRecoveryKeyLongEnough } from '@/components/RecoveryKeyField'
import { errorMessage } from '@/lib/api'
import { useIdentity, useMe } from '@/lib/identity'
import { useToast } from '@/lib/toast'
import { usePosts } from '@/lib/usePosts'

export const Route = createFileRoute('/perfil')({
  head: () => ({ meta: [{ title: 'Meu perfil — Elaine' }] }),
  component: Profile,
})

function Profile() {
  const { me } = useMe()
  const { posts, error, total, nextBefore, loadingMore, refresh, loadMore, remove } = usePosts(me.id)
  const count = total ?? posts?.length

  return (
    <div className="pt-5">
      <section className="rise card p-5">
        <div className="flex items-center gap-4">
          <Avatar id={me.id} nickname={me.nickname} size={68} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-extrabold leading-tight">{me.nickname}</h1>
            <p className="text-sm text-ink-soft">
              No Elaine desde {new Date(me.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-end gap-3 rounded-2xl border-2 border-ink bg-leaf px-4 py-3">
          <span className="font-display text-5xl font-extrabold leading-none">{count ?? '–'}</span>
          <span className="pb-1 font-bold leading-tight">
            {count === 1 ? 'ação publicada' : 'ações publicadas'}
          </span>
        </div>
        <RenameForm />
      </section>

      <IdentityCard />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Minhas ações</h2>
        <Link to="/registrar" className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={3} /> Registrar
        </Link>
      </div>

      <div className="mt-4 space-y-6">
        {posts === null && !error && <PostSkeleton />}
        {error && (
          <div className="card flex items-center justify-between gap-3 p-4 text-sm">
            <span>Não foi possível carregar suas ações. {error}</span>
            <button className="btn btn-dark btn-sm" onClick={refresh}>
              <RefreshCw size={14} /> Tentar
            </button>
          </div>
        )}
        {posts?.length === 0 && (
          <div className="card p-6 text-center">
            <p className="font-display text-xl font-bold">Você ainda não registrou nenhuma ação.</p>
            <p className="mt-1 text-ink-soft">Que tal começar com algo pequeno, hoje mesmo?</p>
            <Link to="/registrar" className="btn btn-primary mt-4">
              <Plus size={18} strokeWidth={3} /> Registrar uma ação
            </Link>
          </div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} onDeleted={remove} />)}
        {nextBefore && (
          <button className="btn btn-soft w-full" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        )}
      </div>
    </div>
  )
}

function RenameForm() {
  const { me } = useMe()
  const { rename } = useIdentity()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(me.nickname)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await rename(value.trim())
      toast('success', 'Nome atualizado em todas as suas ações.')
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button
        className="btn btn-soft mt-4 w-full"
        onClick={() => {
          setValue(me.nickname)
          setEditing(true)
        }}
      >
        <Pencil size={16} /> Alterar meu nome
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="rename" className="text-sm font-bold">
        Novo nome no Elaine
      </label>
      <input
        id="rename"
        className="field mt-1"
        value={value}
        maxLength={24}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      <p className="mt-2 text-xs text-ink-soft">Você continua sendo o mesmo participante — só o nome muda.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-soft" onClick={() => setEditing(false)} disabled={busy}>
          Cancelar
        </button>
        <button className="btn btn-dark" disabled={busy || value.trim().length < 2}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
        </button>
      </div>
    </form>
  )
}

function IdentityCard() {
  const { me } = useMe()
  const { setRecoveryKey } = useIdentity()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await setRecoveryKey(value)
      toast('success', me.hasRecoveryKey ? 'Chave de recuperação alterada.' : 'Chave de recuperação criada.')
      setEditing(false)
      setValue('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mt-6 bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <ShieldCheck size={22} /> Sua identidade sem login
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Este dispositivo guarda uma identidade anônima do Elaine — sem e-mail, sem senha e sem usar seu
        endereço IP. Ao reabrir o app aqui, você entra automaticamente como <b>você mesmo</b>.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Se apagar os dados do navegador ou trocar de aparelho, você volta a esta identidade com a sua
        <b> chave de recuperação</b>. Não compartilhe com ninguém.
      </p>

      {me.hasRecoveryKey ? (
        <p className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-ink bg-leaf px-4 py-3 text-sm font-semibold">
          <Check size={18} strokeWidth={3} /> Você já criou sua chave de recuperação.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-ink bg-sun px-4 py-3 text-sm font-semibold">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" /> Você ainda não tem uma chave de recuperação.
          Crie uma agora para não perder sua identidade.
        </p>
      )}

      {editing ? (
        <form onSubmit={submit} className="mt-4">
          <label htmlFor="recovery-key" className="text-sm font-bold">
            {me.hasRecoveryKey ? 'Nova chave de recuperação' : 'Sua chave de recuperação'}
          </label>
          <RecoveryKeyField id="recovery-key" value={value} onChange={setValue} autoFocus />
          {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
          {me.hasRecoveryKey && (
            <p className="mt-2 text-xs text-ink-soft">A chave antiga deixa de funcionar assim que você salvar.</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-soft" onClick={() => setEditing(false)} disabled={busy}>
              Cancelar
            </button>
            <button className="btn btn-dark" disabled={busy || !isRecoveryKeyLongEnough(value)}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            className={`btn mt-4 w-full ${me.hasRecoveryKey ? 'btn-soft' : 'btn-primary'}`}
            onClick={() => {
              setValue('')
              setError(null)
              setEditing(true)
            }}
          >
            <KeyRound size={16} /> {me.hasRecoveryKey ? 'Trocar minha chave' : 'Criar minha chave'}
          </button>
          {me.hasRecoveryKey && (
            <p className="mt-2 text-xs text-ink-soft">
              Por segurança, o Elaine não guarda nem mostra sua chave. Esqueceu? Crie uma nova aqui.
            </p>
          )}
        </>
      )}
    </section>
  )
}
