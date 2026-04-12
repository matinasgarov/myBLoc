import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isRateLimited, extractIp, isCrossOrigin } from '@/lib/ratelimit'

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const MAX_MESSAGE_LENGTH = 5000

export async function POST(req: NextRequest) {
  // Env var checks inside handler — missing vars return 503, not a cold-start crash
  if (!process.env.RESEND_API_KEY || !process.env.FEEDBACK_EMAIL) {
    console.error('[feedback] Missing RESEND_API_KEY or FEEDBACK_EMAIL env var')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (isCrossOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const ip = extractIp(req)
  if (isRateLimited(ip, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const message = body.message.trim()
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    )
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Anonim'

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
  if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }
  const email = rawEmail

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'myblocate Feedback <onboarding@resend.dev>',
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
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
