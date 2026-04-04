import { calculateScore } from '@/lib/score'
import type { PlacesContext } from '@/lib/types'

function ctx(overrides: Partial<PlacesContext>): PlacesContext {
  return {
    competitors: 0,
    areaType: 'commercial',
    amenities: [],
    totalBusinesses: 10,
    landUse: null,
    recognized: true,
    busStops: 0,
    parking: 0,
    groceryStores: 0,
    majorRoads: 0,
    metroDistance: null,
    metroRidership: null,
    urbanTier: 'city',
    ...overrides,
  }
}

describe('calculateScore', () => {
  it('returns a score and factors array', () => {
    const result = calculateScore(ctx({}))
    expect(typeof result.score).toBe('number')
    expect(result.factors).toHaveLength(7)
  })

  it('factor keys are correct and in order', () => {
    const { factors } = calculateScore(ctx({}))
    const keys = factors.map(f => f.key)
    expect(keys).toEqual(['competition', 'footTraffic', 'areaType', 'urbanTier', 'accessibility', 'nearbyServices', 'businessDensity'])
  })

  it('max factor scores sum to 95', () => {
    const { factors } = calculateScore(ctx({}))
    expect(factors.reduce((s, f) => s + f.max, 0)).toBe(95)
  })

  it('score never exceeds 95', () => {
    const result = calculateScore(ctx({
      competitors: 0,
      busStops: 5,
      parking: 3,
      groceryStores: 5,
      majorRoads: 5,
      metroRidership: 50000,
      metroDistance: 100,
      areaType: 'commercial',
      urbanTier: 'metro-city',
      totalBusinesses: 100,
      amenities: ['a', 'b', 'c'],
    }))
    expect(result.score).toBeLessThanOrEqual(95)
  })

  it('competition: 0 rivals = 22 pts', () => {
    const { factors } = calculateScore(ctx({ competitors: 0 }))
    expect(factors.find(f => f.key === 'competition')!.score).toBe(22)
  })

  it('competition: 10+ rivals = 0 pts', () => {
    const { factors } = calculateScore(ctx({ competitors: 10 }))
    expect(factors.find(f => f.key === 'competition')!.score).toBe(0)
  })

  it('competition: score never goes negative', () => {
    const { factors } = calculateScore(ctx({ competitors: 100 }))
    expect(factors.find(f => f.key === 'competition')!.score).toBe(0)
  })

  it('footTraffic: no metro, no roads = 0 pts', () => {
    const { factors } = calculateScore(ctx({ metroRidership: null, majorRoads: 0 }))
    expect(factors.find(f => f.key === 'footTraffic')!.score).toBe(0)
  })

  it('footTraffic: high ridership + roads = 20 pts max', () => {
    const { factors } = calculateScore(ctx({ metroRidership: 50000, majorRoads: 5 }))
    expect(factors.find(f => f.key === 'footTraffic')!.score).toBe(20)
  })

  it('footTraffic: ridership tiers are correct', () => {
    expect(calculateScore(ctx({ metroRidership: 30000, majorRoads: 0 })).factors.find(f => f.key === 'footTraffic')!.score).toBe(12)
    expect(calculateScore(ctx({ metroRidership: 20000, majorRoads: 0 })).factors.find(f => f.key === 'footTraffic')!.score).toBe(10)
    expect(calculateScore(ctx({ metroRidership: 10000, majorRoads: 0 })).factors.find(f => f.key === 'footTraffic')!.score).toBe(7)
    expect(calculateScore(ctx({ metroRidership: 5000, majorRoads: 0 })).factors.find(f => f.key === 'footTraffic')!.score).toBe(4)
    expect(calculateScore(ctx({ metroRidership: 1000, majorRoads: 0 })).factors.find(f => f.key === 'footTraffic')!.score).toBe(2)
  })

  it('areaType: commercial=13, mixed=9, residential=5', () => {
    expect(calculateScore(ctx({ areaType: 'commercial' })).factors.find(f => f.key === 'areaType')!.score).toBe(13)
    expect(calculateScore(ctx({ areaType: 'mixed' })).factors.find(f => f.key === 'areaType')!.score).toBe(9)
    expect(calculateScore(ctx({ areaType: 'residential' })).factors.find(f => f.key === 'areaType')!.score).toBe(5)
  })

  it('urbanTier: metro-city=10, city=7, town=4, rural=1', () => {
    expect(calculateScore(ctx({ urbanTier: 'metro-city' })).factors.find(f => f.key === 'urbanTier')!.score).toBe(10)
    expect(calculateScore(ctx({ urbanTier: 'city' })).factors.find(f => f.key === 'urbanTier')!.score).toBe(7)
    expect(calculateScore(ctx({ urbanTier: 'town' })).factors.find(f => f.key === 'urbanTier')!.score).toBe(4)
    expect(calculateScore(ctx({ urbanTier: 'rural' })).factors.find(f => f.key === 'urbanTier')!.score).toBe(1)
  })

  it('accessibility: 0 bus stops + no parking = 0 pts', () => {
    const { factors } = calculateScore(ctx({ busStops: 0, parking: 0 }))
    expect(factors.find(f => f.key === 'accessibility')!.score).toBe(0)
  })

  it('accessibility: 3+ bus stops + parking = 12 pts max', () => {
    const { factors } = calculateScore(ctx({ busStops: 5, parking: 2 }))
    expect(factors.find(f => f.key === 'accessibility')!.score).toBe(12)
  })

  it('nearbyServices: 0 grocery, 0 amenities = 0 pts', () => {
    const { factors } = calculateScore(ctx({ groceryStores: 0, amenities: [] }))
    expect(factors.find(f => f.key === 'nearbyServices')!.score).toBe(0)
  })

  it('nearbyServices: 3+ grocery, 2+ amenities = 8 pts max', () => {
    const { factors } = calculateScore(ctx({ groceryStores: 5, amenities: ['a', 'b'] }))
    expect(factors.find(f => f.key === 'nearbyServices')!.score).toBe(8)
  })

  it('businessDensity: 0 businesses = 0 pts', () => {
    expect(calculateScore(ctx({ totalBusinesses: 0 })).factors.find(f => f.key === 'businessDensity')!.score).toBe(0)
  })

  it('businessDensity: 50+ businesses = 10 pts', () => {
    expect(calculateScore(ctx({ totalBusinesses: 50 })).factors.find(f => f.key === 'businessDensity')!.score).toBe(10)
  })

  it('applies land use cap for cemetery', () => {
    expect(calculateScore(ctx({ landUse: 'cemetery' })).score).toBe(8)
  })

  it('applies land use cap for industrial', () => {
    expect(calculateScore(ctx({ landUse: 'industrial' })).score).toBeLessThanOrEqual(30)
  })

  it('all factor scores are non-negative', () => {
    const { factors } = calculateScore(ctx({ competitors: 100, metroRidership: null }))
    for (const f of factors) expect(f.score).toBeGreaterThanOrEqual(0)
  })
})
