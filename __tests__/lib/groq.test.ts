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
}

function getMockCreate() {
  return (Groq as jest.MockedClass<typeof Groq>).mock.results[0].value.chat.completions.create as jest.Mock
}

describe('analyzeLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-instantiate mock for each test
    ;(Groq as jest.MockedClass<typeof Groq>).mockClear()
    // Set dummy API key for tests
    process.env.GROQ_API_KEY = 'test-key'
  })

  it('returns parsed AnalysisResult on valid Groq response', async () => {
    const mockPayload = {
      score: 75,
      pros: ['Yaxşı trafik', 'Az rəqabət'],
      cons: ['Yüksək icarə'],
      verdict: 'Bu biznes üçün yaxşı yer.',
    }
    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockPayload) } }],
          }),
        },
      },
    } as any))

    const result = await analyzeLocation(40.4093, 49.8671, 'Oyun Klubu', mockCtx)
    expect(result.score).toBe(75)
    expect(result.pros).toHaveLength(2)
    expect(result.cons).toHaveLength(1)
    expect(result.verdict).toBe('Bu biznes üçün yaxşı yer.')
  })

  it('retries once on invalid JSON then returns result', async () => {
    const mockPayload = { score: 60, pros: ['a'], cons: ['b'], verdict: 'Orta.' }
    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'not valid json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(mockPayload) } }] })

    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any))

    const result = await analyzeLocation(40.4093, 49.8671, 'Restoran', mockCtx)
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result.score).toBe(60)
  })

  it('throws after 2 failed JSON parses', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    })
    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any))

    await expect(analyzeLocation(40.4093, 49.8671, 'Kafe', mockCtx)).rejects.toThrow()
  })

  it('throws when Groq API call itself fails', async () => {
    ;(Groq as jest.MockedClass<typeof Groq>).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      },
    } as any))

    await expect(analyzeLocation(40.4093, 49.8671, 'Kafe', mockCtx)).rejects.toThrow('Network error')
  })
})
