import type { OSMElement, PlacesContext } from './types'
import { countAzCompetitors } from './az-competitors'
import { haversineMetres } from './geo'
import { getNearestMetro } from './metro-stations'
import { getUrbanTier } from './settlements'
import { BAKU_CHAINS, matchesChain, type ChainDefinition } from './chains'
import { kvGet, kvSet } from './kv-cache'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
]
const RADIUS = 500
const CACHE_TTL_MS = 5 * 60 * 1000
const queryCache = new Map<string, { data: { elements: OSMElement[] }; expiresAt: number }>()

function buildLandUseQuery(lat: number, lng: number): string {
  return (
    `[out:json][timeout:25];` +
    `is_in(${lat},${lng})->.here;` +
    `(way(pivot.here)["landuse"];relation(pivot.here)["landuse"];` +
    `way(pivot.here)["amenity"~"^(grave_yard|prison)$"];` +
    `way(pivot.here)["leisure"~"^(nature_reserve|cemetery)$"];` +
    `way(pivot.here)["natural"~"^(water|coastline)$"];relation(pivot.here)["natural"~"^(water|coastline)$"];` +
    `way(pivot.here)["waterway"~"^(river|lake|stream|canal)$"];relation(pivot.here)["waterway"];);` +
    `out tags;`
  )
}

const AMENITY_FILTER =
  '^(restaurant|cafe|fast_food|food_court|bar|pub|nightclub|biergarten|' +
  'school|university|college|kindergarten|childcare|language_school|music_school|' +
  'bus_station|bank|pharmacy|parking|hospital|clinic|doctors|dentist|veterinary|' +
  'fuel|cinema|theatre|library|arts_centre|arcade|casino|marketplace|' +
  'grave_yard|prison|fitness_centre|playground)$'

const LEISURE_FILTER = '^(fitness_centre|sports_centre|playground|arts_centre|nature_reserve)$'

function buildQuery(lat: number, lng: number): string {
  const r = RADIUS
  return (
    `[out:json][timeout:30];` +
    `(` +
    `node["shop"](around:${r},${lat},${lng});` +
    `node["amenity"~"${AMENITY_FILTER}"](around:${r},${lat},${lng});` +
    `node["leisure"~"${LEISURE_FILTER}"](around:${r},${lat},${lng});` +
    `node["office"](around:${r},${lat},${lng});` +
    `node["highway"="bus_stop"](around:${r},${lat},${lng});` +
    `way["shop"](around:${r},${lat},${lng});` +
    `way["amenity"~"${AMENITY_FILTER}"](around:${r},${lat},${lng});` +
    `way["leisure"~"${LEISURE_FILTER}"](around:${r},${lat},${lng});` +
    `way["office"](around:${r},${lat},${lng});` +
    `way["highway"~"^(primary|secondary|tertiary|trunk)$"](around:${r},${lat},${lng});` +
    `);out body center;`
  )
}

const DEBUG = process.env.OVERPASS_DEBUG === '1'

export async function fetchFromOverpass(query: string): Promise<{ elements: OSMElement[] }> {
  const cached = queryCache.get(query)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  let lastError: Error = new Error('Overpass unavailable')
  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 35000)
    try {
      console.log('[overpass] query →', url, '\n', query)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': process.env.OVERPASS_CONTACT || 'myblocate/1.0 (+https://myblocate.com)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        if (DEBUG) console.warn('[overpass] endpoint', url, 'status:', response.status)
        lastError = new Error(`Overpass API error: ${response.status}`)
        if (response.status === 429) await new Promise((r) => setTimeout(r, 1500))
        continue
      }
      const json = (await response.json()) as { elements: OSMElement[] }
      console.log('[overpass] response ←', url, 'elements:', json.elements?.length ?? 0)
      queryCache.set(query, { data: json, expiresAt: Date.now() + CACHE_TTL_MS })
      return json
    } catch (err) {
      clearTimeout(timeoutId)
      if (DEBUG) console.warn('[overpass] endpoint threw', url, '→', (err as Error).message)
      lastError = err as Error
    }
  }
  throw lastError
}

