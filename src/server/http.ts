export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
  ) {
    super(message)
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Cache-Control', 'no-store')
  return Response.json(data, { ...init, headers })
}

type HandlerCtx = { request: Request; params: Record<string, string> }

/** Wraps a handler so thrown HttpErrors become JSON error responses. */
export function handle(fn: (ctx: HandlerCtx) => Promise<Response>) {
  return async (ctx: HandlerCtx) => {
    try {
      return await fn(ctx)
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, code: err.code }, { status: err.status })
      }
      console.error(err)
      return json(
        { error: 'Algo deu errado no servidor. Tente novamente.', code: 'server_error' },
        { status: 500 },
      )
    }
  }
}

/** Rejects cross-site writes: browsers always send Origin on POST/PATCH/DELETE. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return
  const hosts = [request.headers.get('host'), request.headers.get('x-forwarded-host'), new URL(request.url).host]
  try {
    if (!hosts.includes(new URL(origin).host)) throw new Error()
  } catch {
    throw new HttpError(403, 'Origem não permitida.', 'forbidden_origin')
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (body && typeof body === 'object') return body as Record<string, unknown>
  } catch {}
  throw new HttpError(400, 'Requisição inválida.', 'bad_request')
}
