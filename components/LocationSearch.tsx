'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  onLocationSelect: (lat: number, lng: number) => void
  placeholder: string
  noResultsText: string
}

function parseDisplayName(displayName: string): { primary: string; secondary: string } {
  const parts = displayName.split(', ')
  const primary = parts[0] || displayName
  // Skip country (last part = "Azerbaijan") — show up to 3 middle parts as context
  const secondary = parts.slice(1, Math.min(4, parts.length - 1)).join(', ')
  return { primary, secondary }
}

export default function LocationSearch({ onLocationSelect, placeholder, noResultsText }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=az&format=json&limit=5&accept-language=az`
      const res = await fetch(url, { headers: { 'Accept-Language': 'az' } })
      if (!res.ok) throw new Error('nominatim')
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(r: NominatimResult) {
    onLocationSelect(parseFloat(r.lat), parseFloat(r.lon))
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search widget */}
      <div className="flex items-center bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/60 overflow-hidden">
        <div className="pl-3.5 pr-1 shrink-0">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-2 py-3 text-sm text-slate-100 bg-transparent outline-none placeholder:text-slate-500 font-medium"
        />
        {loading && (
          <div className="pr-3.5 shrink-0">
            <svg className="w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="pr-3.5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-10">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 text-center">{noResultsText}</p>
          ) : (
            <ul>
              {results.map(r => {
                const { primary, secondary } = parseDisplayName(r.display_name)
                return (
                  <li key={r.place_id} className="border-b border-slate-800 last:border-0">
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 font-medium leading-snug truncate">{primary}</p>
                          {secondary && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{secondary}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
