const requests = new Map<string, { count: number; resetAt: number }>()

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
