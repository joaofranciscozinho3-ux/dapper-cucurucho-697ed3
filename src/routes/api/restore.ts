import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { devices } from '../../../db/schema.js'
import { assertSameOrigin, handle, HttpError, json, readJson } from '@/server/http'
import {
  findByRecoveryKey,
  findByToken,
  hashToken,
  isTokenShaped,
  newToken,
  publicParticipant,
  sessionCookie,
} from '@/server/identity'
import { networkKey, rateLimit } from '@/server/rate-limit'
import { normalizeRecoveryKey } from '@/server/validate'

// Restores an identity on a device from the participant's own recovery key
// (or, for identities created before keys existed, the old device code).
export const Route = createFileRoute('/api/restore')({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        assertSameOrigin(request)
        await rateLimit('restore:' + networkKey(request), 10, 15 * 60)
        const body = await readJson(request)
        const code = typeof body.code === 'string' ? body.code.trim() : ''

        const key = normalizeRecoveryKey(code)
        const byKey = key ? await findByRecoveryKey(key) : null
        if (byKey) {
          // A fresh token for this device, so other devices stay signed in.
          const token = newToken()
          await db.insert(devices).values({ participantId: byKey.id, tokenHash: hashToken(token) })
          return json(
            { participant: publicParticipant(byKey), token },
            { headers: { 'Set-Cookie': sessionCookie(token) } },
          )
        }

        const byToken = isTokenShaped(code) ? await findByToken(code) : null
        if (!byToken) throw new HttpError(404, 'Chave de recuperação não encontrada. Confira e tente de novo.', 'invalid_code')
        return json(
          { participant: publicParticipant(byToken), token: code },
          { headers: { 'Set-Cookie': sessionCookie(code) } },
        )
      }),
    },
  },
})
