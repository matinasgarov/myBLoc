/**
 * @jest-environment node
 */
import { POST } from '@/app/api/analyze/route'
import * as groqLib from '@/lib/groq'
import { NextRequest } from 'next/server'

jest.mock('@/lib/groq')

const mockResult = {
  score: 72,
  pros: ['Yaxşı trafik'],
  cons: ['Yüksək rəqabət'],
  verdict: 'Orta perspektiv.',
}

const validBody = {
  lat: 40.4093,
  lng: 49.8671,
  businessType: 'Oyun Klubu',
  placesContext: {
    competitors: 2,
    areaType: 'commercial',
    amenities: ['1 məktəb/universitet'],
    totalBusinesses: 15,
    landUse: null,
    recognized: true,
    busStops: 1,
    parking: 0,
    groceryStores: 1,
    majorRoads: 1,
    metroDistance: 400,
    metroRidership: 20000,
    urbanTier: 'city',
  },
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/analyze', () => {
  it('returns 200 with analysis result on success', async () => {
    ;(groqLib.analyzeLocation as jest.Mock).mockResolvedValue(mockResult)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject(mockResult)
  })

  it('returns 400 when placesContext is missing', async () => {
    const { placesContext: _, ...withoutCtx } = validBody
    const res = await POST(makeRequest(withoutCtx))
    expect(res.status).toBe(400)
  })

  it('returns 400 when businessType is missing', async () => {
    const { businessType: _, ...withoutBiz } = validBody
    const res = await POST(makeRequest(withoutBiz))
    expect(res.status).toBe(400)
  })

  it('returns 500 on Groq failure', async () => {
    ;(groqLib.analyzeLocation as jest.Mock).mockRejectedValue(new Error('Groq error'))
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
  })
})
