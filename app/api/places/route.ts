import { NextRequest, NextResponse } from 'next/server'
import { fetchPlacesContext } from '@/lib/overpass'
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
    !body.businessType
  ) {
    return NextResponse.json(
      { error: 'lat, lng, and businessType are required' },
      { status: 400 }
    )
  }
  if (body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }
  const bt = (body.businessType as string).trim()
  if (bt.length < 2 || bt.length > 100) {
    return NextResponse.json({ error: 'Invalid business type' }, { status: 400 })
  }
  if (!/[\p{L}]{2,}/u.test(bt)) {
    return NextResponse.json({ error: 'Invalid business type' }, { status: 400 })
  }
  try {
    const context = await fetchPlacesContext(body.lat, body.lng, bt)
    return NextResponse.json(context)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
