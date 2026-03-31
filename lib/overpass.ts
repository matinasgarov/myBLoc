import type { OSMElement, PlacesContext } from './types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS = 500

function buildQuery(lat: number, lng: number): string {
  const r = RADIUS
  return (
    `[out:json][timeout:25];` +
    `(` +
    `node["shop"](around:${r},${lat},${lng});` +
    `node["amenity"](around:${r},${lat},${lng});` +
    `node["leisure"](around:${r},${lat},${lng});` +
    `node["office"](around:${r},${lat},${lng});` +
    `way["shop"](around:${r},${lat},${lng});` +
    `way["amenity"](around:${r},${lat},${lng});` +
    `);out tags;`
  )
}

function inferAreaType(elements: OSMElement[]): 'residential' | 'commercial' | 'mixed' {
  const residential = elements.filter(
    (e) =>
      e.tags?.amenity === 'school' ||
      e.tags?.amenity === 'kindergarten' ||
      e.tags?.building === 'residential'
  ).length
  const commercial = elements.filter(
    (e) =>
      e.tags?.shop ||
      e.tags?.office ||
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'bank'
  ).length
  if (commercial > residential * 2) return 'commercial'
  if (residential > commercial * 2) return 'residential'
  return 'mixed'
}

function extractAmenities(elements: OSMElement[]): string[] {
  const result: string[] = []
  const schools = elements.filter(
    (e) => e.tags?.amenity === 'school' || e.tags?.amenity === 'university'
  ).length
  const transit = elements.filter(
    (e) =>
      e.tags?.amenity === 'bus_station' ||
      e.tags?.railway === 'station' ||
      e.tags?.railway === 'subway_entrance'
  ).length
  const food = elements.filter(
    (e) =>
      e.tags?.amenity === 'restaurant' ||
      e.tags?.amenity === 'cafe' ||
      e.tags?.amenity === 'fast_food'
  ).length
  const shops = elements.filter((e) => e.tags?.shop).length

  if (schools > 0) result.push(`${schools} məktəb/universitet`)
  if (transit > 0) result.push(`${transit} nəqliyyat dayanacağı`)
  if (food > 0) result.push(`${food} yemək yeri`)
  if (shops > 0) result.push(`${shops} mağaza`)
  return result
}

function countCompetitors(elements: OSMElement[], businessType: string): number {
  const lower = businessType.toLowerCase()
  return elements.filter((e) => {
    const name = (e.tags?.name || '').toLowerCase()
    const amenity = (e.tags?.amenity || '').toLowerCase()
    const shop = (e.tags?.shop || '').toLowerCase()
    const leisure = (e.tags?.leisure || '').toLowerCase()
    return (
      name.includes(lower) ||
      amenity.includes(lower) ||
      shop.includes(lower) ||
      leisure.includes(lower)
    )
  }).length
}

export async function fetchPlacesContext(
  lat: number,
  lng: number,
  businessType: string
): Promise<PlacesContext> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(buildQuery(lat, lng))}`,
  })
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`)
  }
  const data = (await response.json()) as { elements: OSMElement[] }
  const elements = data.elements || []
  return {
    competitors: countCompetitors(elements, businessType),
    areaType: inferAreaType(elements),
    amenities: extractAmenities(elements),
    totalBusinesses: elements.length,
  }
}
