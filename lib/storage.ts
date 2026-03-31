import type { SavedAnalysis } from './types'

const STORAGE_KEY = 'hanimenebiznes_analyses'

export function saveAnalysis(analysis: SavedAnalysis): void {
  const existing = getAnalyses()
  existing.unshift(analysis)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getAnalyses(): SavedAnalysis[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedAnalysis[]
  } catch {
    return []
  }
}

export function clearAnalyses(): void {
  localStorage.removeItem(STORAGE_KEY)
}
