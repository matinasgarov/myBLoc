import { NextRequest, NextResponse } from 'next/server'
import { fetchPlacesContext } from '@/lib/overpass'
import { isRateLimited, extractRateKey, isCrossOrigin, tooLarge } from '@/lib/ratelimit'
import { signPayload } from '@/lib/sign'

const MAX_BODY_BYTES = 4_000
const NO_STORE = { 'Cache-Control': 'no-store, private' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req)) {
    return json({ error: 'Forbidden' }, 403)
  }
  if (tooLarge(req, MAX_BODY_BYTES)) {
    return json({ error: 'Payload too large' }, 413)
  }
  const rateKey = extractRateKey(req)
  if (await isRateLimited(rateKey, 10, 60_000, 'places-min')) {
    return json({ error: 'Too many requests' }, 429)
  }
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    typeof body.businessType !== 'string'
  ) {
    return json(
      { error: 'lat, lng, and businessType are required' },
      400
    )
  }
  if (body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
    return json({ error: 'Invalid coordinates' }, 400)
  }
  const bt = body.businessType.trim()
  if (bt.length < 2 || bt.length > 100) {
    return json({ error: 'Invalid business type' }, 400)
  }
  if (!/[\p{L}]{2,}/u.test(bt)) {
    return json({ error: 'Invalid business type' }, 400)
  }
  try {
    const context = await fetchPlacesContext(body.lat, body.lng, bt)
    // Sign (lat, lng, businessType, context) so /api/analyze can trust the client-echoed payload.
    const _sig = signPayload({ lat: body.lat, lng: body.lng, businessType: bt, context })
    return json({ ...context, _sig })
  } catch (err) {
    console.error('[places] fetchPlacesContext failed:', err)
    return json({ error: 'Location analysis failed' }, 500)
  }
}
