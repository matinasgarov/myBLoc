/**
 * Cloudflare Turnstile (CAPTCHA) verification.
 * No-op (returns true) when TURNSTILE_SECRET is not configured, so local dev
 * and un-configured environments work without the widget. Set the secret
 * in production to enforce.
 */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) return true
  if (typeof token !== 'string' || !token || token.length > 2048) return false

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (ip && ip !== 'unknown') form.set('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
