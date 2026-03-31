import { NextRequest, NextResponse } from 'next/server'
import { analyzeLocation } from '@/lib/groq'

export async function POST(req: NextRequest) {
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
    const result = await analyzeLocation(body.lat, body.lng, body.businessType, body.placesContext)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
