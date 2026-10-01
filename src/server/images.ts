import { getStore } from '@netlify/blobs'

// Strong consistency so an image is readable by every participant the moment
// its post is created.
export function imageStore() {
  return getStore({ name: 'post-images', consistency: 'strong' })
}

export function imageUrl(key: string | null) {
  return key ? `/api/images/${key}` : null
}
