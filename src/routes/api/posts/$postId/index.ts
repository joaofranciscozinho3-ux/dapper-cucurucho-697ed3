import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../../../db/index.js'
import { posts } from '../../../../../db/schema.js'
import { assertSameOrigin, handle, HttpError, json } from '@/server/http'
import { currentParticipant, requireParticipant } from '@/server/identity'
import { imageStore } from '@/server/images'
import { postColumns, toPostDto } from '@/server/posts'
import { parseId } from '@/server/validate'

export const Route = createFileRoute('/api/posts/$postId/')({
  server: {
    handlers: {
      GET: handle(async ({ request, params }) => {
        const id = parseId(params.postId)
        const viewer = await currentParticipant(request)
        const [row] = await db.select(postColumns).from(posts).where(eq(posts.id, id)).limit(1)
        if (!row) throw new HttpError(404, 'Esta ação não existe mais.', 'not_found')
        return json({ post: toPostDto(row, viewer?.id ?? null) })
      }),

      // Only the owner can delete — enforced here in the WHERE clause.
      DELETE: handle(async ({ request, params }) => {
        assertSameOrigin(request)
        const me = await requireParticipant(request)
        const id = parseId(params.postId)
        const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
        if (!row) throw new HttpError(404, 'Esta ação não existe mais.', 'not_found')
        if (row.participantId !== me.id) {
          throw new HttpError(403, 'Você só pode excluir as suas próprias ações.', 'forbidden')
        }
        // Comments are removed by the ON DELETE CASCADE foreign key.
        const deleted = await db
          .delete(posts)
          .where(and(eq(posts.id, id), eq(posts.participantId, me.id)))
          .returning({ imageKey: posts.imageKey })
        if (deleted[0]?.imageKey) {
          await imageStore().delete(deleted[0].imageKey).catch((e) => console.error(e))
        }
        return json({ ok: true })
      }),
    },
  },
})
