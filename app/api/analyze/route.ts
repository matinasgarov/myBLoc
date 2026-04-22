import { NextRequest, NextResponse } from 'next/server'
import { analyzeLocation } from '@/lib/groq'
import { calculateScore, isLuxuryBusiness } from '@/lib/score'
import { isRateLimited, isRateLimitedDaily, extractIp, extractRateKey, isCrossOrigin, tooLarge } from '@/lib/ratelimit'
import { verifyPayload } from '@/lib/sign'
import { findDistrict } from '@/lib/baku-districts'
import { estimateRent } from '@/lib/rent'
import { isInsideLake } from '@/lib/lakes'

const RESTRICTED_LAND_USE = new Set([
  'cemetery', 'grave_yard', 'military',
  'water', 'coastline', 'river', 'lake', 'stream', 'canal',
  'reservoir', 'basin',
])

const MAX_BODY_BYTES = 50_000
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
  const ip = extractIp(req)
  const rateKey = extractRateKey(req)
  if (await isRateLimited(rateKey, 10, 60_000, 'analyze-min')) {
    return json({ error: 'Too many requests' }, 429)
  }
  if (await isRateLimitedDaily(ip, 100, 'analyze-day')) {
    return json({ error: 'Daily limit reached' }, 429)
  }
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    body.lat < -90 || body.lat > 90 ||
    body.lng < -180 || body.lng > 180 ||
    typeof body.businessType !== 'string' ||
    body.businessType.trim().length < 2 ||
    body.businessType.length > 100 ||
    typeof body.placesContext !== 'object' ||
    body.placesContext === null ||
    Array.isArray(body.placesContext)
  ) {
    return json(
      { error: 'lat, lng, businessType, and placesContext are required' },
      400
    )
  }

  // Verify placesContext was produced by our /api/places (not tampered with client-side).
  const { _sig, ...contextNoSig } = body.placesContext as { _sig?: unknown } & Record<string, unknown>
  const bt = body.businessType.trim()
  if (!verifyPayload({ lat: body.lat, lng: body.lng, businessType: bt, context: contextNoSig }, _sig)) {
    return json({ error: 'Invalid signature' }, 400)
  }
  body.placesContext = contextNoSig

  // Block pins inside lake polygons (coordinate dataset check)
  try {
    if (isInsideLake(body.lat, body.lng)) {
      return json({ error: 'LAKE_ZONE' }, 422)
    }
  } catch (lakeErr) {
    console.error('[analyze] lake check failed:', lakeErr)
    // File read error — fail open (do not block the user, log for investigation)
  }

  // Block analysis for restricted land use zones (OSM-based)
  const landUse: string | null = body.placesContext.landUse ?? null
  if (landUse && RESTRICTED_LAND_USE.has(landUse)) {
    return json({ error: 'RESTRICTED_ZONE' }, 422)
  }

  try {
    const cuisineMatch: string | undefined = body.cuisineMatch ?? undefined
    const { score, factors } = calculateScore(
      body.placesContext,
      body.lat,
      body.lng,
      body.businessType,
      cuisineMatch,
    )
    const district = findDistrict(body.lat, body.lng)
    const rent = estimateRent(
      district,
      body.placesContext.metroDistance,
      body.placesContext.metroRidership,
      body.placesContext.areaType,
    )
    const lang: string = body.lang === 'en' ? 'en' : 'az'
    const result = await analyzeLocation(body.lat, body.lng, body.businessType, body.placesContext, score, district, rent, lang)

    // Feature 4: luxury business in low-wealth district
    const luxuryMismatch =
      isLuxuryBusiness(body.businessType) &&
      district !== null &&
      (district.wealth === 'Low' || district.wealth === 'Below Average')

    return json({
      ...result,
      factors,
      districtName: district?.name ?? null,
      districtPopulationK: district?.populationK ?? null,
      rentTier: rent.tier,
      rentTierAz: rent.tierAz,
      rentFactors: rent.factorsAz,
      luxuryMismatch,
    })
  } catch (err) {
    console.error('[analyze] analyzeLocation failed:', err)
    return json({ error: 'Analysis failed' }, 500)
  }
}
