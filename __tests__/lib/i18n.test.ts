import { AZ } from '@/lib/az'
import { EN } from '@/lib/en'
import { getStrings } from '@/lib/i18n'

describe('i18n string parity', () => {
  it('AZ and EN have identical key sets', () => {
    const azKeys = Object.keys(AZ).sort()
    const enKeys = Object.keys(EN).sort()
    expect(enKeys).toEqual(azKeys)
  })

  it('every value is a string in both locales', () => {
    for (const k of Object.keys(AZ) as (keyof typeof AZ)[]) {
      expect(typeof AZ[k]).toBe('string')
    }
    for (const k of Object.keys(EN) as (keyof typeof EN)[]) {
      expect(typeof EN[k]).toBe('string')
    }
  })

  it('exposes the new layer keys in both locales', () => {
    expect(AZ.LAYER_BUS).toBe('Avtobus')
    expect(AZ.LAYER_METRO).toBe('Metro')
    expect(AZ.LAYER_TRANSPORT).toBe('Nəqliyyat')
    expect(AZ.LAYER_COMPETITORS).toBe('Rəqiblər')

    expect(EN.LAYER_BUS).toBe('Bus Stops')
    expect(EN.LAYER_METRO).toBe('Metro')
    expect(EN.LAYER_TRANSPORT).toBe('Transport')
    expect(EN.LAYER_COMPETITORS).toBe('Competitors')
  })
})

describe('getStrings', () => {
  it('returns AZ when lang=az', () => {
    expect(getStrings('az')).toBe(AZ)
  })

  it('returns EN when lang=en', () => {
    expect(getStrings('en')).toBe(EN)
  })
})
