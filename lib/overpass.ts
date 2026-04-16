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
    `way(pivot.here)["leisure"~"^(nature_reserve|cemetery)$"];` +
    `way(pivot.here)["natural"~"^(water|coastline)$"];relation(pivot.here)["natural"~"^(water|coastline)$"];` +
    `way(pivot.here)["waterway"~"^(river|lake|stream|canal)$"];relation(pivot.here)["waterway"];);` +
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
        cache: 'no-store',
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
  [['restoran', 'restaurant', 'yemək', 'yemek', 'xörək'], ['restaurant', 'fast_food', 'food_court', 'cafe']],
  [['kafe', 'cafe', 'kofe', 'qəhvə', 'kahve', 'coffee'], ['cafe', 'coffee_shop', 'restaurant', 'fast_food']],
  [['pizza'], ['pizza', 'restaurant', 'fast_food']],
  [['fast food', 'fastfood', 'burger'], ['fast_food', 'restaurant']],
  [['aptek', 'apteka', 'eczane', 'dərman', 'pharmacy', 'əczaçılıq'], ['pharmacy']],
  [['bank', 'maliyyə', 'kredit'], ['bank']],
  [['supermarket', 'bazar', 'market', 'ərzaq', 'ərzaq mağazası', 'bakkal'], ['supermarket', 'convenience', 'grocery', 'mall', 'general']],
  [['mağaza', 'butik', 'geyim', 'paltar', 'kişi geyim', 'qadin geyim', 'fashion', 'clothes'], ['clothes', 'boutique', 'fashion', 'shoes', 'department_store']],
  [['fitnes', 'idman', 'gym', 'zal', 'fitness', 'crossfit', 'sport'], ['fitness_centre', 'sports_centre', 'gym']],
  [['salon', 'gözəllik', 'beauty', 'kosmetik', 'gözəllik salonu', 'spa'], ['beauty', 'hairdresser', 'cosmetics']],
  [['bərbər', 'barber', 'saç', 'həllaqlıq'], ['hairdresser', 'barber']],
  [['çörək', 'çörəkçi', 'bakery', 'konfet', 'şirniyyat', 'tort', 'cake'], ['bakery', 'confectionery', 'pastry']],
  [['bar', 'pub', 'içki', 'alkoqol'], ['bar', 'pub', 'nightclub', 'biergarten']],
  [['oyun', 'gaming', 'klub', 'bilyard', 'oyun zalı', 'billiard'], ['arcade', 'casino']],
  [['stomatolog', 'diş', 'dentist', 'diş həkimi'], ['dentist']],
  [['həkim', 'klinika', 'tibb', 'hospital', 'xəstəxana', 'poliklinika', 'doctor'], ['clinic', 'hospital', 'doctors']],
  [['otel', 'hotel', 'hostel', 'qonaq', 'motel', 'apart'], ['hotel', 'hostel', 'guest_house', 'motel']],
  [['yanacaq', 'benzin', 'fuel', 'neft', 'qaz stansiya', 'doldurma'], ['fuel']],
  [['uşaq', 'körpə', 'bağça', 'dayə', 'körpə uşaq'], ['kindergarten', 'childcare', 'playground']],
  [['kitab', 'kitabxana', 'book', 'kağız', 'dəftər'], ['books', 'library']],
  [['elektrik', 'texnika', 'elektronik', 'elektronika', 'komputer', 'computer', 'telefon', 'mobil', 'laptop', 'tablet', 'gadget', 'tech'], ['electronics', 'computer', 'mobile_phone']],
  [['eczane', 'tibb ləvazimatı', 'tibb avadanlığı'], ['medical_supply', 'pharmacy']],
  [['avtomobil', 'maşın', 'car', 'servis', 'avto', 'ehtiyat hissə'], ['car', 'car_repair', 'car_parts']],
  [['çiçək', 'gül', 'flower', 'florist'], ['florist']],
  [['ev əşyası', 'mebel', 'furniture', 'interior', 'dekor'], ['furniture', 'interior_decoration', 'doityourself']],
  [['qəhvəxana', 'çayxana', 'teahouse', 'çay'], ['cafe', 'coffee_shop']],
  [['məktəb', 'təhsil', 'kurs', 'dərs', 'tədris', 'university', 'school'], ['school', 'college', 'university', 'language_school', 'music_school']],
  [['tikinti', 'material', 'inşaat', 'building', 'hardware', 'təmir'], ['doityourself', 'hardware', 'building_materials', 'construction']],
  // Extended categories
  [['kosmetika', 'parfüm', 'parfümeri', 'makeup', 'perfume', 'cosmetics'], ['cosmetics', 'perfumery', 'beauty']],
  [['idman malları', 'sport goods', 'velosiped', 'bicycle', 'equipment'], ['sports', 'bicycle', 'outdoor', 'sporting_goods']],
  [['zərgərlik', 'qızıl', 'gümüş', 'jewelry', 'jewellery', 'aksesuar', 'saat', 'watch'], ['jewelry', 'watches', 'accessories']],
  [['optika', 'gözlük', 'linza', 'optician', 'glasses', 'lens'], ['optician']],
  [['masaj', 'spa', 'massage', 'wellness'], ['massage', 'spa']],
  [['baytarlıq', 'heyvan', 'veterinary', 'pet clinic'], ['veterinary']],
  [['avtomobil satış', 'car dealer', 'ikinci əl', 'used car'], ['car', 'car_dealership']],
  [['hüquq', 'vəkil', 'notariat', 'notary', 'lawyer'], ['lawyers', 'notary']],
  [['sığorta', 'insurance', 'icbari', 'OSAGO'], ['insurance']],
  [['əmlak', 'real estate', 'estate agent', 'property'], ['estate_agent']],
  [['çap', 'printing', 'poliqrafiya', 'copyshop', 'banner'], ['copyshop', 'printing']],
  [['turizm', 'səyahət', 'travel', 'tour agent', 'bilet'], ['travel_agency']],
  [['kinoteatr', 'cinema', 'kino'], ['cinema', 'theatre']],
  [['musiqi', 'music school', 'musiqi məktəbi', 'incəsənət'], ['music_school', 'musical_instrument', 'arts_centre']],
  [['tədris mərkəzi', 'kurs mərkəzi', 'dil mərkəzi', 'language school', 'repetitor'], ['language_school', 'music_school', 'school']],
  [['foto', 'fotoqraf', 'fotostudia', 'photographer'], ['photographer', 'studio']],
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
    const rawName = e.tags?.name || ''
    const name = rawName.toLowerCase()
    const amenity = e.tags?.amenity || ''
    const shop = e.tags?.shop || ''
    const leisure = e.tags?.leisure || ''

    // For known chains, use the chain's canonical osmCategories instead of the
    // raw OSM amenity tag — prevents e.g. The Bagel Bar (coffee_shop) being
    // counted as a restaurant competitor just because OSM tags it as restaurant.
    const chainDef = rawName ? BAKU_CHAINS.find((c) => matchesChain(rawName, c)) : null

    const isMatch =
      name.includes(lower) ||
      (osmTags
        ? chainDef
          ? chainDef.osmCategories.some((cat) => osmTags.includes(cat))
          : osmTags.includes(amenity) || osmTags.includes(shop) || osmTags.includes(leisure)
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

import { BAKU_CHAINS, matchesChain } from './chains'

/** Dominant competitor penalty only applies within this radius. */
const DOMINANT_COMPETITOR_RADIUS = 300 // metres

/** Cuisine prompt only triggers when a chain is this close to the pin. */
const FOOD_CHAIN_PROMPT_RADIUS = 200 // metres

/**
 * Returns ALL same-category dominant chains within DOMINANT_COMPETITOR_RADIUS,
 * sorted nearest-first. Each unique chain location is included (multiple branches
 * of the same chain each appear if they fall within the radius).
 */
function detectDominantCompetitors(
  elements: OSMElement[],
  businessType: string,
  pinLat: number,
  pinLng: number
): { name: string; distance: number }[] {
  const resolvedTags = resolveOSMTags(businessType)
  if (!resolvedTags) return []

  const results: { name: string; distance: number }[] = []
  // Track by element id to avoid duplicating the same OSM node/way
  const seenIds = new Set<number>()

  for (const e of elements) {
    if (seenIds.has(e.id)) continue
    const rawName = e.tags?.name || ''
    if (!rawName) continue

    const chain = BAKU_CHAINS.find((c) => matchesChain(rawName, c))
    if (!chain) continue

    if (!chain.osmCategories.some((cat) => resolvedTags.includes(cat))) continue

    const coords = elementCoords(e)
    if (!coords) continue

    const dist = haversineMetres(pinLat, pinLng, coords.lat, coords.lng)
    if (dist > DOMINANT_COMPETITOR_RADIUS) continue

    seenIds.add(e.id)
    const cleanName = rawName.replace(/[\u0400-\u04FF]/g, '').replace(/\s{2,}/g, ' ').trim()
    results.push({ name: cleanName || rawName, distance: Math.round(dist) })
  }

  return results.sort((a, b) => a.distance - b.distance)
}

const FOOD_OSM_TAGS = new Set(['restaurant', 'fast_food', 'cafe', 'food_court'])

/**
 * Returns unique chain food businesses within DOMINANT_COMPETITOR_RADIUS,
 * sorted nearest-first. Only runs for food business types.
 */
function detectNearbyFoodChains(
  elements: OSMElement[],
  businessType: string,
  pinLat: number,
  pinLng: number,
): { name: string; distance: number; cuisine?: string }[] {
  const resolvedTags = resolveOSMTags(businessType)
  if (!resolvedTags) return []
  if (!resolvedTags.some(t => FOOD_OSM_TAGS.has(t))) return []

  // Map from chain index → nearest match
  const found = new Map<number, { name: string; distance: number; cuisine?: string }>()

  for (const e of elements) {
    const rawName = e.tags?.name || ''
    if (!rawName) continue

    const chainIdx = BAKU_CHAINS.findIndex(c => matchesChain(rawName, c))
    if (chainIdx < 0) continue
    const chain = BAKU_CHAINS[chainIdx]

    if (!chain.osmCategories.some(cat => resolvedTags.includes(cat))) continue

    const coords = elementCoords(e)
    if (!coords) continue

    const dist = haversineMetres(pinLat, pinLng, coords.lat, coords.lng)
    if (dist > FOOD_CHAIN_PROMPT_RADIUS) continue

    const existing = found.get(chainIdx)
    if (!existing || dist < existing.distance) {
      const cleanName = rawName.replace(/[\u0400-\u04FF]/g, '').replace(/\s{2,}/g, ' ').trim()
      found.set(chainIdx, {
        name: cleanName || rawName,
        distance: Math.round(dist),
        cuisine: chain.cuisine,
      })
    }
  }

  return Array.from(found.values()).sort((a, b) => a.distance - b.distance)
}

const BAD_LAND_USES = new Set([
  'cemetery', 'grave_yard', 'military', 'industrial',
  'landfill', 'quarry', 'construction', 'prison',
  'reservoir', 'basin',
])

const WATER_NATURAL = new Set(['water', 'coastline'])
const WATER_WAYS = new Set(['river', 'lake', 'stream', 'canal'])

function extractLandUse(elements: OSMElement[]): string | null {
  for (const e of elements) {
    const lu = e.tags?.landuse || e.tags?.amenity || e.tags?.leisure || ''
    if (BAD_LAND_USES.has(lu)) return lu
    const natural = e.tags?.natural || ''
    if (WATER_NATURAL.has(natural)) return natural
    const waterway = e.tags?.waterway || ''
    if (WATER_WAYS.has(waterway)) return waterway
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
  const dominantCompetitors = detectDominantCompetitors(businessElements, businessType, lat, lng)
  const nearbyChains = detectNearbyFoodChains(businessElements, businessType, lat, lng)

  // When the user is opening a grocery/supermarket business, the AZ dataset may report
  // many competitors that are the same stores as "erzaq magazaları". Unify both counts
  // so the UI never shows "37 rəqib / 0 Ərzaq Mağazası" for the same category.
  const osmGroceryCount = extractGroceryStores(businessElements)
  const resolvedForBusiness = resolveOSMTags(businessType) ?? []
  const isGroceryBusiness = resolvedForBusiness.some((t) => GROCERY_SHOP_TAGS.has(t))
  const groceryStores = isGroceryBusiness ? Math.max(osmGroceryCount, competitors) : osmGroceryCount

  return {
    competitors,
    areaType: inferAreaType(businessElements),
    amenities: extractAmenities(businessElements),
    totalBusinesses: businessElements.length,
    landUse,
    recognized,
    busStops: extractBusStops(businessElements),
    parking: extractParking(businessElements),
    groceryStores,
    majorRoads: roadElements.length,
    metroDistance: metro?.distance ?? null,
    metroRidership: metro?.ridership ?? null,
    urbanTier,
    dominantCompetitors,
    nearbyChains,
  }
}
