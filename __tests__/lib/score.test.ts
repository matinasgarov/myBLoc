import { calculateScore } from '@/lib/score'
import type { PlacesContext } from '@/lib/types'

function ctx(overrides: Partial<PlacesContext>): PlacesContext {
  return {
    competitors: 0,
    areaType: 'commercial',
    amenities: [],
    totalBusinesses: 10,
    ...overrides,
  }
}

describe('calculateScore', () => {
  it('returns maximum score with no competitors, 4+ amenities, commercial area', () => {
    const score = calculateScore(ctx({ amenities: ['a', 'b', 'c', 'd'] }))
    expect(score).toBe(95) // 50 + 30 + 20 = 100, capped at 95
  })

  it('returns minimum score with many competitors, no amenities, residential area', () => {
    const score = calculateScore(ctx({ competitors: 20, amenities: [], areaType: 'residential' }))
    expect(score).toBe(10) // 5 + 0 + 5
  })

  it('penalises each competitor by 8 points', () => {
    // Use counts that don't hit the floor (max(5, 50 - n*8) must stay above 5)
    const score2 = calculateScore(ctx({ competitors: 2 })) // 50-16=34
    const score4 = calculateScore(ctx({ competitors: 4 })) // 50-32=18
    expect(score2 - score4).toBe(16) // 2 * 8
  })

  it('caps competition penalty floor at 5 points', () => {
    const score = calculateScore(ctx({ competitors: 100, amenities: [], areaType: 'residential' }))
    expect(score).toBe(10) // floor 5 + 0 + 5
  })

  it('adds 8 points per amenity type up to 30', () => {
    const score2 = calculateScore(ctx({ amenities: ['a', 'b'], areaType: 'residential' }))
    expect(score2).toBe(50 + 16 + 5) // 71
  })

  it('gives correct area type bonuses', () => {
    const commercial = calculateScore(ctx({ areaType: 'commercial' }))
    const mixed = calculateScore(ctx({ areaType: 'mixed' }))
    const residential = calculateScore(ctx({ areaType: 'residential' }))
    expect(commercial).toBe(70) // 50 + 0 + 20
    expect(mixed).toBe(62)      // 50 + 0 + 12
    expect(residential).toBe(55) // 50 + 0 + 5
  })
})
