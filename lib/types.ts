export interface LatLng {
  lat: number
  lng: number
}

export interface OSMElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

export interface PlacesContext {
  competitors: number
  areaType: 'residential' | 'commercial' | 'mixed'
  amenities: string[]
  totalBusinesses: number
  landUse: string | null
}

export interface AnalysisResult {
  score: number
  pros: string[]
  cons: string[]
  verdict: string
}

export interface SavedAnalysis {
  id: string
  date: string
  lat: number
  lng: number
  business: string
  score: number
  pros: string[]
  cons: string[]
  verdict: string
}
