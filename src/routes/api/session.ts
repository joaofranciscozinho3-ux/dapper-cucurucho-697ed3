import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/index.js'
import { comments, participants, posts } from '../../../db/schema.js'
import { assertSameOrigin, handle, json, readJson } from '@/server/http'
import {
  claimableRecoveryHash,
  currentParticipant,
  hashToken,
  newToken,
  publicParticipant,
  readToken,
  requireParticipant,
  sessionCookie,
  withRecoveryKeyUniqueness,
} from '@/server/identity'
import { networkKey, rateLimit } from '@/server/rate-limit'
import { parseNickname, parseRecoveryKey } from '@/server/validate'

export const Route = createFileRoute('/api/session')({
  server: {
    handlers: {
      // Who am I? Resolves the device's persistent anonymous identity.
      GET: handle(async ({ request }) => {
        const p = await requireParticipant(request)
        // Echo the device's own secret back so a device that still has the
        // cookie (but lost localStorage) can show its recovery code again.
        return json({ participant: publicParticipant(p), token: readToken(request) })
      }),

      // First visit: create the anonymous identity for this device.
      POST: handle(async ({ request }) => {
        assertSameOrigin(request)
        const body = await readJson(request)
        const nickname = parseNickname(body.nickname)
        const recoveryKey = parseRecoveryKey(body.recoveryKey)

        // Never mint a second identity for a device that already has one.
        const existing = await currentParticipant(request)
        if (existing) return json({ participant: publicParticipant(existing), token: readToken(request) })

        // Generous: a whole classroom or event may share one Wi-Fi network.
        await rateLimit(networkKey(request), 150, 60 * 60)
        const recoveryHash = await claimableRecoveryHash(recoveryKey)
        const token = newToken()
        const [p] = await withRecoveryKeyUniqueness(() =>
          db.insert(participants).values({ nickname, tokenHash: hashToken(token), recoveryHash }).returning(),
        )
        return json(
          { participant: publicParticipant(p), token },
          { status: 201, headers: { 'Set-Cookie': sessionCookie(token) } },
        )
      }),

      // Rename: same identity, new display name everywhere.
      PATCH: handle(async ({ request }) => {
        assertSameOrigin(request)
        const me = await requireParticipant(request)
        const nickname = parseNickname((await readJson(request)).nickname)
        await rateLimit(`rename:${me.id}`, 10, 60 * 60)
        const [p] = await db
          .update(participants)
          .set({ nickname, updatedAt: new Date() })
          .where(eq(participants.id, me.id))
          .returning()
        await db.update(posts).set({ nickname }).where(eq(posts.participantId, me.id))
        await db.update(comments).set({ nickname }).where(eq(comments.participantId, me.id))
        return json({ participant: publicParticipant(p) })
      }),
    },
  },
})
