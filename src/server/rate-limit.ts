import { and, count, eq, gt, lt } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { db } from '../../db/index.js'
import { rateEvents } from '../../db/schema.js'
import { HttpError } from './http'

/**
 * Sliding-window limiter backed by the shared database, so it holds across
 * every serverless instance.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const since = new Date(Date.now() - windowSeconds * 1000)
  const [{ n }] = await db
    .select({ n: count() })
    .from(rateEvents)
    .where(and(eq(rateEvents.key, key), gt(rateEvents.createdAt, since)))
  if (n >= max) {
    throw new HttpError(429, 'Muitas ações em pouco tempo. Aguarde um pouco e tente de novo.', 'rate_limited')
  }
  await db.insert(rateEvents).values({ key })
  // Opportunistic cleanup of this key's expired events.
  await db.delete(rateEvents).where(and(eq(rateEvents.key, key), lt(rateEvents.createdAt, since)))
}

/**
 * Anti-abuse key for creating identities. The network address is hashed and
 * used only to throttle bulk creation — never to identify or recover anyone.
 */
export function networkKey(request: Request) {
  const ip =
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  return 'new-identity:' + createHash('sha256').update(ip).digest('hex').slice(0, 24)
}
