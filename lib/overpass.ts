import type { OSMElement, PlacesContext } from './types'
import { countAzCompetitors } from './az-competitors'
import { haversineMetres } from './geo'
import { getNearestMetro } from './metro-stations'
import { getUrbanTier } from './settlements'

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
    `way["highway"~"^(primary|secondary|tertiary|trunk)$"](around:${r},${lat},${lng});` +
    `);out body center;`
  )
}

async function fetchFromOverpass(query: string): Promise<{ elements: OSMElement[] }> {
  let lastError: Error = new Error('Overpass unavailable')
  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        lastError = new Error(`Overpass API error: ${response.status}`)
        continue
      }
      return (await response.json()) as { elements: OSMElement[] }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err as Error
    }
  }
  throw lastError
}

const MAJOR_ROAD_TAGS = new Set(['primary', 'secondary', 'tertiary', 'trunk'])

/** Separates major road way elements from business/amenity elements. */
function splitElements(elements: OSMElement[]): {
  businessElements: OSMElement[]
  roadElements: OSMElement[]
} {
  const roadElements = elements.filter(
    (e) => e.type === 'way' && e.tags?.highway && MAJOR_ROAD_TAGS.has(e.tags.highway)
  )
  const businessElements = elements.filter(
    (e) => !(e.type === 'way' && e.tags?.highway && MAJOR_ROAD_TAGS.has(e.tags.highway))
  )
  return { businessElements, roadElements }
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

function extractBusStops(elements: OSMElement[]): number {
  return elements.filter(
    (e) => e.tags?.highway === 'bus_stop' || e.tags?.amenity === 'bus_station'
  ).length
}

function extractParking(elements: OSMElement[]): number {
  return elements.filter((e) => e.tags?.amenity === 'parking').length
}

const GROCERY_SHOP_TAGS = new Set(['supermarket', 'convenience', 'grocery', 'food'])

function extractGroceryStores(elements: OSMElement[]): number {
  return elements.filter((e) => e.tags?.shop && GROCERY_SHOP_TAGS.has(e.tags.shop)).length
}

// Maps Azerbaijani business keywords → OSM tag values used in amenity/shop/leisure
const COMPETITOR_ALIASES: Array<[string[], string[]]> = [
  [['restoran', 'restaurant'], ['restaurant', 'fast_food', 'food_court', 'cafe']],
  [['kafe', 'cafe', 'kofe', 'qəhvə'], ['cafe', 'coffee_shop', 'restaurant', 'fast_food']],
  [['pizza'], ['pizza', 'restaurant', 'fast_food']],
  [['fast food', 'fastfood', 'burger'], ['fast_food', 'restaurant']],
  [['aptek', 'apteka', 'eczane', 'dərman', 'pharmacy'], ['pharmacy']],
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

/** Returns element centre coordinates if available (node: lat/lon, way: center). */
function elementCoords(e: OSMElement): { lat: number; lng: number } | null {
  if (e.lat !== undefined && e.lon !== undefined) return { lat: e.lat, lng: e.lon }
  if (e.center) return { lat: e.center.lat, lng: e.center.lon }
  return null
}

/**
 * Distance-weighted competitor count.
 * < 200 m: weight 1.0   |   200–500 m: weight 0.5   |   no coords: weight 0.5
 */
function countCompetitors(
  elements: OSMElement[],
  businessType: string,
  pinLat: number,
  pinLng: number
): number {
  const lower = businessType.toLowerCase()
  const osmTags = resolveOSMTags(businessType)

  let weighted = 0
  for (const e of elements) {
    const name = (e.tags?.name || '').toLowerCase()
    const amenity = e.tags?.amenity || ''
    const shop = e.tags?.shop || ''
    const leisure = e.tags?.leisure || ''

    const isMatch =
      name.includes(lower) ||
      (osmTags
        ? osmTags.includes(amenity) || osmTags.includes(shop) || osmTags.includes(leisure)
        : amenity.toLowerCase().includes(lower) ||
          shop.toLowerCase().includes(lower) ||
          leisure.toLowerCase().includes(lower))

    if (!isMatch) continue

    const coords = elementCoords(e)
    if (coords) {
      const dist = haversineMetres(pinLat, pinLng, coords.lat, coords.lng)
      weighted += dist < 200 ? 1 : 0.5
    } else {
      weighted += 0.5
    }
  }
  return Math.round(weighted)
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
    fetchFromOverpass(buildQuery(lat, lng)).catch(() => ({ elements: [] as OSMElement[] })),
    fetchFromOverpass(buildLandUseQuery(lat, lng)).catch(() => ({ elements: [] as OSMElement[] })),
  ])

  const allElements = businessData.elements || []
  const { businessElements, roadElements } = splitElements(allElements)
  const landUse = extractLandUse(landUseData.elements || [])

  const azCount = countAzCompetitors(lat, lng, businessType)
  const osmCount = countCompetitors(businessElements, businessType, lat, lng)
  const competitors = azCount >= 0 ? Math.max(azCount, osmCount) : osmCount
  const recognized = resolveOSMTags(businessType) !== null || azCount >= 0

  const metro = getNearestMetro(lat, lng)
  const urbanTier = getUrbanTier(lat, lng)

  return {
    competitors,
    areaType: inferAreaType(businessElements),
    amenities: extractAmenities(businessElements),
    totalBusinesses: businessElements.length,
    landUse,
    recognized,
    busStops: extractBusStops(businessElements),
    parking: extractParking(businessElements),
    groceryStores: extractGroceryStores(businessElements),
    majorRoads: roadElements.length,
    metroDistance: metro?.distance ?? null,
    metroRidership: metro?.ridership ?? null,
    urbanTier,
  }
}
