import { NextRequest, NextResponse } from 'next/server'
import { fetchPlacesContext } from '@/lib/overpass'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !body.businessType
  ) {
    return NextResponse.json(
      { error: 'lat, lng, and businessType are required' },
      { status: 400 }
    )
  }
  try {
    const context = await fetchPlacesContext(body.lat, body.lng, body.businessType)
    return NextResponse.json(context)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
