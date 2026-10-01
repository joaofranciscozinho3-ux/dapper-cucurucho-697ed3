import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// A participant is an anonymous, persistent identity. The device keeps a random
// secret token; only its SHA-256 hash is stored here.
export const participants = pgTable('participants', {
  id: uuid().primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  nickname: text().notNull(),
  // Memorable recovery key chosen by the participant (deterministic scrypt hash,
  // so it can be looked up). Null until they create one.
  recoveryHash: text('recovery_hash').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Extra devices signed in with the recovery key. Each keeps its own secret
// token so restoring on a new device never signs the old one out.
export const devices = pgTable(
  'devices',
  {
    id: uuid().primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('devices_participant_idx').on(t.participantId)],
)

export const posts = pgTable(
  'posts',
  {
    id: uuid().primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    nickname: text().notNull(),
    imageKey: text('image_key'),
    text: text().notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('posts_created_at_idx').on(t.createdAt),
    index('posts_participant_idx').on(t.participantId),
  ],
)

export const comments = pgTable(
  'comments',
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    nickname: text().notNull(),
    text: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_post_idx').on(t.postId, t.createdAt)],
)

// Sliding-window rate limiting for writes (posts, comments, new identities).
export const rateEvents = pgTable(
  'rate_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rate_events_key_idx').on(t.key, t.createdAt)],
)
