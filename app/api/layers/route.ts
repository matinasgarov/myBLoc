import { NextRequest, NextResponse } from 'next/server'
import { fetchFromOverpass, resolveOSMTags } from '@/lib/overpass'
import type { OSMElement } from '@/lib/types'

type LayerType = 'bus' | 'metro' | 'transport' | 'competitors'

function elementCoords(e: OSMElement): { lat: number; lng: number } | null {
  if (e.lat !== undefined && e.lon !== undefined) return { lat: e.lat, lng: e.lon }
  if (e.center) return { lat: e.center.lat, lng: e.center.lon }
  return null
}

function buildLayerQuery(lat: number, lng: number, layerType: LayerType, businessType?: string): string | null {
  switch (layerType) {
    case 'bus':
      return (
        `[out:json][timeout:15];` +
        `(node["highway"="bus_stop"](around:500,${lat},${lng});` +
        `node["amenity"="bus_station"](around:500,${lat},${lng}););` +
        `out body;`
      )
    case 'metro':
      return (
        `[out:json][timeout:15];` +
        `(node["station"="subway"](around:2000,${lat},${lng});` +
        `node["railway"="station"]["station"="subway"](around:2000,${lat},${lng});` +
        `node["railway"="subway_entrance"](around:2000,${lat},${lng}););` +
        `out body;`
      )
    case 'transport':
      return (
        `[out:json][timeout:15];` +
        `(node["public_transport"="stop_position"](around:500,${lat},${lng});` +
        `node["public_transport"="station"](around:500,${lat},${lng}););` +
        `out body;`
      )
    case 'competitors': {
      if (!businessType) return null
      const tags = resolveOSMTags(businessType)
      if (!tags || tags.length === 0) return null
      const tagPattern = tags.join('|')
      return (
        `[out:json][timeout:15];` +
        `(node["amenity"~"^(${tagPattern})$"](around:500,${lat},${lng});` +
        `node["shop"~"^(${tagPattern})$"](around:500,${lat},${lng});` +
        `node["leisure"~"^(${tagPattern})$"](around:500,${lat},${lng}););` +
        `out body;`
      )
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { lat, lng, layerType, businessType } = body as {
    lat?: unknown; lng?: unknown; layerType?: unknown; businessType?: string
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 })
  }

  const validTypes: LayerType[] = ['bus', 'metro', 'transport', 'competitors']
  if (!validTypes.includes(layerType as LayerType)) {
    return NextResponse.json({ error: 'Invalid layerType' }, { status: 400 })
  }

  const query = buildLayerQuery(lat, lng, layerType as LayerType, businessType)
  if (!query) {
    return NextResponse.json({ elements: [] })
  }

  try {
    const { elements } = await fetchFromOverpass(query)
    const mapped = elements
      .map(e => {
        const coords = elementCoords(e)
        if (!coords) return null
        return { lat: coords.lat, lng: coords.lng, name: e.tags?.name }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    return NextResponse.json({ elements: mapped })
  } catch {
    return NextResponse.json({ elements: [] })
  }
}
