import { createFileRoute } from '@tanstack/react-router'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../../../../db/index.js'
import { comments, posts } from '../../../../../db/schema.js'
import { assertSameOrigin, handle, HttpError, json, readJson } from '@/server/http'
import { requireParticipant } from '@/server/identity'
import { rateLimit } from '@/server/rate-limit'
import { LIMITS, parseId, parseText } from '@/server/validate'

function toCommentDto(c: typeof comments.$inferSelect) {
  return {
    id: c.id,
    author: { id: c.participantId, nickname: c.nickname },
    text: c.text,
    createdAt: c.createdAt.toISOString(),
  }
}

export const Route = createFileRoute('/api/posts/$postId/comments')({
  server: {
    handlers: {
      GET: handle(async ({ params }) => {
        const postId = parseId(params.postId)
        const rows = await db
          .select()
          .from(comments)
          .where(eq(comments.postId, postId))
          .orderBy(asc(comments.createdAt))
          .limit(200)
        return json({ comments: rows.map(toCommentDto) })
      }),

      POST: handle(async ({ request, params }) => {
        assertSameOrigin(request)
        const me = await requireParticipant(request)
        const postId = parseId(params.postId)
        const text = parseText((await readJson(request)).text, LIMITS.commentText, 'O comentário')
        if (!text) throw new HttpError(400, 'Escreva algo antes de comentar.', 'empty_comment')

        const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1)
        if (!post) throw new HttpError(404, 'Esta ação não existe mais.', 'not_found')

        await rateLimit(`comment:${me.id}`, 20, 5 * 60)
        const [row] = await db
          .insert(comments)
          .values({ postId, participantId: me.id, nickname: me.nickname, text })
          .returning()
        return json({ comment: toCommentDto(row) }, { status: 201 })
      }),
    },
  },
})
