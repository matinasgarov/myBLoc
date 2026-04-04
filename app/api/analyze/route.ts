import { NextRequest, NextResponse } from 'next/server'
import { analyzeLocation } from '@/lib/groq'
import { calculateScore } from '@/lib/score'
import { isRateLimited } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (isRateLimited(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !body.businessType ||
    !body.placesContext
  ) {
    return NextResponse.json(
      { error: 'lat, lng, businessType, and placesContext are required' },
      { status: 400 }
    )
  }
  try {
    const { score, factors } = calculateScore(body.placesContext)
    const result = await analyzeLocation(body.lat, body.lng, body.businessType, body.placesContext, score)
    return NextResponse.json({ ...result, factors })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
