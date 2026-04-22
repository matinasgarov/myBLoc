import type { Lang } from './i18n'

export interface ShareParams {
  lat: number
  lng: number
  q: string
  lang: Lang
}

const MAX_QUERY_LEN = 400
const BUSINESS_MIN = 2
const BUSINESS_MAX = 100
const LETTER_RUN = /[\p{L}]{2,}/u

/**
 * Strictly validates and parses shareable URL params.
 * Returns null if any field fails validation. Never throws; never reflects input.
 *
 * Mirrors server-side validation in /api/places to prevent XSS / injection via
 * crafted share URLs. Callers must still render `q` as React text only.
 */
export function parseShareParams(search: string): ShareParams | null {
  if (!search || search.length > MAX_QUERY_LEN) return null
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return null
  }

  const latStr = params.get('lat')
  const lngStr = params.get('lng')
  const q = params.get('q')
  const langStr = params.get('lang')
  if (!latStr || !lngStr || !q) return null

  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const trimmed = q.trim()
  if (trimmed.length < BUSINESS_MIN || trimmed.length > BUSINESS_MAX) return null
  if (!LETTER_RUN.test(trimmed)) return null

  const lang: Lang = langStr === 'en' ? 'en' : 'az'
  return { lat, lng, q: trimmed, lang }
}

/** Builds a shareable absolute URL for the given analysis. */
export function buildShareUrl(
  origin: string,
  p: { lat: number; lng: number; q: string; lang: Lang }
): string {
  const params = new URLSearchParams({
    lat: p.lat.toFixed(5),
    lng: p.lng.toFixed(5),
    q: p.q,
    lang: p.lang,
  })
  return `${origin}/?${params.toString()}`
}
