import { createFileRoute } from '@tanstack/react-router'
import { imageStore } from '@/server/images'
import { parseId, sniffImage } from '@/server/validate'

// Serves post photos from Netlify Blobs. Read-only: uploads only happen
// through the authenticated post creation endpoint.
export const Route = createFileRoute('/api/images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let key: string
        try {
          key = parseId(params.key)
        } catch {
          return new Response('Not found', { status: 404 })
        }
        const data = await imageStore().get(key, { type: 'arrayBuffer' })
        if (!data) return new Response('Not found', { status: 404 })
        const type = sniffImage(new Uint8Array(data))
        if (!type) return new Response('Not found', { status: 404 })
        return new Response(data, {
          headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
