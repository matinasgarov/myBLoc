import { NextRequest, NextResponse } from 'next/server'
import { analyzeLocation } from '@/lib/groq'
import { calculateScore, isLuxuryBusiness } from '@/lib/score'
import { isRateLimited, extractIp, isCrossOrigin } from '@/lib/ratelimit'
import { findDistrict } from '@/lib/baku-districts'
import { estimateRent } from '@/lib/rent'

const RESTRICTED_LAND_USE = new Set(['cemetery', 'grave_yard', 'military'])

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const ip = extractIp(req)
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

  // Fix 1: Block analysis for restricted land use zones
  const landUse: string | null = body.placesContext.landUse ?? null
  if (landUse && RESTRICTED_LAND_USE.has(landUse)) {
    return NextResponse.json({ error: 'RESTRICTED_ZONE' }, { status: 422 })
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
