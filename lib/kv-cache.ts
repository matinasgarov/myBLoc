import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    redis = new Redis({ url, token })
    return redis
  }
  return null
}

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis()
    if (!r) return null
    return await r.get<T>(key)
  } catch {
    return null
  }
}

export async function kvSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const r = getRedis()
    if (!r) return
    await r.set(key, value, { ex: ttlSeconds })
  } catch {
    // silent — cache write failure should never break the request
  }
}
