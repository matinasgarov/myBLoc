import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isRateLimited } from '@/lib/ratelimit'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}
if (!process.env.FEEDBACK_EMAIL) {
  throw new Error('FEEDBACK_EMAIL environment variable is not set')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (isRateLimited(ip, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Anonim'
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = body.message.trim()

  const { error } = await resend.emails.send({
    from: 'myblocate Feedback <onboarding@resend.dev>',
    to: process.env.FEEDBACK_EMAIL!,
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
