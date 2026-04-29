/**
 * @jest-environment node
 */
jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
    })),
  }
})

process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key'

import { parseConfidence, buildConfidencePrompt } from '@/app/api/expert-panel/route'

describe('parseConfidence', () => {
  it('parses a clean integer in range', () => {
    expect(parseConfidence('7')).toBe(7)
    expect(parseConfidence('0')).toBe(0)
    expect(parseConfidence('10')).toBe(10)
  })

  it('trims surrounding whitespace and newlines', () => {
    expect(parseConfidence('  6  ')).toBe(6)
    expect(parseConfidence('\n8\n')).toBe(8)
  })

  it('clamps values above 10 down to 10', () => {
    expect(parseConfidence('15')).toBe(10)
    expect(parseConfidence('99')).toBe(10)
  })

  it('clamps negative values up to 0', () => {
    expect(parseConfidence('-3')).toBe(0)
  })

  it('falls back to 5 when input is not numeric', () => {
    expect(parseConfidence('high')).toBe(5)
    expect(parseConfidence('')).toBe(5)
    expect(parseConfidence('   ')).toBe(5)
  })

  it('takes the leading integer when LLM emits trailing prose', () => {
    // parseInt parses leading integer, ignoring trailing characters
    expect(parseConfidence('7 out of 10')).toBe(7)
    expect(parseConfidence('8.')).toBe(8)
  })
})

describe('buildConfidencePrompt', () => {
  it('produces an English prompt when lang=en', () => {
    const p = buildConfidencePrompt('Risk Advisor', 'High competition reduces viability.', 'en')
    expect(p).toContain('You are Risk Advisor')
    expect(p).toContain('High competition reduces viability.')
    expect(p).toMatch(/single integer between 0 and 10/i)
  })

  it('produces an Azerbaijani prompt when lang=az', () => {
    const p = buildConfidencePrompt('Bazar Analitiki', 'Rəqabət yüksəkdir.', 'az')
    expect(p).toContain('Sən Bazar Analitiki')
    expect(p).toContain('Rəqabət yüksəkdir.')
    expect(p).toMatch(/0 ilə 10/)
  })

  it('interpolates role and opinion verbatim', () => {
    const p = buildConfidencePrompt('X', 'Y', 'en')
    expect(p).toContain('You are X')
    expect(p).toContain('"Y"')
  })

  it('emits different prompts for different langs', () => {
    const en = buildConfidencePrompt('R', 'O', 'en')
    const az = buildConfidencePrompt('R', 'O', 'az')
    expect(en).not.toEqual(az)
  })
})
