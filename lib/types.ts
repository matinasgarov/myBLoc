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
  /** All dominant chain competitors within DOMINANT_COMPETITOR_RADIUS, sorted nearest-first. */
  dominantCompetitors: { name: string; distance: number }[]
  /** Nearby chain restaurants/cafes (populated for food business types only). */
  nearbyChains?: { name: string; distance: number; cuisine?: string }[]
}

export interface AnalysisResult {
  score: number
  summary: string
  detail: string
  pros: string[]
  cons: string[]
  verdict: string
  factors?: FactorResult[]
  // District & rent enrichment (computed server-side, not LLM-generated)
  districtName?: string
  districtPopulationK?: number  // in thousands, e.g. 222.6
  rentTier?: string             // 'Low' | 'Medium' | 'High' | 'Very High'
  rentTierAz?: string           // e.g. 'Çox Yüksək'
  rentFactors?: string[]        // contributing factor labels in Azerbaijani
  luxuryMismatch?: boolean      // luxury business in low-wealth district
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
  rentTierAz?: string
  rentTier?: string
  luxuryMismatch?: boolean
}

export type AgentStatus = 'idle' | 'loading' | 'done' | 'error'

export interface AgentResult {
  role: string
  emoji: string
  opinion: string
  confidence?: number
}
