export interface LatLng {
  lat: number
  lng: number
}

export interface OSMElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type UrbanTier = 'metro-city' | 'city' | 'town' | 'rural'

export type FactorKey =
  | 'competition'
  | 'footTraffic'
  | 'areaType'
  | 'urbanTier'
  | 'accessibility'
  | 'nearbyServices'
  | 'businessDensity'

export interface FactorResult {
  key: FactorKey
  score: number
  max: number
}

export interface PlacesContext {
  competitors: number
  areaType: 'residential' | 'commercial' | 'mixed'
  amenities: string[]
  totalBusinesses: number
  landUse: string | null
  recognized: boolean
  busStops: number
  parking: number
  groceryStores: number
  majorRoads: number
  metroDistance: number | null
  metroRidership: number | null
  urbanTier: UrbanTier
  dominantCompetitor: { name: string; distance: number } | null
}

export interface AnalysisResult {
  score: number
  summary: string
  detail: string
  pros: string[]
  cons: string[]
  verdict: string
  factors?: FactorResult[]
}

export interface SavedAnalysis {
  id: string
  date: string
  lat: number
  lng: number
  business: string
  score: number
  summary?: string
  detail?: string
  pros: string[]
  cons: string[]
  verdict: string
  factors?: FactorResult[]
  context?: PlacesContext
}
