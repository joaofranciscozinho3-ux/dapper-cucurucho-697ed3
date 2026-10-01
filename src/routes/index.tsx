import { Link, createFileRoute } from '@tanstack/react-router'
import { CloudOff, Loader2, Plus, RefreshCw, Sprout } from 'lucide-react'
import { PostCard, PostSkeleton } from '@/components/PostCard'
import { useMe } from '@/lib/identity'
import { usePosts } from '@/lib/usePosts'

export const Route = createFileRoute('/')({
  component: Feed,
})

function Feed() {
  const { me } = useMe()
  const { posts, error, refreshing, loadingMore, nextBefore, refresh, loadMore, remove } = usePosts()

  return (
    <div className="pt-5">
      <section className="rise card relative overflow-hidden bg-moss p-5 text-paper">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-leaf/30" aria-hidden />
        <div className="absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-sun/25" aria-hidden />
        <p className="relative text-sm font-semibold uppercase tracking-[0.18em] text-leaf">
          Faça · Registre · Compartilhe
        </p>
        <h1 className="relative mt-2 font-display text-[1.9rem] font-extrabold leading-[1.05]">
          Oi, {me.nickname}.<br />O que você <span className="text-sun">fez</span> hoje?
        </h1>
        <Link to="/registrar" className="btn btn-primary btn-lg relative mt-5 w-full">
          <Plus size={22} strokeWidth={3} /> Registrar uma ação
        </Link>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Ações da comunidade</h2>
        <button className="btn btn-soft btn-sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="mt-4 space-y-6">
        {posts === null && !error && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {error && (
          <div className="card flex flex-col items-center gap-3 p-6 text-center">
            <CloudOff />
            <p className="font-bold">Não foi possível carregar o feed.</p>
            <p className="text-sm text-ink-soft">{error}</p>
            <button className="btn btn-dark" onClick={refresh}>
              <RefreshCw size={16} /> Tentar de novo
            </button>
          </div>
        )}

        {posts?.length === 0 && (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-leaf">
              <Sprout size={30} />
            </span>
            <p className="font-display text-2xl font-extrabold">O mural ainda está vazio.</p>
            <p className="text-ink-soft">Seja a primeira pessoa a transformar intenção em ação.</p>
            <Link to="/registrar" className="btn btn-primary">
              <Plus size={18} strokeWidth={3} /> Registrar uma ação
            </Link>
          </div>
        )}

        {posts?.map((p, i) => (
          <PostCard key={p.id} post={p} onDeleted={remove} delay={Math.min(i, 4) * 70} />
        ))}

        {nextBefore && (
          <button className="btn btn-soft w-full" onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <Loader2 size={18} className="animate-spin" />}
            {loadingMore ? 'Carregando…' : 'Carregar mais ações'}
          </button>
        )}
      </div>
    </div>
  )
}
