import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/index.js'
import { participants } from '../../../db/schema.js'
import { assertSameOrigin, handle, json, readJson } from '@/server/http'
import {
  claimableRecoveryHash,
  publicParticipant,
  requireParticipant,
  withRecoveryKeyUniqueness,
} from '@/server/identity'
import { rateLimit } from '@/server/rate-limit'
import { parseRecoveryKey } from '@/server/validate'

// Creates or changes the participant's own memorable recovery key.
export const Route = createFileRoute('/api/recovery-key')({
  server: {
    handlers: {
      PUT: handle(async ({ request }) => {
        assertSameOrigin(request)
        const me = await requireParticipant(request)
        const key = parseRecoveryKey((await readJson(request)).recoveryKey)
        await rateLimit(`recovery-key:${me.id}`, 10, 60 * 60)
        const recoveryHash = await claimableRecoveryHash(key, me.id)
        const [p] = await withRecoveryKeyUniqueness(() =>
          db
            .update(participants)
            .set({ recoveryHash, updatedAt: new Date() })
            .where(eq(participants.id, me.id))
            .returning(),
        )
        return json({ participant: publicParticipant(p) })
      }),
    },
  },
})
