import type { OSMElement, PlacesContext } from './types'
import { countAzCompetitors } from './az-competitors'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const RADIUS = 500

function buildLandUseQuery(lat: number, lng: number): string {
  return (
    `[out:json][timeout:10];` +
    `is_in(${lat},${lng})->.here;` +
    `(way(pivot.here)["landuse"];relation(pivot.here)["landuse"];` +
    `way(pivot.here)["amenity"~"^(grave_yard|prison)$"];` +
    `way(pivot.here)["leisure"~"^(nature_reserve|cemetery)$"];);` +
    `out tags;`
  )
}

function buildQuery(lat: number, lng: number): string {
  const r = RADIUS
  return (
    `[out:json][timeout:30];` +
    `(` +
    `node["shop"](around:${r},${lat},${lng});` +
    `node["amenity"](around:${r},${lat},${lng});` +
    `node["leisure"](around:${r},${lat},${lng});` +
    `node["office"](around:${r},${lat},${lng});` +
    `node["highway"="bus_stop"](around:${r},${lat},${lng});` +
    `way["shop"](around:${r},${lat},${lng});` +
    `way["amenity"](around:${r},${lat},${lng});` +
    `way["leisure"](around:${r},${lat},${lng});` +
    `way["office"](around:${r},${lat},${lng});` +
    `);out tags;`
  )
}

async function fetchFromOverpass(query: string): Promise<{ elements: OSMElement[] }> {
  let lastError: Error = new Error('Overpass unavailable')
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!response.ok) {
        lastError = new Error(`Overpass API error: ${response.status}`)
        continue
      }
      return (await response.json()) as { elements: OSMElement[] }
    } catch (err) {
      lastError = err as Error
    }
  }
  throw lastError
}

function inferAreaType(elements: OSMElement[]): 'residential' | 'commercial' | 'mixed' {
  const residential = elements.filter(
    (e) =>
      e.tags?.amenity === 'school' ||
      e.tags?.amenity === 'kindergarten' ||
      e.tags?.building === 'residential'
  ).length
  const commercial = elements.filter(
    (e) =>
      e.tags?.shop ||
      e.tags?.office ||
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'bank'
  ).length
  if (commercial > residential * 2) return 'commercial'
  if (residential > commercial * 2) return 'residential'
  return 'mixed'
}

function extractAmenities(elements: OSMElement[]): string[] {
  const result: string[] = []
  const schools = elements.filter(
    (e) => e.tags?.amenity === 'school' || e.tags?.amenity === 'university'
  ).length
  const transit = elements.filter(
    (e) =>
      e.tags?.highway === 'bus_stop' ||
      e.tags?.amenity === 'bus_station' ||
      e.tags?.railway === 'station' ||
      e.tags?.railway === 'subway_entrance'
  ).length
  const food = elements.filter(
    (e) =>
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'fast_food'
  ).length
  const shops = elements.filter((e) => e.tags?.shop).length

  if (schools > 0) result.push(`${schools} məktəb/universitet`)
  if (transit > 0) result.push(`${transit} nəqliyyat dayanacağı`)
  if (food > 0) result.push(`${food} yemək yeri`)
  if (shops > 0) result.push(`${shops} mağaza`)
  return result
}