const MAJOR_ROAD_TAGS = new Set(['primary', 'secondary', 'tertiary', 'trunk'])

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

export function resolveOSMTags(businessType: string): string[] | null {
  const lower = businessType.toLowerCase()
  for (const [keywords, osmValues] of COMPETITOR_ALIASES) {
    if (keywords.some((k) => lower.includes(k))) return osmValues
  }
  return null
}

function elementCoords(e: OSMElement): { lat: number; lng: number } | null {
  if (e.lat !== undefined && e.lon !== undefined) return { lat: e.lat, lng: e.lon }
  if (e.center) return { lat: e.center.lat, lng: e.center.lon }
  return null
}

/**
 * Distance-weighted competitor count from OSM elements.
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

/** Dominant competitor penalty only applies within this radius. */
const DOMINANT_COMPETITOR_RADIUS = 100 // metres

/** Cuisine prompt only triggers when a chain is this close to the pin. */
const FOOD_CHAIN_PROMPT_RADIUS = 200 // metres

const FOOD_OSM_TAGS = new Set(['restaurant', 'fast_food', 'cafe', 'food_court', 'coffee_shop'])

interface ChainMatch {
  name: string
  distance: number
  chainKey: string
  cuisine?: 'burger' | 'pizza' | 'coffee' | 'other'
}

function elementCategoryTags(e: OSMElement): string[] {
  const out: string[] = []
  if (e.tags?.amenity) out.push(e.tags.amenity)
  if (e.tags?.shop) out.push(e.tags.shop)
  if (e.tags?.leisure) out.push(e.tags.leisure)
  if (e.tags?.office) out.push(e.tags.office)
  return out
}

