import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ApiError,
  api,
  clearStoredIdentity,
  hasCorruptIdentity,
  loadStoredIdentity,
  saveStoredIdentity,
} from './api'
import type { Participant } from './api'

type Status =
  | { kind: 'loading' }
  | { kind: 'new' } // first visit: ask for a nickname
  | { kind: 'lost'; reason: 'not_found' | 'corrupt' } // had an identity that can't be resolved
  | { kind: 'offline' }
  | { kind: 'ready'; me: Participant; token: string | null }

type IdentityApi = {
  status: Status
  create: (nickname: string, recoveryKey: string) => Promise<void>
  restore: (code: string) => Promise<void>
  rename: (nickname: string) => Promise<void>
  setRecoveryKey: (recoveryKey: string) => Promise<void>
  startFresh: () => void
  retry: () => void
}

type SessionResponse = { participant: Participant; token: string | null }

const Ctx = createContext<IdentityApi | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })

  const adopt = useCallback((res: SessionResponse) => {
    const token = res.token ?? loadStoredIdentity()?.token ?? null
    if (token) {
      saveStoredIdentity({ token, participantId: res.participant.id, nickname: res.participant.nickname })
    }
    setStatus({ kind: 'ready', me: res.participant, token })
  }, [])

  const boot = useCallback(async () => {
    setStatus({ kind: 'loading' })
    const stored = loadStoredIdentity()
    const corrupt = hasCorruptIdentity()
    try {
      // The server resolves the identity from the Bearer token (localStorage)
      // or, if that was wiped, from the long-lived HttpOnly cookie.
      adopt(await api<SessionResponse>('/api/session'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        if (stored) setStatus({ kind: 'lost', reason: 'not_found' })
        else if (corrupt) setStatus({ kind: 'lost', reason: 'corrupt' })
        else setStatus({ kind: 'new' })
      } else {
        setStatus({ kind: 'offline' })
      }
    }
  }, [adopt])

  useEffect(() => {
    boot()
  }, [boot])

  const create = useCallback(
    async (nickname: string, recoveryKey: string) => {
      adopt(
        await api<SessionResponse>('/api/session', {
          method: 'POST',
          body: JSON.stringify({ nickname, recoveryKey }),
        }),
      )
    },
    [adopt],
  )

  const restore = useCallback(
    async (code: string) => {
      clearStoredIdentity()
      adopt(await api<SessionResponse>('/api/restore', { method: 'POST', body: JSON.stringify({ code }) }))
    },
    [adopt],
  )

  const rename = useCallback(async (nickname: string) => {
    const res = await api<SessionResponse>('/api/session', {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    })
    setStatus((s) => {
      if (s.kind !== 'ready') return s
      if (s.token) saveStoredIdentity({ token: s.token, participantId: res.participant.id, nickname: res.participant.nickname })
      return { ...s, me: res.participant }
    })
  }, [])

  const setRecoveryKey = useCallback(async (recoveryKey: string) => {
    const res = await api<SessionResponse>('/api/recovery-key', {
      method: 'PUT',
      body: JSON.stringify({ recoveryKey }),
    })
    setStatus((s) => (s.kind === 'ready' ? { ...s, me: res.participant } : s))
  }, [])

  const startFresh = useCallback(() => {
    clearStoredIdentity()
    setStatus({ kind: 'new' })
  }, [])

  return (
    <Ctx.Provider value={{ status, create, restore, rename, setRecoveryKey, startFresh, retry: boot }}>
      {children}
    </Ctx.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider')
  return ctx
}

/** For screens rendered only once the identity is ready. */
export function useMe() {
  const { status } = useIdentity()
  if (status.kind !== 'ready') throw new Error('Identity not ready')
  return status
}
