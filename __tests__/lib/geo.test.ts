import { haversineMetres } from '@/lib/geo'

describe('haversineMetres', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMetres(40.4093, 49.8671, 40.4093, 49.8671)).toBe(0)
  })

  it('returns roughly 111 000m per degree of latitude', () => {
    const d = haversineMetres(40.0, 49.0, 41.0, 49.0)
    expect(d).toBeGreaterThan(110000)
    expect(d).toBeLessThan(112000)
  })

  it('measures ~500m between two known Baku points', () => {
    // 20 Yanvar metro (40.4034, 49.8076) → roughly 500m north
    const d = haversineMetres(40.4034, 49.8076, 40.4080, 49.8076)
    expect(d).toBeGreaterThan(400)
    expect(d).toBeLessThan(600)
  })
})