function detectChainsFromOSM(
  elements: OSMElement[],
  pinLat: number,
  pinLng: number,
  resolvedTags: string[] | null,
): ChainMatch[] {
  const nearestByKey = new Map<string, ChainMatch>()

  for (const e of elements) {
    const rawName = (e.tags?.name || e.tags?.brand || '').trim()
    if (!rawName) continue

    const categoryTags = elementCategoryTags(e)
    if (categoryTags.length === 0) {
      console.log(`[overpass] reject "${rawName}": no category tags`)
      continue
    }

    let matched: ChainDefinition | null = null
    for (const chain of BAKU_CHAINS) {
      const categoryOverlap = chain.osmCategories.some((c) => categoryTags.includes(c))
      if (!categoryOverlap) continue
      if (resolvedTags && !chain.osmCategories.some((c) => resolvedTags.includes(c))) continue
      if (matchesChain(rawName, chain)) {
        matched = chain
        break
      }
    }
    if (!matched) {
      console.log(`[overpass] reject "${rawName}": no BAKU_CHAINS match (cats: ${categoryTags.join(',')})`)
      continue
    }

    const coords = elementCoords(e)
    const distance = coords
      ? Math.round(haversineMetres(pinLat, pinLng, coords.lat, coords.lng))
      : 0

    console.log(`[overpass] chain candidate "${rawName}" dist=${distance}m`)
    if (distance > DOMINANT_COMPETITOR_RADIUS) {
      console.log(`[overpass]   → beyond DOMINANT radius (${DOMINANT_COMPETITOR_RADIUS}m) — not flagged as dominant`)
    }

    const chainKey = matched.keywords[0]
    const existing = nearestByKey.get(chainKey)
    if (!existing || distance < existing.distance) {
      nearestByKey.set(chainKey, {
        name: rawName,
        distance,
        chainKey,
        cuisine: matched.cuisine,
      })
    }
  }

  return Array.from(nearestByKey.values()).sort((a, b) => a.distance - b.distance)
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

const KV_TTL = 24 * 60 * 60       // 24 hours for business data
const KV_LANDUSE_TTL = 7 * 24 * 60 * 60 // 7 days for land use (changes very rarely)

async function fetchLandUse(lat: number, lng: number, snapLat: number, snapLng: number): Promise<string | null> {
  const landUseKey = `landuse:v1:${snapLat}:${snapLng}`
  const cachedLandUse = await kvGet<string | null>(landUseKey)
  if (cachedLandUse !== null) {
    console.log('[overpass] KV landuse cache hit:', landUseKey)
    return cachedLandUse === '__none__' ? null : cachedLandUse
  }
  const data = await fetchFromOverpass(buildLandUseQuery(lat, lng)).catch((e) => {
    console.error('[overpass] landUseData failed:', e)
    return { elements: [] as OSMElement[] }
  })
  const landUse = extractLandUse(data.elements || [])
  await kvSet(landUseKey, landUse ?? '__none__', KV_LANDUSE_TTL)
  return landUse
}

export async function fetchPlacesContext(
  lat: number,
  lng: number,
  businessType: string
): Promise<PlacesContext> {
  if (DEBUG) console.log('[overpass] pin:', lat, lng, 'businessType:', businessType)

  // Snap to ~100m grid so nearby pins share the same cache entry
  const snapLat = Math.round(lat * 1000) / 1000
  const snapLng = Math.round(lng * 1000) / 1000
  const kvKey = `places:v1:${snapLat}:${snapLng}:${businessType.toLowerCase().trim()}`
  const cached = await kvGet<PlacesContext>(kvKey)
  if (cached) {
    if (DEBUG) console.log('[overpass] KV cache hit:', kvKey)
    return cached
  }

  const [businessData, landUse] = await Promise.all([
    fetchFromOverpass(buildQuery(lat, lng)).catch((e) => {
      console.error('[overpass] businessData failed:', e)
      return { elements: [] as OSMElement[] }
    }),
    fetchLandUse(lat, lng, snapLat, snapLng),
  ])

  const allElements = businessData.elements || []
  const { businessElements, roadElements } = splitElements(allElements)
  console.log('[overpass] raw elements:', allElements.length, 'businessElements:', businessElements.length)
  console.log('[overpass] named businessElements:',
    businessElements
      .filter(e => e.tags?.name || e.tags?.brand)
      .map(e => ({
        name: e.tags?.name || e.tags?.brand,
        amenity: e.tags?.amenity,
        shop: e.tags?.shop,
        leisure: e.tags?.leisure,
        type: e.type,
        hasCoords: !!(e.lat ?? e.center),
      }))
  )

  const azCount = countAzCompetitors(lat, lng, businessType)
  const osmCount = countCompetitors(businessElements, businessType, lat, lng)
  const competitors = azCount >= 0 ? Math.max(azCount, osmCount) : osmCount
  const recognized = resolveOSMTags(businessType) !== null || azCount >= 0

  const metro = getNearestMetro(lat, lng)
  const urbanTier = getUrbanTier(lat, lng)

  // Chain detection: scan OSM elements (names/brands) dynamically. No hardcoded coords.
  const resolvedTags = resolveOSMTags(businessType)

  const chainMatches = detectChainsFromOSM(businessElements, lat, lng, resolvedTags)
  const dominantCompetitors = chainMatches
    .filter((c) => c.distance <= DOMINANT_COMPETITOR_RADIUS)
    .map(({ name, distance }) => ({ name, distance }))

  const isFoodBusiness = resolvedTags ? resolvedTags.some((t) => FOOD_OSM_TAGS.has(t)) : false
  const nearbyChains = isFoodBusiness
    ? chainMatches
        .filter((c) => c.distance <= FOOD_CHAIN_PROMPT_RADIUS)
        .map(({ name, distance, cuisine }) => ({ name, distance, cuisine }))
    : []

  const osmGroceryCount = extractGroceryStores(businessElements)
  const resolvedForBusiness = resolvedTags ?? []
  const isGroceryBusiness = resolvedForBusiness.some((t) => GROCERY_SHOP_TAGS.has(t))
  const groceryStores = isGroceryBusiness ? Math.max(osmGroceryCount, competitors) : osmGroceryCount

  const result: PlacesContext = {
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

  if (allElements.length > 0) {
    await kvSet(kvKey, result, KV_TTL)
  } else if (DEBUG) {
    console.warn('[overpass] skipping KV cache write — degraded result (0 elements)')
  }
  return result
}
