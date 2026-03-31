/**
 * @jest-environment node
 */
import { POST } from '@/app/api/places/route'
import * as overpass from '@/lib/overpass'
import { NextRequest } from 'next/server'

jest.mock('@/lib/overpass')

const mockContext = {
  competitors: 3,
  areaType: 'commercial',
  amenities: ['2 yemək yeri'],
  totalBusinesses: 20,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/places', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/places', () => {
  it('returns 200 with places context on success', async () => {
    ;(overpass.fetchPlacesContext as jest.Mock).mockResolvedValue(mockContext)
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671, businessType: 'Restoran' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockContext)
  })

  it('returns 400 when lat is missing', async () => {
    const res = await POST(makeRequest({ lng: 49.8671, businessType: 'Kafe' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when businessType is missing', async () => {
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671 }))
    expect(res.status).toBe(400)
  })

  it('returns 500 on Overpass failure', async () => {
    ;(overpass.fetchPlacesContext as jest.Mock).mockRejectedValue(new Error('timeout'))
    const res = await POST(makeRequest({ lat: 40.4093, lng: 49.8671, businessType: 'Restoran' }))
    expect(res.status).toBe(500)
  })
})
