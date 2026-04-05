import { fetchPlacesContext } from '@/lib/overpass'

jest.mock('@/lib/az-competitors', () => ({
  countAzCompetitors: () => -1,
}))
jest.mock('@/lib/metro-stations', () => ({
  getNearestMetro: () => null,
}))
jest.mock('@/lib/settlements', () => ({
  getUrbanTier: () => 'city' as const,
}))

global.fetch = jest.fn()

const mockOSMResponse = {
  elements: [
    { type: 'node', id: 1, lat: 40.4093, lon: 49.8671, tags: { amenity: 'restaurant', name: 'Kafe 1' } },
    { type: 'node', id: 2, lat: 40.4094, lon: 49.8672, tags: { amenity: 'restaurant', name: 'Kafe 2' } },
    { type: 'node', id: 3, lat: 40.4095, lon: 49.8673, tags: { shop: 'clothes', name: 'Paltar Mağazası' } },
    { type: 'node', id: 4, lat: 40.4096, lon: 49.8674, tags: { amenity: 'school', name: 'Məktəb 1' } },
    { type: 'node', id: 5, lat: 40.4097, lon: 49.8675, tags: { amenity: 'bus_station', name: 'Avtobus' } },
    { type: 'node', id: 6, lat: 40.4098, lon: 49.8676, tags: { office: 'company', name: 'Ofis' } },
  ],
}

describe('fetchPlacesContext', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOSMResponse,
    })
  })

  afterEach(() => jest.clearAllMocks())

  it('returns correct totalBusinesses count', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.totalBusinesses).toBe(6)
  })

  it('counts competitors matching business type keyword', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.competitors).toBeGreaterThanOrEqual(1)
  })

  it('includes school in amenities summary', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.amenities.some(a => a.includes('məktəb'))).toBe(true)
  })

  it('includes transit in amenities summary', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.amenities.some(a => a.includes('nəqliyyat'))).toBe(true)
  })

  it('infers commercial area type when many shops/offices', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'cafe')
    expect(result.areaType).toBe('commercial')
  })

  it('returns busStops count from bus_station elements', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.busStops).toBe(1)
  })

  it('returns parking=0 when no parking elements', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.parking).toBe(0)
  })

  it('returns groceryStores=0 when no grocery elements', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.groceryStores).toBe(0)
  })

  it('returns urbanTier from mocked settlements', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.urbanTier).toBe('city')
  })

  it('returns metroDistance=null when mocked metro returns null', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.metroDistance).toBeNull()
    expect(result.metroRidership).toBeNull()
  })

  it('returns degraded result on Overpass API error instead of throwing', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 })
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.totalBusinesses).toBe(0)
    expect(result.competitors).toBe(0)
    expect(result.amenities).toEqual([])
    expect(result.busStops).toBe(0)
    expect(result.parking).toBe(0)
    expect(result.groceryStores).toBe(0)
    expect(result.majorRoads).toBe(0)
  })

  it('handles empty Overpass response gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    })
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.competitors).toBe(0)
    expect(result.amenities).toEqual([])
    expect(result.totalBusinesses).toBe(0)
  })

  it('sets recognized=true for known business types', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'restaurant')
    expect(result.recognized).toBe(true)
  })

  it('sets recognized=false for unknown business types', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'xyzabc')
    expect(result.recognized).toBe(false)
  })

  it('returns dominantCompetitor=null when no dominant chain is present', async () => {
    const result = await fetchPlacesContext(40.4093, 49.8671, 'market')
    expect(result.dominantCompetitor).toBeNull()
  })

  it('detects dominant competitor when Bravo is in OSM data for matching category', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 10, lat: 40.4094, lon: 49.8672, tags: { shop: 'supermarket', name: 'Bravo Market' } },
        ],
      }),
    })
    const result = await fetchPlacesContext(40.4093, 49.8671, 'market')
    expect(result.dominantCompetitor).not.toBeNull()
    expect(result.dominantCompetitor?.name).toBe('Bravo Market')
    expect(typeof result.dominantCompetitor?.distance).toBe('number')
  })

  it('does not flag dominant competitor when category does not match', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 10, lat: 40.4094, lon: 49.8672, tags: { shop: 'supermarket', name: 'Bravo Market' } },
        ],
      }),
    })
    // Opening a dentist clinic near Bravo — no conflict
    const result = await fetchPlacesContext(40.4093, 49.8671, 'dentist')
    expect(result.dominantCompetitor).toBeNull()
  })
})
