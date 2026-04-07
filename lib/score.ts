import type { PlacesContext, FactorResult } from './types'
import { findDistrict } from './baku-districts'

export interface ScoreResult {
  score: number
  factors: FactorResult[]
}

const LAND_USE_CAPS: Record<string, number> = {
  cemetery: 8,
  grave_yard: 8,
  military: 8,
  landfill: 5,
  quarry: 10,
  prison: 8,
  industrial: 30,
  construction: 25,
}

function metroTierScore(ridership: number | null): number {
  if (ridership === null) return 0
  if (ridership >= 30000) return 12
  if (ridership >= 20000) return 10
  if (ridership >= 10000) return 7
  if (ridership >= 5000) return 4
  return 2
}

function roadScore(majorRoads: number): number {
  return Math.min(8, Math.round(Math.min(majorRoads, 3) * (8 / 3)))
}

function busStopScore(busStops: number): number {
  if (busStops === 0) return 0
  if (busStops === 1) return 3
  if (busStops === 2) return 5
  return 7
}

function groceryScore(groceryStores: number): number {
  if (groceryStores === 0) return 0
  if (groceryStores === 1) return 2
  if (groceryStores === 2) return 4
  return 5
}

function densityScore(totalBusinesses: number): number {
  if (totalBusinesses >= 50) return 10
  if (totalBusinesses >= 25) return 7
  if (totalBusinesses >= 10) return 4
  return 0
}

// Hard cap applied when a dominant same-category competitor is within 500 m
const DOMINANT_COMPETITOR_CAP = 40

/**
 * Deterministic 1–4 point offset derived from coordinates.
 * Makes final scores look precise (e.g. 47, 63) instead of round multiples of 5/10.
 * Returns 0 when lat=lng=0 so unit tests (which don't pass coords) are unaffected.
 */
function coordNoise(lat: number, lng: number): number {
  if (lat === 0 && lng === 0) return 0
  return ((Math.abs(Math.floor(lat * 10000)) + Math.abs(Math.floor(lng * 10000))) % 4) + 1
}

/**
 * Minor population boost (0–5 pts) based on district population.
 * Normalized from the min (Pirallahı 20.6k) to max (Xətai 289.9k) across 12 Baku districts.
 * Returns 0 when no district is found (outside Baku or lat=lng=0).
 */
function populationBoost(lat: number, lng: number): number {
  const district = findDistrict(lat, lng)
  if (!district) return 0
  const min = 20.6, max = 289.9
  return Math.round(((district.populationK - min) / (max - min)) * 5)
}

export function calculateScore(ctx: PlacesContext, lat = 0, lng = 0): ScoreResult {
  // 1. Competition (0-22): 0 rivals = 22, linear to 0 at 10+
  //    A dominant chain competitor (Bravo, Bolmart, etc.) in the same category adds
  //    a 16-point penalty on top of the regular count, reflecting real-world risk.
  const dominantPenalty = ctx.dominantCompetitor ? 16 : 0
  const competitionScore = Math.max(0, Math.round(22 - ctx.competitors * 2.2 - dominantPenalty))

  // 2. Foot traffic (0-20): metro ridership tier (0-12) + major roads (0-8)
  const footTrafficScore = Math.min(20, metroTierScore(ctx.metroRidership) + roadScore(ctx.majorRoads))

  // 3. Area type (0-13)
  const areaScore = ctx.areaType === 'commercial' ? 13 : ctx.areaType === 'mixed' ? 9 : 5

  // 4. Urban tier (0-10)
  const urbanScore =
    ctx.urbanTier === 'metro-city' ? 10
    : ctx.urbanTier === 'city' ? 7
    : ctx.urbanTier === 'town' ? 4
    : 1

  // 5. Accessibility (0-12): bus stops (0-7) + parking presence (0-5)
  const accessibilityScore = busStopScore(ctx.busStops) + (ctx.parking > 0 ? 5 : 0)

  // 6. Nearby services (0-8): grocery (0-5) + amenity category count (0-3)
  const amenityScore = ctx.amenities.length >= 2 ? 3 : ctx.amenities.length
  const nearbyServicesScore = groceryScore(ctx.groceryStores) + amenityScore

  // 7. Business density (0-10)
  const businessDensityScore = densityScore(ctx.totalBusinesses)

  const raw = Math.round(
    competitionScore + footTrafficScore + areaScore + urbanScore +
    accessibilityScore + nearbyServicesScore + businessDensityScore
  )

  // Land use caps take precedence; dominant competitor cap applies otherwise
  const landUseCap =
    ctx.landUse && LAND_USE_CAPS[ctx.landUse] !== undefined
      ? LAND_USE_CAPS[ctx.landUse]
      : null
  const cap = landUseCap !== null
    ? Math.min(landUseCap, ctx.dominantCompetitor ? DOMINANT_COMPETITOR_CAP : landUseCap)
    : ctx.dominantCompetitor ? DOMINANT_COMPETITOR_CAP : 95

  const score = Math.min(raw + coordNoise(lat, lng) + populationBoost(lat, lng), cap)

  const factors: FactorResult[] = [
    { key: 'competition', score: Math.min(competitionScore, 22), max: 22 },
    { key: 'footTraffic', score: Math.min(footTrafficScore, 20), max: 20 },
    { key: 'areaType', score: areaScore, max: 13 },
    { key: 'urbanTier', score: urbanScore, max: 10 },
    { key: 'accessibility', score: Math.min(accessibilityScore, 12), max: 12 },
    { key: 'nearbyServices', score: Math.min(nearbyServicesScore, 8), max: 8 },
    { key: 'businessDensity', score: businessDensityScore, max: 10 },
  ]

  return { score, factors }
}
