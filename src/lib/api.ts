export type Author = { id: string; nickname: string }

export type Post = {
  id: string
  author: Author
  imageUrl: string | null
  text: string
  createdAt: string
  commentCount: number
  isMine: boolean
}

export type Comment = { id: string; author: Author; text: string; createdAt: string }

export type Participant = { id: string; nickname: string; createdAt: string; hasRecoveryKey: boolean }

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export const OFFLINE_MESSAGE =
  'Sem conexão. É preciso estar conectado para carregar o feed público e publicar.'

const STORAGE_KEY = 'elaine.identity.v1'

type StoredIdentity = { token: string; participantId: string; nickname: string }

export function loadStoredIdentity(): StoredIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.token === 'string' && typeof parsed?.participantId === 'string') return parsed
  } catch {}
  return null
}

/** True when this device once had an identity but its stored data is unreadable. */
export function hasCorruptIdentity() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null && loadStoredIdentity() === null
  } catch {
    return false
  }
}

export function saveStoredIdentity(value: StoredIdentity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {}
}

export function clearStoredIdentity() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

function authHeaders(): Record<string, string> {
  const id = loadStoredIdentity()
  return id ? { Authorization: `Bearer ${id.token}` } : {}
}

async function parseError(res: Response) {
  let message = 'Algo deu errado. Tente novamente.'
  let code = 'error'
  try {
    const body = await res.json()
    if (body?.error) message = body.error
    if (body?.code) code = body.code
  } catch {}
  return new ApiError(res.status, code, message)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError(0, 'offline', OFFLINE_MESSAGE)
  }
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'offline', OFFLINE_MESSAGE)
  }
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<T>
}

/** Multipart POST with upload progress (fetch has no upload progress events). */
export function uploadForm<T>(path: string, form: FormData, onProgress: (fraction: number) => void) {
  return new Promise<T>((resolve, reject) => {
    if (!navigator.onLine) return reject(new ApiError(0, 'offline', OFFLINE_MESSAGE))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', path)
    xhr.withCredentials = true
    for (const [k, v] of Object.entries(authHeaders())) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onerror = () => reject(new ApiError(0, 'offline', OFFLINE_MESSAGE))
    xhr.ontimeout = () => reject(new ApiError(0, 'timeout', 'O envio demorou demais. Verifique a conexão.'))
    xhr.timeout = 60_000
    xhr.onload = () => {
      let body: any = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T)
      else
        reject(
          new ApiError(
            xhr.status,
            body?.code ?? 'error',
            body?.error ?? (xhr.status === 413 ? 'A foto é grande demais.' : 'Não foi possível publicar.'),
          ),
        )
    }
    xhr.send(form)
  })
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.'
