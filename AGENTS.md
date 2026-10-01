# AGENTS.md

Elaine is a public, multi-user mobile web app where participants post evidence of concrete actions
(photo and/or text) to one shared feed, comment, and delete their own posts. UI copy is Brazilian Portuguese.

## Stack

TanStack Start (React 19) + Vite 7 + Tailwind CSS 4, deployed on Netlify.
Data: Netlify Database (Postgres) via Drizzle ORM (`drizzle-orm@beta`). Images: Netlify Blobs (store `post-images`).

## Layout

```
db/schema.ts, db/index.ts        Drizzle schema + client (participants, devices, posts, comments, rate_events)
netlify/database/migrations/     Generated migrations — never edit applied ones; regenerate via drizzle-kit
src/server/                      Server-only helpers: identity (token auth), http (errors, origin check),
                                 validate (text/nickname/image magic bytes), rate-limit, images, posts DTO
src/routes/api/                  Server routes (the REST API) — see README for the table
src/routes/index.tsx             Feed ("Início")
src/routes/registrar.tsx         Create action (camera, gallery, upload)
src/routes/perfil.tsx            Profile, rename, recovery code
src/components/AppGate.tsx       Picks splash / offline / onboarding / app based on identity status
src/lib/                         Client: api fetch wrapper, identity context, usePosts, image compression, toasts
```

## Identity model (important)

- No login. `POST /api/session` creates a participant and returns a random 256-bit token. Only its
  SHA-256 hash is stored (`participants.token_hash`).
- The token is set as an HttpOnly cookie (`elaine_id`, ~400 days) **and** stored in localStorage
  (`elaine.identity.v1`) and sent as `Authorization: Bearer`. Either one resolves the identity.
- The token is internal. The user-visible "chave de recuperação" is a memorable phrase the participant
  chooses (at onboarding, or via `PUT /api/recovery-key`). It is normalised (case/accents/separators
  ignored), hashed with scrypt + a fixed salt into `participants.recovery_hash` (unique, so it can be looked up).
- `POST /api/restore` with the key mints a new device token in `devices`, so other devices stay signed in.
  Legacy device tokens are still accepted there as a fallback.
- IP addresses are never used for identity; a hashed IP is used only to throttle identity creation.

## Conventions

- Every write endpoint: `assertSameOrigin`, `requireParticipant`, server-side validation, `rateLimit`.
- Ownership checks live on the server (delete uses `WHERE id AND participant_id`).
- Wrap handlers in `handle()` and throw `HttpError(status, messagePt, code)`; messages are shown to users.
- Buttons are always filled (`.btn` + `.btn-primary|dark|soft|sun|danger` in `src/styles.css`). No ghost buttons.
- Design tokens are Tailwind theme colors in `src/styles.css` (paper, ink, moss, signal, sun, leaf, danger).
- Nickname is denormalised onto posts/comments and updated on rename.