// Maps Azerbaijani business keywords → OSM tag values used in amenity/shop/leisure
const COMPETITOR_ALIASES: Array<[string[], string[]]> = [
  [['restoran', 'restaurant'], ['restaurant', 'fast_food', 'food_court', 'cafe']],
  [['kafe', 'cafe', 'kofe', 'qəhvə'], ['cafe', 'coffee_shop', 'restaurant', 'fast_food']],
  [['pizza'], ['pizza', 'restaurant', 'fast_food']],
  [['fast food', 'fastfood', 'burger'], ['fast_food', 'restaurant']],
  [['apteka', 'eczane', 'dərman', 'pharmacy'], ['pharmacy']],
  [['bank', 'maliyyə'], ['bank']],
  [['supermarket', 'bazar', 'market', 'ərzaq'], ['supermarket', 'convenience', 'grocery', 'mall', 'general']],
  [['mağaza', 'butik', 'geyim', 'paltar'], ['clothes', 'boutique', 'fashion', 'shoes', 'department_store']],
  [['fitnes', 'idman', 'gym', 'zal', 'fitness'], ['fitness_centre', 'sports_centre', 'gym']],
  [['salon', 'gözəllik', 'beauty', 'kosmetik'], ['beauty', 'hairdresser', 'cosmetics']],
  [['bərbər', 'barber', 'saç'], ['hairdresser', 'barber']],
  [['çörək', 'çörəkçi', 'bakery', 'konfet', 'şirniyyat'], ['bakery', 'confectionery', 'pastry']],
  [['bar', 'pub', 'içki'], ['bar', 'pub', 'nightclub', 'biergarten']],
  [['oyun', 'gaming', 'klub', 'bilyard'], ['arcade', 'casino']],
  [['stomatolog', 'diş', 'dentist'], ['dentist']],
  [['həkim', 'klinika', 'tibb', 'hospital'], ['clinic', 'hospital', 'doctors']],
  [['otel', 'hotel', 'hostel', 'qonaq'], ['hotel', 'hostel', 'guest_house', 'motel']],
  [['yanacaq', 'benzin', 'fuel', 'neft'], ['fuel']],
  [['uşaq', 'körpə', 'bağça'], ['kindergarten', 'childcare', 'playground']],
  [['kitab', 'kitabxana', 'book'], ['books', 'library']],
  [['elektrik', 'texnika', 'elektronik'], ['electronics', 'computer', 'mobile_phone']],
  [['eczane', 'tibb ləvazimatı'], ['medical_supply', 'pharmacy']],
]

function resolveOSMTags(businessType: string): string[] | null {
  const lower = businessType.toLowerCase()
  for (const [keywords, osmValues] of COMPETITOR_ALIASES) {
    if (keywords.some((k) => lower.includes(k))) return osmValues
  }
  return null
}

function countCompetitors(elements: OSMElement[], businessType: string): number {
  const lower = businessType.toLowerCase()
  const osmTags = resolveOSMTags(businessType)

  return elements.filter((e) => {
    const name = (e.tags?.name || '').toLowerCase()
    if (name.includes(lower)) return true

    if (osmTags) {
      const amenity = e.tags?.amenity || ''
      const shop = e.tags?.shop || ''
      const leisure = e.tags?.leisure || ''
      return osmTags.includes(amenity) || osmTags.includes(shop) || osmTags.includes(leisure)
    }

    // Fallback: substring match on OSM tags (handles unmapped types)
    const amenity = (e.tags?.amenity || '').toLowerCase()
    const shop = (e.tags?.shop || '').toLowerCase()
    const leisure = (e.tags?.leisure || '').toLowerCase()
    return amenity.includes(lower) || shop.includes(lower) || leisure.includes(lower)
  }).length
}

const BAD_LAND_USES = new Set([
  'cemetery', 'grave_yard', 'military', 'industrial',
  'landfill', 'quarry', 'construction', 'prison',
])

function extractLandUse(elements: OSMElement[]): string | null {
  for (const e of elements) {
    const lu = e.tags?.landuse || e.tags?.amenity || e.tags?.leisure || ''
    if (BAD_LAND_USES.has(lu)) return lu
  }
  return null
}

export async function fetchPlacesContext(
  lat: number,
  lng: number,
  businessType: string
): Promise<PlacesContext> {
  const [businessData, landUseData] = await Promise.all([
    fetchFromOverpass(buildQuery(lat, lng)),
    fetchFromOverpass(buildLandUseQuery(lat, lng)).catch(() => ({ elements: [] })),
  ])
  const elements = businessData.elements || []
  const landUse = extractLandUse(landUseData.elements || [])
  // Use AZ government dataset for competitor count (better Azerbaijani type matching)
  // Fall back to OSM-based count if no mapping exists
  const azCount = countAzCompetitors(lat, lng, businessType)
  const osmCount = countCompetitors(elements, businessType)
  const competitors = azCount >= 0 ? Math.max(azCount, osmCount) : osmCount

  return {
    competitors,
    areaType: inferAreaType(elements),
    amenities: extractAmenities(elements),
    totalBusinesses: elements.length,
    landUse,
  }
}
