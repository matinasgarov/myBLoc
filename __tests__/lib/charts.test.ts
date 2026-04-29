import { barColor } from '@/components/Charts'

describe('barColor', () => {
  it('returns emerald for percentages >= 70', () => {
    expect(barColor(70)).toBe('#34d399')
    expect(barColor(85)).toBe('#34d399')
    expect(barColor(100)).toBe('#34d399')
  })

  it('returns amber for percentages 40..69', () => {
    expect(barColor(40)).toBe('#fbbf24')
    expect(barColor(55)).toBe('#fbbf24')
    expect(barColor(69.99)).toBe('#fbbf24')
  })

  it('returns red for percentages below 40', () => {
    expect(barColor(0)).toBe('#f87171')
    expect(barColor(20)).toBe('#f87171')
    expect(barColor(39.99)).toBe('#f87171')
  })

  it('handles boundary at 70 exactly', () => {
    expect(barColor(69.999)).toBe('#fbbf24')
    expect(barColor(70)).toBe('#34d399')
  })

  it('handles boundary at 40 exactly', () => {
    expect(barColor(39.999)).toBe('#f87171')
    expect(barColor(40)).toBe('#fbbf24')
  })
})
