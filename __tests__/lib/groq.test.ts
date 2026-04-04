import { analyzeLocation } from '@/lib/groq'
import type { PlacesContext } from '@/lib/types'

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }))
})

import Groq from 'groq-sdk'

const mockCtx: PlacesContext = {
  competitors: 3,
  areaType: 'commercial',
  amenities: ['2 məktəb/universitet', '1 nəqliyyat dayanacağı'],
  totalBusinesses: 47,
  landUse: null,
  recognized: true,
  busStops: 2,
  parking: 1,
  groceryStores: 1,
  majorRoads: 2,
  metroDistance: 350,
  metroRidership: 25000,
  urbanTier: 'metro-city',
}

type MockGroqInstance = { chat: { completions: { create: jest.Mock } } }
const mockGroq = (instance: MockGroqInstance) =>
  (Groq as jest.MockedClass<typeof Groq>).mockImplementation(
    () => instance as unknown as InstanceType<typeof Groq>
  )

describe('analyzeLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Groq as jest.MockedClass<typeof Groq>).mockClear()
    process.env.GROQ_API_KEY = 'test-key'
  })

  it('returns AnalysisResult with provided score and AI-generated pros/cons/verdict', async () => {
    const mockPayload = {
      summary: 'Bu ərazidə biznes üçün yaxşı şərait mövcuddur.',
      detail: 'Ətraflı məlumat burada.',
      pros: ['Yaxşı trafik', 'Az rəqabət'],
      cons: ['Yüksək icarə'],
      verdict: 'Bu biznes üçün yaxşı yer.',
    }
    mockGroq({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockPayload) } }],
          }),
        },
      },
    })

    const result = await analyzeLocation(40.4093, 49.8671, 'Oyun Klubu', mockCtx, 75)
    expect(result.score).toBe(75)
    expect(result.pros).toHaveLength(2)
    expect(result.cons).toHaveLength(1)
    expect(result.verdict).toBe('Bu biznes üçün yaxşı yer.')
  })

  it('retries once on invalid JSON then returns result', async () => {
    const mockPayload = { summary: 'Xülasə.', detail: 'Ətraflı.', pros: ['a'], cons: ['b'], verdict: 'Orta.' }
    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'not valid json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(mockPayload) } }] })

    mockGroq({ chat: { completions: { create: mockCreate } } })

    const result = await analyzeLocation(40.4093, 49.8671, 'Restoran', mockCtx, 60)
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result.score).toBe(60)
  })

  it('throws after 2 failed JSON parses', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    })
    mockGroq({ chat: { completions: { create: mockCreate } } })

    await expect(analyzeLocation(40.4093, 49.8671, 'Kafe', mockCtx, 50)).rejects.toThrow()
  })

  it('throws when Groq API call itself fails', async () => {
    mockGroq({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      },
    })

    await expect(analyzeLocation(40.4093, 49.8671, 'Kafe', mockCtx, 50)).rejects.toThrow('Network error')
  })
})
