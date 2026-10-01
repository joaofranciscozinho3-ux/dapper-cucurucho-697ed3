import { HttpError } from './http'

export const LIMITS = {
  nicknameMin: 2,
  nicknameMax: 24,
  postText: 1000,
  commentText: 500,
  imageBytes: 5 * 1024 * 1024,
  recoveryMin: 8,
  recoveryMax: 64,
} as const

// Strip control characters (keeping newlines) and normalise whitespace.
function clean(value: unknown, keepNewlines: boolean) {
  if (typeof value !== 'string') return ''
  let s = value.normalize('NFC').replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
  s = keepNewlines ? s.replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ')
  return s.trim()
}

export function parseNickname(value: unknown) {
  const nick = clean(value, false)
  if (nick.length < LIMITS.nicknameMin || nick.length > LIMITS.nicknameMax) {
    throw new HttpError(
      400,
      `O nome precisa ter entre ${LIMITS.nicknameMin} e ${LIMITS.nicknameMax} caracteres.`,
      'invalid_nickname',
    )
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(nick)) {
    throw new HttpError(400, 'Use apenas letras, números, espaço, ponto, _ ou -.', 'invalid_nickname')
  }
  return nick
}

/**
 * Recovery keys are meant to be remembered, so they are forgiving: case,
 * accents and separators (space, hyphen, dot, underscore) don't matter.
 * "Gato-Azul na Praia" and "gato azul na praia" are the same key.
 */
export function normalizeRecoveryKey(value: unknown) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s._-]+/g, ' ')
    .trim()
}

export function parseRecoveryKey(value: unknown) {
  const key = normalizeRecoveryKey(value)
  if (key.length < LIMITS.recoveryMin || key.length > LIMITS.recoveryMax) {
    throw new HttpError(
      400,
      `A chave precisa ter entre ${LIMITS.recoveryMin} e ${LIMITS.recoveryMax} caracteres.`,
      'invalid_recovery_key',
    )
  }
  if (!/^[a-z0-9 ]+$/.test(key)) {
    throw new HttpError(400, 'Use apenas letras, números e espaços na chave.', 'invalid_recovery_key')
  }
  if (!key.includes(' ') && key.length < 12) {
    throw new HttpError(
      400,
      'Chave fácil demais de adivinhar. Use pelo menos duas palavras, ex.: “gato azul na praia”.',
      'weak_recovery_key',
    )
  }
  if (new Set(key.replace(/ /g, '')).size < 4) {
    throw new HttpError(400, 'Chave fácil demais de adivinhar. Misture letras diferentes.', 'weak_recovery_key')
  }
  return key
}

export function parseText(value: unknown, max: number, label: string) {
  const text = clean(value, true)
  if (text.length > max) {
    throw new HttpError(400, `${label} pode ter no máximo ${max} caracteres.`, 'text_too_long')
  }
  return text
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseId(value: unknown) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(404, 'Não encontrado.', 'not_found')
  }
  return value.toLowerCase()
}

/** Detects the real image type from magic bytes — the declared MIME type is not trusted. */
export function sniffImage(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) return 'image/png'
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp'
  return null
}
