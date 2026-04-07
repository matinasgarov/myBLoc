import { haversineMetres } from './geo'

export type WealthLevel =
  | 'Elite'
  | 'High'
  | 'Medium-High'
  | 'Medium-Growing'
  | 'Medium'
  | 'Below Average'
  | 'Low'

export interface BakuDistrict {
  name: string        // Azerbaijani name (no "rayonu" suffix)
  lat: number
  lng: number
  populationK: number // population in thousands (e.g. 222.6 = 222,600 people)
  wealth: WealthLevel
}

/** 12 Baku districts — source: BakuDistrictData.csv */
export const BAKU_DISTRICTS: BakuDistrict[] = [
  { name: 'Nəsimi',   lat: 40.38, lng: 49.84, populationK: 222.6, wealth: 'High' },
  { name: 'Yasamal',  lat: 40.37, lng: 49.81, populationK: 249.3, wealth: 'Medium-High' },
  { name: 'Nizami',   lat: 40.40, lng: 49.95, populationK: 201.8, wealth: 'Medium-High' },
  { name: 'Xətai',    lat: 40.38, lng: 49.90, populationK: 289.9, wealth: 'Medium-Growing' },
  { name: 'Nəriman',  lat: 40.41, lng: 49.88, populationK: 179.8, wealth: 'High' },
  { name: 'Səbail',   lat: 40.35, lng: 49.83, populationK: 102.6, wealth: 'Elite' },
  { name: 'Suraxanı', lat: 40.42, lng: 50.04, populationK: 222.0, wealth: 'Low' },
  { name: 'Binəqədi', lat: 40.45, lng: 49.85, populationK: 268.4, wealth: 'Below Average' },
  { name: 'Sabunçu',  lat: 40.48, lng: 50.00, populationK: 247.2, wealth: 'Low' },
  { name: 'Pirallahı',lat: 40.45, lng: 50.35, populationK:  20.6, wealth: 'Low' },
  { name: 'Xəzər',    lat: 40.45, lng: 50.15, populationK: 168.4, wealth: 'Medium' },
  { name: 'Qaradağ',  lat: 40.25, lng: 49.60, populationK: 127.9, wealth: 'Low' },
]

/**
 * Returns the nearest district centroid within 30 km, or null.
 * Returns null when lat=lng=0 (test/default sentinel).
 */
export function findDistrict(lat: number, lng: number): BakuDistrict | null {
  if (lat === 0 && lng === 0) return null
  let nearest: BakuDistrict | null = null
  let minDist = Infinity
  for (const d of BAKU_DISTRICTS) {
    const dist = haversineMetres(lat, lng, d.lat, d.lng)
    if (dist < minDist) {
      minDist = dist
      nearest = d
    }
  }
  return minDist <= 30_000 ? nearest : null
}
