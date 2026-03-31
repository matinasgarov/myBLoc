import { saveAnalysis, getAnalyses, clearAnalyses } from '@/lib/storage'
import type { SavedAnalysis } from '@/lib/types'

const mockAnalysis: SavedAnalysis = {
  id: 'test-id-1',
  date: '2026-03-31',
  lat: 40.4093,
  lng: 49.8671,
  business: 'Oyun Klubu',
  score: 72,
  pros: ['Yaxşı yer'],
  cons: ['Az müştəri'],
  verdict: 'Orta perspektiv.',
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves an analysis', () => {
    saveAnalysis(mockAnalysis)
    const analyses = getAnalyses()
    expect(analyses).toHaveLength(1)
    expect(analyses[0].id).toBe('test-id-1')
  })

  it('accumulates multiple analyses, newest first', () => {
    saveAnalysis(mockAnalysis)
    saveAnalysis({ ...mockAnalysis, id: 'test-id-2' })
    const analyses = getAnalyses()
    expect(analyses).toHaveLength(2)
    expect(analyses[0].id).toBe('test-id-2')
  })

  it('returns empty array when nothing saved', () => {
    expect(getAnalyses()).toEqual([])
  })

  it('clears all analyses', () => {
    saveAnalysis(mockAnalysis)
    clearAnalyses()
    expect(getAnalyses()).toEqual([])
  })
})
