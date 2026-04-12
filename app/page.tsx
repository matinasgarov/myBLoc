'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { saveAnalysis, getAnalyses } from '@/lib/storage'
import { getStrings, type Lang } from '@/lib/i18n'
import BusinessInputModal from '@/components/BusinessInputModal'
import LoadingOverlay from '@/components/LoadingOverlay'
import ResultSheet from '@/components/ResultSheet'
import HistorySidebar from '@/components/HistorySidebar'
import LandingPage from '@/components/LandingPage'
import MapErrorBoundary from '@/components/MapErrorBoundary'
import type { AnalysisResult, LatLng, PlacesContext, SavedAnalysis } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type AppState = 'landing' | 'map' | 'input' | 'loading' | 'cuisine' | 'result'

/** Maps user's cuisine selection + detected chain cuisine → cuisineMatch for scoring. */
function deriveCuisineMatch(
  userCuisine: string,
  nearbyChains: { cuisine?: string }[],
): 'same' | 'different' | 'multiple' {
  if (nearbyChains.length >= 2) return 'multiple'
  const chainCuisine = nearbyChains[0]?.cuisine
  if (!chainCuisine || chainCuisine === 'other') return 'different'
  if (userCuisine === chainCuisine) return 'same'
  // pizza and italian are treated as the same category
  if (
    (userCuisine === 'pizza' || userCuisine === 'italian') &&
    (chainCuisine === 'pizza' || chainCuisine === 'italian')
  ) return 'same'
  return 'different'
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3 | 4>(1)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [placesContext, setPlacesContext] = useState<PlacesContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [lang, setLang] = useState<Lang>('az')
  const [mapKey, setMapKey] = useState(0)

  const strings = getStrings(lang)

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('myblocate-lang') as Lang | null
    if (saved === 'az' || saved === 'en') setLang(saved)
  }, [])

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang)
    localStorage.setItem('myblocate-lang', newLang)
  }

  const handleStart = () => setAppState('map')

  const handlePinDrop = useCallback(
    (lat: number, lng: number) => {
      if (appState !== 'map' && appState !== 'input') return
      setPin({ lat, lng })
      setError(null)
      if (appState === 'map') setAppState('input')
    },
    [appState]
  )

  // Shared analyze + save logic — called from both handleBusinessSubmit and handleCuisineSubmit
  async function runAnalyze(
    ctx: PlacesContext,
    cuisineMatch: string | undefined,
    business: string,
    location: LatLng,
  ) {
    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        businessType: business,
        placesContext: ctx,
        lang,
        ...(cuisineMatch ? { cuisineMatch } : {}),
      }),
    })

    if (analyzeRes.status === 422) {
      const data = await analyzeRes.json().catch(() => ({}))
      if (data.error === 'RESTRICTED_ZONE') {
        setError(strings.ERROR_RESTRICTED_ZONE)
        setPin(null)
        setMapKey(k => k + 1)
        setAppState('map')
        return
      }
    }
    if (!analyzeRes.ok) throw new Error('analyze')

    const analysisResult: AnalysisResult = await analyzeRes.json()
    setResult(analysisResult)
    setAppState('result')

    saveAnalysis({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      lat: location.lat,
      lng: location.lng,
      business,
      context: ctx,
      ...analysisResult,
    })
    setAnalyses(getAnalyses())
  }

  const handleBusinessSubmit = async (business: string) => {
    if (!pin) return
    setBusinessType(business)
    setAppState('loading')
    setLoadingStep(1)
    setError(null)

    const t2 = setTimeout(() => setLoadingStep(2), 2000)
    const t3 = setTimeout(() => setLoadingStep(3), 4000)

    try {
      const placesRes = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business }),
      })
      clearTimeout(t2)
      clearTimeout(t3)
      if (!placesRes.ok) throw new Error('places')

      const fetchedContext: PlacesContext = await placesRes.json()
      setPlacesContext(fetchedContext)
      if (!fetchedContext.recognized) setWarning(strings.WARN_UNKNOWN_TYPE)
      else setWarning(null)

      // Cuisine prompt: pause if nearby food chains detected
      if ((fetchedContext.nearbyChains ?? []).length > 0) {
        setAppState('cuisine')
        return
      }

      setLoadingStep(4)
      await runAnalyze(fetchedContext, undefined, business, pin)
    } catch (err) {
      clearTimeout(t2)
      clearTimeout(t3)
      const msg =
        (err as Error).message === 'places' ? strings.ERROR_NO_DATA : strings.ERROR_ANALYSIS_FAILED
      setError(msg)
      setAppState('map')
    }
  }

  const handleCuisineSubmit = async (userCuisine?: string) => {
    if (!pin || !placesContext) return
    const chains = placesContext.nearbyChains ?? []
    const cuisineMatch = userCuisine ? deriveCuisineMatch(userCuisine, chains) : undefined
    setAppState('loading')
    setLoadingStep(4)
    try {
      await runAnalyze(placesContext, cuisineMatch, businessType, pin)
    } catch {
      setError(strings.ERROR_ANALYSIS_FAILED)
      setAppState('map')
    }
  }

  const handleModalClose = () => {
    setAppState('map')
    setError(null)
  }

  const handleGoHome = () => {
    setAppState('landing')
    setPin(null)
    setResult(null)
    setPlacesContext(null)
    setBusinessType('')
    setError(null)
    setWarning(null)
    setMapKey(k => k + 1)
  }

  const handleReset = () => {
    setAppState('map')
    setPin(null)
    setResult(null)
    setPlacesContext(null)
    setBusinessType('')
    setError(null)
    setWarning(null)
    setMapKey(k => k + 1)
  }

  const isDimmed = appState === 'loading'

  if (appState === 'landing') {
    return (
      <LandingPage
        onStart={handleStart}
        strings={strings}
        lang={lang}
        onLangChange={handleLangChange}
      />
    )
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col">

      {/* Header bar */}
      <div className="flex-none h-14 bg-black border-b border-gray-800 shadow-sm flex items-center px-4 z-[1100] gap-3">
        <button
          onClick={handleGoHome}
          className="text-gray-400 hover:text-gray-200 transition-colors text-sm flex items-center gap-1 shrink-0"
          aria-label={strings.BACK_HOME}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {strings.BACK_HOME}
        </button>
        <span className="w-px h-5 bg-gray-700 shrink-0" />
        <img src="/logo.png" alt="myblocate" className="h-7 w-auto" />
      </div>

      {/* Content area: map + persistent history sidebar */}
      <div className="flex flex-1 min-h-0">

        {/* Left: map + result panel stacked */}
        <div className="flex-1 min-h-0 flex flex-col">

          {/* Map area */}
          <div className="relative flex-1 min-h-0">
            <MapErrorBoundary message={strings.MAP_ERROR}>
              <Map key={mapKey} onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} />
            </MapErrorBoundary>

            {appState === 'map' && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-gray-600 shadow-md pointer-events-none select-none">
                {strings.MAP_INSTRUCTION}
              </div>
            )}

            {error && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl shadow-md max-w-xs text-center">
                {error}
              </div>
            )}

            {warning && !error && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl shadow-md max-w-xs text-center">
                {warning}
              </div>
            )}

            {appState === 'input' && (
              <BusinessInputModal onSubmit={handleBusinessSubmit} onClose={handleModalClose} lang={lang} strings={strings} />
            )}

            {appState === 'loading' && <LoadingOverlay step={loadingStep} />}

            {appState === 'cuisine' && placesContext?.nearbyChains && placesContext.nearbyChains.length > 0 && (
              <div className="absolute inset-0 flex items-end sm:items-center justify-center z-[1000] pointer-events-none">
                <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[420px] mx-0 sm:mx-4 pointer-events-auto flex flex-col">
                  <div className="px-5 pt-5 pb-3">
                    <h2 className="text-sm font-semibold text-slate-200">{strings.MODAL_CUISINE_TITLE}</h2>
                    <p className="text-xs text-amber-400 mt-1">
                      {placesContext.nearbyChains[0].name} · {placesContext.nearbyChains[0].distance}m
                    </p>
                    <p className="text-xs text-slate-400 mt-2">{strings.MODAL_CUISINE_PROMPT}</p>
                  </div>
                  <div className="px-5 pb-3 grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'doner', label: strings.MODAL_CUISINE_DONER },
                        { key: 'burger', label: strings.MODAL_CUISINE_BURGER },
                        { key: 'azerbaijani', label: strings.MODAL_CUISINE_AZ },
                        { key: 'italian', label: strings.MODAL_CUISINE_ITALIAN },
                        { key: 'pizza', label: strings.MODAL_CUISINE_PIZZA },
                        { key: 'other', label: strings.MODAL_CUISINE_OTHER },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleCuisineSubmit(key)}
                        className="px-3 py-3 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-colors text-sm text-slate-200 font-medium text-center"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCuisineSubmit(undefined)}
                    className="w-full text-center px-4 py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors border-t border-slate-700"
                  >
                    {strings.MODAL_CUISINE_SKIP}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Result panel — below map */}
          {appState === 'result' && result && (
            <ResultSheet business={businessType} result={result} context={placesContext} onReset={handleReset} strings={strings} />
          )}

        </div>

        {/* Persistent history sidebar */}
        <HistorySidebar analyses={analyses} />
      </div>
    </main>
  )
}
