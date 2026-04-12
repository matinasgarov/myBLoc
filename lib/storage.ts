import type { SavedAnalysis } from './types'

const STORAGE_KEY = 'hanimenebiznes_analyses'

export function saveAnalysis(analysis: SavedAnalysis): void {
  try {
    const existing = getAnalyses()
    existing.unshift(analysis)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // Storage quota exceeded or private browsing mode — silently skip
  }
}

function isValidAnalysis(obj: unknown): obj is SavedAnalysis {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false
  const a = obj as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    typeof a.lat === 'number' &&
    typeof a.lng === 'number' &&
    typeof a.business === 'string' &&
    typeof a.score === 'number'
  )
}

export function getAnalyses(): SavedAnalysis[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidAnalysis)
  } catch {
    return []
  }
}

export function clearAnalyses(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
