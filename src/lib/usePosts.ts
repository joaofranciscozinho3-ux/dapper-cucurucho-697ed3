import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from './api'
import type { Post } from './api'

type Page = { posts: Post[]; nextBefore: string | null; total?: number }

/** Loads the shared public feed (or one participant's posts) from the backend. */
export function usePosts(author?: string) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [total, setTotal] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const seq = useRef(0)

  const query = useCallback(
    (before?: string) => {
      const p = new URLSearchParams()
      if (author) p.set('author', author)
      if (before) p.set('before', before)
      const qs = p.toString()
      return api<Page>(`/api/posts${qs ? `?${qs}` : ''}`)
    },
    [author],
  )

  const refresh = useCallback(async () => {
    const id = ++seq.current
    setRefreshing(true)
    setError(null)
    try {
      const page = await query()
      if (id !== seq.current) return
      setPosts(page.posts)
      setNextBefore(page.nextBefore)
      setTotal(page.total)
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e))
    } finally {
      if (id === seq.current) setRefreshing(false)
    }
  }, [query])

  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await query(nextBefore)
      setPosts((cur) => {
        const seen = new Set(cur?.map((p) => p.id))
        return [...(cur ?? []), ...page.posts.filter((p) => !seen.has(p.id))]
      })
      setNextBefore(page.nextBefore)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoadingMore(false)
    }
  }, [nextBefore, loadingMore, query])

  useEffect(() => {
    refresh()
    // Pick up other participants' new actions when the user returns to the app.
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  const remove = useCallback((id: string) => {
    setPosts((cur) => cur?.filter((p) => p.id !== id) ?? cur)
    setTotal((t) => (t === undefined ? t : Math.max(0, t - 1)))
  }, [])

  return { posts, error, refreshing, loadingMore, nextBefore, total, refresh, loadMore, remove }
}
