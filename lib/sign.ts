import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.PLACES_SIGNING_SECRET || ''

/**
 * Canonicalize a JSON value so two structurally-equal objects produce
 * the same string regardless of key order. Required for HMAC stability.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  )
}

export function signPayload(payload: unknown): string {
  if (!SECRET) return ''
  return createHmac('sha256', SECRET).update(canonicalize(payload)).digest('hex')
}

export function verifyPayload(payload: unknown, signature: unknown): boolean {
  if (!SECRET) {
    // Signing not configured — fail closed in production, open in dev so local testing works.
    return process.env.NODE_ENV !== 'production'
  }
  if (typeof signature !== 'string' || signature.length !== 64) return false
  const expected = signPayload(payload)
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(signature, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
