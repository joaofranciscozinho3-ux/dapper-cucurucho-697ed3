import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import type { Comment } from '@/lib/api'
import { useOnline } from '@/lib/online'
import { timeAgo } from '@/lib/time'
import { useToast } from '@/lib/toast'
import { Avatar } from './Avatar'

export function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const online = useOnline()
  const toast = useToast()

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api<{ comments: Comment[] }>(`/api/posts/${postId}/comments`)
      setComments(res.comments)
      onCount(res.comments.length)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [postId, onCount])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const res = await api<{ comment: Comment }>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      })
      const next = [...(comments ?? []), res.comment]
      setComments(next)
      onCount(next.length)
      setText('')
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t-2 border-dashed border-line px-4 pb-4 pt-3">
      {comments === null && !error && (
        <div className="space-y-2 py-1" aria-label="Carregando comentários">
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-10 w-2/3 rounded-xl" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-paper-deep p-3 text-sm">
          <span>Não foi possível carregar os comentários. {error}</span>
          <button className="btn btn-dark btn-sm" onClick={load}>
            <RefreshCw size={14} /> Tentar
          </button>
        </div>
      )}
      {comments?.length === 0 && (
        <p className="flex items-center gap-2 py-2 text-sm text-ink-soft">
          <MessageCircle size={16} /> Nenhum comentário ainda. Seja a primeira pessoa a incentivar!
        </p>
      )}
      {comments && comments.length > 0 && (
        <ul className="space-y-3 py-1">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar id={c.author.id} nickname={c.author.nickname} size={30} />
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-paper px-3 py-2">
                <p className="text-sm">
                  <b>{c.author.nickname}</b>{' '}
                  <span className="text-xs text-ink-soft">· {timeAgo(c.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-[0.95rem]">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          className="field min-w-0 flex-1 py-2.5"
          placeholder={online ? 'Escreva um comentário…' : 'Sem conexão'}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!online}
          aria-label="Escreva um comentário"
        />
        <button className="btn btn-dark" disabled={!text.trim() || sending || !online}>
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Comentar
        </button>
      </form>
    </div>
  )
}
