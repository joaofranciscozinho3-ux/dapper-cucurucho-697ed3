import { useCallback, useState } from 'react'
import { Check, ImageOff, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import type { Post } from '@/lib/api'
import { fullDate, timeAgo } from '@/lib/time'
import { useToast } from '@/lib/toast'
import { Avatar } from './Avatar'
import { Comments } from './Comments'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  post: Post
  onDeleted: (id: string) => void
  delay?: number
}

export function PostCard({ post, onDeleted, delay = 0 }: Props) {
  const toast = useToast()
  const [showComments, setShowComments] = useState(false)
  const [count, setCount] = useState(post.commentCount)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [imgAttempt, setImgAttempt] = useState(0)
  const onCount = useCallback((n: number) => setCount(n), [])

  async function remove() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' })
      setConfirming(false)
      toast('success', 'Publicação excluída.')
      onDeleted(post.id)
    } catch (e) {
      setDeleteError(errorMessage(e))
      setDeleting(false)
    }
  }

  return (
    <article className="rise card overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <Avatar id={post.author.id} nickname={post.author.nickname} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">
            {post.author.nickname}
            {post.isMine && <span className="ml-1.5 text-xs font-semibold text-ink-soft">(você)</span>}
          </p>
          <time dateTime={post.createdAt} title={fullDate(post.createdAt)} className="text-sm text-ink-soft">
            {timeAgo(post.createdAt)}
          </time>
        </div>
        <span className="stamp">
          <Check size={12} strokeWidth={4} /> FEITO
        </span>
        {post.isMine && (
          <div className="relative">
            <button
              className="btn btn-soft btn-icon"
              aria-label="Opções da publicação"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <>
                <button aria-label="Fechar menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                <div className="card absolute right-0 top-12 z-20 w-56 p-2">
                  <button
                    className="btn btn-danger btn-sm w-full"
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirming(true)
                    }}
                  >
                    <Trash2 size={16} /> Excluir publicação
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {post.imageUrl && (
        <div className="relative mx-4 overflow-hidden rounded-2xl border-2 border-ink bg-paper-deep">
          {imgState === 'loading' && <div className="skeleton absolute inset-0" />}
          {imgState === 'error' ? (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-sm text-ink-soft">
              <ImageOff />
              Não foi possível carregar a foto.
              <button
                className="btn btn-soft btn-sm"
                onClick={() => {
                  setImgState('loading')
                  setImgAttempt((n) => n + 1)
                }}
              >
                Tentar de novo
              </button>
            </div>
          ) : (
            <img
              key={imgAttempt}
              src={imgAttempt ? `${post.imageUrl}?r=${imgAttempt}` : post.imageUrl}
              alt={post.text ? `Foto da ação: ${post.text.slice(0, 80)}` : `Foto da ação de ${post.author.nickname}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgState('ok')}
              onError={() => setImgState('error')}
              className={`block max-h-[70vh] min-h-48 w-full object-cover transition-opacity duration-300 ${imgState === 'ok' ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>
      )}

      {post.text && (
        <p
          className={`whitespace-pre-wrap break-words px-4 ${post.imageUrl ? 'pt-3 text-[1.02rem]' : 'font-display text-xl font-bold leading-snug'}`}
        >
          {post.text}
        </p>
      )}

      <div className="px-4 pb-4 pt-3">
        <button
          className={`btn btn-sm ${showComments ? 'btn-dark' : 'btn-sun'}`}
          aria-expanded={showComments}
          onClick={() => setShowComments((s) => !s)}
        >
          <MessageCircle size={16} />
          {showComments ? 'Fechar comentários' : count > 0 ? `Comentar · ${count}` : 'Comentar'}
        </button>
      </div>

      {showComments && <Comments postId={post.id} onCount={onCount} />}

      {confirming && (
        <ConfirmDialog
          title="Excluir esta ação?"
          body="Essa publicação será removida do Elaine."
          confirmLabel="Excluir"
          busyLabel="Excluindo…"
          busy={deleting}
          error={deleteError}
          onCancel={() => {
            setConfirming(false)
            setDeleteError(null)
          }}
          onConfirm={remove}
        />
      )}
    </article>
  )
}

export function PostSkeleton() {
  return (
    <div className="card overflow-hidden p-4" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-1/3 rounded" />
          <div className="skeleton h-3 w-1/5 rounded" />
        </div>
      </div>
      <div className="skeleton mt-4 aspect-[4/3] rounded-2xl" />
      <div className="skeleton mt-4 h-3.5 w-4/5 rounded" />
    </div>
  )
}
