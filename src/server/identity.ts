import { createHash, randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { devices, participants } from '../../db/schema.js'
import { HttpError } from './http'

// Anonymous identity: the device holds a random 256-bit secret; the database
// only stores its hash. The secret travels as an HttpOnly cookie and, as a
// backup the client keeps in localStorage, as a Bearer header. IP addresses
// are never used to identify anyone.
export const COOKIE_NAME = 'elaine_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // ~13 months, the browser maximum

export type Participant = typeof participants.$inferSelect

export function newToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
}

export function readToken(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim()
  const cookie = request.headers.get('cookie') ?? ''
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE_NAME) return v.join('=')
  }
  return null
}

export function isTokenShaped(token: string | null): token is string {
  return !!token && /^[A-Za-z0-9_-]{20,100}$/.test(token)
}

export async function findByToken(token: string | null): Promise<Participant | null> {
  if (!isTokenShaped(token)) return null
  const hash = hashToken(token)
  const [row] = await db.select().from(participants).where(eq(participants.tokenHash, hash)).limit(1)
  if (row) return row
  // Devices restored with the recovery key have their own token.
  const [viaDevice] = await db
    .select({ participant: participants })
    .from(devices)
    .innerJoin(participants, eq(devices.participantId, participants.id))
    .where(eq(devices.tokenHash, hash))
    .limit(1)
  return viaDevice?.participant ?? null
}

// The recovery key is chosen by a person, so it gets a deliberately slow hash.
// The salt is fixed so the same key always maps to the same stored value and
// can be looked up (keys are unique across participants).
const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number, opts: object) => Promise<Buffer>
const RECOVERY_SALT = 'elaine.recovery-key.v1'

export async function hashRecoveryKey(normalizedKey: string) {
  const buf = await scryptAsync(normalizedKey, RECOVERY_SALT, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return buf.toString('hex')
}

export async function findByRecoveryKey(normalizedKey: string): Promise<Participant | null> {
  const [row] = await db
    .select()
    .from(participants)
    .where(eq(participants.recoveryHash, await hashRecoveryKey(normalizedKey)))
    .limit(1)
  return row ?? null
}

export async function currentParticipant(request: Request) {
  return findByToken(readToken(request))
}

export async function requireParticipant(request: Request) {
  const p = await currentParticipant(request)
  if (!p) {
    throw new HttpError(401, 'Sua identidade no Elaine não foi encontrada.', 'no_identity')
  }
  return p
}

export function publicParticipant(p: Participant) {
  return {
    id: p.id,
    nickname: p.nickname,
    createdAt: p.createdAt.toISOString(),
    hasRecoveryKey: p.recoveryHash !== null,
  }
}

function isUniqueViolation(err: unknown) {
  for (let e: any = err; e; e = e.cause) if (e.code === '23505') return true
  return false
}

const KEY_TAKEN = new HttpError(
  409,
  'Essa chave já está em uso. Crie outra — acrescente uma palavra ou um número.',
  'recovery_key_taken',
)

/** Hashes a (normalized) key and fails if another participant already owns it. */
export async function claimableRecoveryHash(normalizedKey: string, ownerId?: string) {
  const hash = await hashRecoveryKey(normalizedKey)
  const [row] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.recoveryHash, hash))
    .limit(1)
  if (row && row.id !== ownerId) throw KEY_TAKEN
  return hash
}

/** Runs a write that sets recovery_hash, turning a race on the unique index into a friendly 409. */
export async function withRecoveryKeyUniqueness<T>(write: () => Promise<T>) {
  try {
    return await write()
  } catch (err) {
    if (isUniqueViolation(err)) throw KEY_TAKEN
    throw err
  }
}
