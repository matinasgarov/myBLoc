import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Anonim'
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = body.message.trim()

  const { error } = await resend.emails.send({
    from: 'myblocate Feedback <onboarding@resend.dev>',
    to: 'matinasgarov21@gmail.com',
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
