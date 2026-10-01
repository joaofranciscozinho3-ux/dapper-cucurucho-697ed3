import { sql } from 'drizzle-orm'
import { comments, posts } from '../../db/schema.js'
import { imageUrl } from './images'

export const postColumns = {
  id: posts.id,
  participantId: posts.participantId,
  nickname: posts.nickname,
  imageKey: posts.imageKey,
  text: posts.text,
  createdAt: posts.createdAt,
  commentCount: sql<number>`(select count(*)::int from ${comments} where ${comments.postId} = ${posts.id})`,
}

type Row = {
  id: string
  participantId: string
  nickname: string
  imageKey: string | null
  text: string
  createdAt: Date
  commentCount: number
}

export function toPostDto(row: Row, viewerId: string | null) {
  return {
    id: row.id,
    author: { id: row.participantId, nickname: row.nickname },
    imageUrl: imageUrl(row.imageKey),
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    commentCount: Number(row.commentCount),
    isMine: viewerId === row.participantId,
  }
}
