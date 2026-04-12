const requests = new Map<string, { count: number; resetAt: number }>()

const ALLOWED_ORIGINS = ['myblocate.az', 'www.myblocate.az', 'localhost']

/**
 * Returns true if the request originates from an untrusted external site.
 * Allows requests with no Origin header (e.g. server-to-server, curl).
 */
export function isCrossOrigin(req: { headers: { get(key: string): string | null } }): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false // no Origin = non-browser or same-origin navigation
  try {
    const host = new URL(origin).hostname
    return !ALLOWED_ORIGINS.includes(host)
  } catch {
    return true // malformed Origin → treat as cross-origin
  }
}

/**
 * Extracts the client IP from an X-Forwarded-For header safely.
 * Takes the rightmost value to prevent spoofing via prepended fake IPs.
 */
export function extractIp(req: { headers: { get(key: string): string | null } }): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const rightmost = xff.split(',').pop()?.trim()
    if (rightmost) return rightmost
  }
  return 'unknown'
}

/**
 * Simple in-memory rate limiter.
 * @param ip - client IP string
 * @param limit - max requests per window
 * @param windowMs - window duration in ms
 * @returns true if the request should be blocked
 */
export function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Purge all expired entries to prevent unbounded memory growth
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
