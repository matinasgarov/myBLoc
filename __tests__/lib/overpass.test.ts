import { fetchPlacesContext } from '@/lib/overpass'

jest.mock('@/lib/az-competitors', () => ({
  countAzCompetitors: () => -1, // no AZ mapping, fall back to OSM only
}))

global.fetch = jest.fn()

const mockOSMResponse = {
  elements: [
    { type: 'node', id: 1, tags: { amenity: 'restaurant', name: 'Kafe 1' } },
    { type: 'node', id: 2, tags: { amenity: 'restaurant', name: 'Kafe 2' } },
    { type: 'node', id: 3, tags: { shop: 'clothes', name: 'Paltar Mağazası' } },
    { type: 'node', id: 4, tags: { amenity: 'school', name: 'Məktəb 1' } },
    { type: 'node', id: 5, tags: { amenity: 'bus_station', name: 'Avtobus' } },
    { type: 'node', id: 6, tags: { office: 'company', name: 'Ofis' } },
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
    expect(result.competitors).toBe(2)
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

  it('throws on Overpass API error response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 })
    await expect(fetchPlacesContext(40.4093, 49.8671, 'restaurant')).rejects.toThrow(
      'Overpass API error: 429'
    )
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
})
