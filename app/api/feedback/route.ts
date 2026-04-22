import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isRateLimited, isRateLimitedDaily, extractIp, extractRateKey, isCrossOrigin, tooLarge } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const MAX_MESSAGE_LENGTH = 5000
const MAX_NAME_LENGTH = 80
const MAX_BODY_BYTES = 10_000
const NO_STORE = { 'Cache-Control': 'no-store, private' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

/** Remove control chars (prevents header/subject injection) and cap length. */
function sanitizeLine(s: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY || !process.env.FEEDBACK_EMAIL) {
    console.error('[feedback] Missing RESEND_API_KEY or FEEDBACK_EMAIL env var')
    return json({ error: 'Service unavailable' }, 503)
  }

  if (isCrossOrigin(req)) {
    return json({ error: 'Forbidden' }, 403)
  }
  if (tooLarge(req, MAX_BODY_BYTES)) {
    return json({ error: 'Payload too large' }, 413)
  }
  const ip = extractIp(req)
  const rateKey = extractRateKey(req)
  if (await isRateLimited(rateKey, 5, 60_000, 'feedback-min')) {
    return json({ error: 'Too many requests' }, 429)
  }
  if (await isRateLimitedDaily(ip, 20, 'feedback-day')) {
    return json({ error: 'Daily limit reached' }, 429)
  }

  const body = await req.json().catch(() => null)

  if (!body || typeof body !== 'object' || typeof body.message !== 'string' || !body.message.trim()) {
    return json({ error: 'Message is required' }, 400)
  }

  // Turnstile verification (no-op when TURNSTILE_SECRET is unset)
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return json({ error: 'Captcha verification failed' }, 403)
  }

  // Honeypot: real users never fill this field. Silently accept to avoid tipping off bots.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true })
  }

  const message = body.message.trim()
  if (message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` }, 400)
  }

  const rawName = typeof body.name === 'string' ? body.name : ''
  const name = sanitizeLine(rawName, MAX_NAME_LENGTH) || 'Anonim'

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
  if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
    return json({ error: 'Invalid email format' }, 400)
  }
  const email = sanitizeLine(rawEmail, 320)

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'myblocate Feedback <onboarding@resend.dev>',
    to: process.env.FEEDBACK_EMAIL,
    subject: `Yeni rəy — ${name}`,
    text: [
      `Ad: ${name}`,
      email ? `E-poçt: ${email}` : '',
      '',
      message,
    ].filter(Boolean).join('\n'),
  })

  if (error) {
    console.error('[feedback] Resend error:', error)
    return json({ error: 'Send failed' }, 500)
  }

  return json({ ok: true })
}
