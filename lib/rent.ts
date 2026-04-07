import type { BakuDistrict, WealthLevel } from './baku-districts'

export type RentTier = 'Low' | 'Medium' | 'High' | 'Very High'

export interface RentResult {
  tier: RentTier
  tierAz: string
  factorsAz: string[]
}

const TIER_LABELS_AZ: Record<RentTier, string> = {
  'Low':       'Aşağı',
  'Medium':    'Orta',
  'High':      'Yüksək',
  'Very High': 'Çox Yüksək',
}

/** Base tier index (0=Low … 3=Very High) by district wealth */
const WEALTH_BASE_INDEX: Record<WealthLevel, number> = {
  'Elite':          3,
  'High':           2,
  'Medium-High':    1,
  'Medium-Growing': 1,
  'Medium':         1,
  'Below Average':  0,
  'Low':            0,
}

const TIERS: RentTier[] = ['Low', 'Medium', 'High', 'Very High']

/**
 * Estimates rent tier based on district wealth, metro proximity,
 * area type, and foot traffic. All inputs are from PlacesContext.
 */
export function estimateRent(
  district: BakuDistrict | null,
  metroDistance: number | null,
  metroRidership: number | null,
  areaType: 'residential' | 'commercial' | 'mixed',
): RentResult {
  if (!district) {
    return { tier: 'Medium', tierAz: TIER_LABELS_AZ['Medium'], factorsAz: [] }
  }

  const factors: string[] = []
  let tierIndex = WEALTH_BASE_INDEX[district.wealth]
  factors.push(`${district.name} rayonu`)

  // Metro proximity — strong upward pressure on rent
  if (metroDistance !== null) {
    if (metroDistance <= 50) {
      tierIndex += 2
      factors.push(`metro stansiyasına ${metroDistance}m məsafə (çox yaxın)`)
    } else if (metroDistance <= 150) {
      tierIndex += 1
      factors.push(`metro stansiyasına ${metroDistance}m məsafə`)
    } else if (metroDistance <= 300) {
      factors.push(`metro stansiyasına ${metroDistance}m məsafə`)
    }
  }

  // Commercial zone — higher rent than residential
  if (areaType === 'commercial') {
    tierIndex += 1
    factors.push('ticarət məntəqəsi')
  }

  // Very high footfall station boosts rent further
  if (metroRidership !== null && metroRidership >= 20_000) {
    tierIndex += 1
    factors.push('yüksək sərnişin axını')
  }

  const tier = TIERS[Math.min(tierIndex, 3)]
  return { tier, tierAz: TIER_LABELS_AZ[tier], factorsAz: factors }
}
