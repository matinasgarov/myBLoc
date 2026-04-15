import fs from 'fs'
import path from 'path'

type Ring = number[][]

/** Ray-casting point-in-polygon for a single ring. Coordinates are [lng, lat]. */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  const n = ring.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Check point against a GeoJSON Polygon (array of rings; first ring = outer boundary). */
function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (!rings.length || !rings[0].length) return false
  if (!pointInRing(lng, lat, rings[0])) return false
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(lng, lat, rings[h])) return false
  }
  return true
}

let cachedFeatures: GeoJSON.Feature[] | null = null

function getLakeFeatures(): GeoJSON.Feature[] {
  if (cachedFeatures) return cachedFeatures
  const filePath = path.join(process.cwd(), 'datasets', 'azerbaycan_goller.geojson')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw) as GeoJSON.FeatureCollection
  cachedFeatures = data.features
  return cachedFeatures
}

/**
 * Returns true if the given (lat, lng) falls inside any lake polygon in the dataset.
 * Throws if the GeoJSON file cannot be read or parsed (caller should handle).
 */
export function isInsideLake(lat: number, lng: number): boolean {
  const features = getLakeFeatures()
  for (const feature of features) {
    const geom = feature.geometry as GeoJSON.Geometry
    if (geom.type === 'Polygon') {
      if (pointInPolygon(lng, lat, geom.coordinates as Ring[])) return true
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates as Ring[][]) {
        if (pointInPolygon(lng, lat, polygon)) return true
      }
    }
  }
  return false
}
