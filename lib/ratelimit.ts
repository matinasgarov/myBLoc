import { getRedis } from './kv-cache'

const requests = new Map<string, { count: number; resetAt: number }>()

const PROD_ORIGINS = ['myblocate.com', 'www.myblocate.com']
const DEV_ORIGINS = ['localhost', '127.0.0.1']

function allowedOrigins(): string[] {
  return process.env.NODE_ENV === 'production'
    ? PROD_ORIGINS
    : [...PROD_ORIGINS, ...DEV_ORIGINS]
}

/**
 * Returns true if the request originates from an untrusted external site.
 * Allows requests with no Origin header (e.g. server-to-server, curl).
 */
export function isCrossOrigin(req: { headers: { get(key: string): string | null } }): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    const host = new URL(origin).hostname
    return !allowedOrigins().includes(host)
  } catch {
    return true
  }
}

/**
 * Extracts the client IP. Prefers platform-set trusted headers
 * (Netlify/Vercel) and falls back to the leftmost X-Forwarded-For entry,
 * which is the original client when XFF is appended by trusted proxies.
 */
export function extractIp(req: { headers: { get(key: string): string | null } }): string {
  const netlify = req.headers.get('x-nf-client-connection-ip')
  if (netlify) return netlify.trim()
  const vercel = req.headers.get('x-real-ip')
  if (vercel) return vercel.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const leftmost = xff.split(',')[0]?.trim()
    if (leftmost) return leftmost
  }
  return 'unknown'
}

/**
 * Rate-limit bucket key that combines IP + a coarse UA fingerprint.
 * This reduces the blast radius when many users share an IP (NAT, mobile carriers),
 * while still limiting a single abuser on their own IP.
 */
export function extractRateKey(req: { headers: { get(key: string): string | null } }): string {
  const ip = extractIp(req)
  const ua = (req.headers.get('user-agent') || '').slice(0, 80)
  const lang = (req.headers.get('accept-language') || '').slice(0, 20)
  // Short stable hash — avoid storing full UA strings in Redis keys.
  let h = 0
  const s = ua + '|' + lang
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return `${ip}:${(h >>> 0).toString(36)}`
}

function inMemoryLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  for (const [key, val] of requests) {
    if (now > val.resetAt) requests.delete(key)
  }
  const entry = requests.get(ip)
  if (!entry) {
    requests.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

/**
 * Rate limiter. Uses Upstash Redis when configured (persists across serverless
 * invocations); falls back to in-memory map otherwise. Fail-open on Redis errors.
 */
export async function isRateLimited(ip: string, limit: number, windowMs: number, scope = 'rl'): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return inMemoryLimited(`${scope}:${ip}`, limit, windowMs)

  const windowSec = Math.ceil(windowMs / 1000)
  // Bucket the key by window so entries self-expire cleanly.
  const bucket = Math.floor(Date.now() / windowMs)
  const key = `${scope}:${ip}:${bucket}`
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSec)
    return count > limit
  } catch {
    return inMemoryLimited(`${scope}:${ip}`, limit, windowMs)
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
export function isRateLimitedDaily(ip: string, limit: number, scope = 'rld'): Promise<boolean> {
  return isRateLimited(ip, limit, DAY_MS, scope)
}

/**
 * Returns 413 response if the request body exceeds maxBytes (by Content-Length).
 */
export function tooLarge(req: { headers: { get(key: string): string | null } }, maxBytes: number): boolean {
  const cl = req.headers.get('content-length')
  if (!cl) return false
  const n = Number(cl)
  return Number.isFinite(n) && n > maxBytes
}
