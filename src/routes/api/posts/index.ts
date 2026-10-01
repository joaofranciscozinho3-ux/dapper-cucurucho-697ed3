import { createFileRoute } from '@tanstack/react-router'
import { and, count, desc, eq, lt } from 'drizzle-orm'
import { db } from '../../../../db/index.js'
import { posts } from '../../../../db/schema.js'
import { assertSameOrigin, handle, HttpError, json } from '@/server/http'
import { currentParticipant, requireParticipant } from '@/server/identity'
import { imageStore } from '@/server/images'
import { postColumns, toPostDto } from '@/server/posts'
import { rateLimit } from '@/server/rate-limit'
import { LIMITS, parseId, parseText, sniffImage } from '@/server/validate'

const PAGE_SIZE = 15

export const Route = createFileRoute('/api/posts/')({
  server: {
    handlers: {
      // Public shared feed (optionally filtered to one participant).
      GET: handle(async ({ request }) => {
        const url = new URL(request.url)
        const viewer = await currentParticipant(request)
        const filters = []
        const author = url.searchParams.get('author')
        if (author) filters.push(eq(posts.participantId, parseId(author)))
        const before = url.searchParams.get('before')
        if (before) {
          const d = new Date(before)
          if (!Number.isNaN(d.getTime())) filters.push(lt(posts.createdAt, d))
        }
        const rows = await db
          .select(postColumns)
          .from(posts)
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(posts.createdAt))
          .limit(PAGE_SIZE + 1)

        let total: number | undefined
        if (author) {
          const [{ n }] = await db
            .select({ n: count() })
            .from(posts)
            .where(eq(posts.participantId, parseId(author)))
          total = n
        }
        const page = rows.slice(0, PAGE_SIZE)
        return json({
          posts: page.map((r) => toPostDto(r, viewer?.id ?? null)),
          nextBefore: rows.length > PAGE_SIZE ? page[page.length - 1].createdAt.toISOString() : null,
          total,
        })
      }),

      // Create a post: multipart form with optional `image` file and `text`.
      POST: handle(async ({ request }) => {
        assertSameOrigin(request)
        const me = await requireParticipant(request)
        const declared = Number(request.headers.get('content-length') ?? 0)
        if (declared > LIMITS.imageBytes + 64 * 1024) {
          throw new HttpError(413, 'A foto é grande demais (máx. 5 MB).', 'too_large')
        }

        let form: FormData
        try {
          form = await request.formData()
        } catch {
          throw new HttpError(400, 'Envio inválido.', 'bad_request')
        }
        const text = parseText(form.get('text'), LIMITS.postText, 'O texto')
        const file = form.get('image')
        let bytes: Uint8Array | null = null
        if (file && typeof file !== 'string' && file.size > 0) {
          if (file.size > LIMITS.imageBytes) {
            throw new HttpError(413, 'A foto é grande demais (máx. 5 MB).', 'too_large')
          }
          bytes = new Uint8Array(await file.arrayBuffer())
          if (!sniffImage(bytes)) {
            throw new HttpError(415, 'Formato de imagem não suportado. Use JPG, PNG ou WebP.', 'bad_image')
          }
        }
        if (!bytes && !text) {
          throw new HttpError(400, 'Adicione uma foto ou um texto sobre a sua ação.', 'empty_post')
        }

        await rateLimit(`post:${me.id}`, 12, 10 * 60)

        const imageKey = bytes ? crypto.randomUUID() : null
        if (bytes && imageKey) await imageStore().set(imageKey, bytes.buffer as ArrayBuffer)

        try {
          const [row] = await db
            .insert(posts)
            .values({ participantId: me.id, nickname: me.nickname, imageKey, text })
            .returning()
          return json({ post: toPostDto({ ...row, commentCount: 0 }, me.id) }, { status: 201 })
        } catch (err) {
          if (imageKey) await imageStore().delete(imageKey).catch(() => {})
          throw err
        }
      }),
    },
  },
})
