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
import LocationSearch from '@/components/LocationSearch'
import DesktopDashboard from '@/components/DesktopDashboard'
import type { AnalysisResult, LatLng, PlacesContext, SavedAnalysis } from '@/lib/types'
import { parseShareParams } from '@/lib/share'

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
  const [error, setError] = useState<{ title: string; hint?: string } | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [lang, setLang] = useState<Lang>('az')
  const [mapKey, setMapKey] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<LatLng | null>(null)

  const strings = getStrings(lang)

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('myblocate-lang') as Lang | null
    if (saved === 'az' || saved === 'en') setLang(saved)
  }, [])

  // Auto-run analysis when arriving via a share link. Validated strictly;
  // any malformed param is ignored silently.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = parseShareParams(window.location.search)
    if (!params) return
    setLang(params.lang)
    setAppState('map')
    setFlyToTarget({ lat: params.lat, lng: params.lng })
    handleBusinessSubmit(params.q, { lat: params.lat, lng: params.lng })
    // Strip query string so refresh doesn't re-run and shared URL stays clean in history.
    window.history.replaceState(null, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setWarning(null)
      setPlacesContext(null)
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
      if (data.error === 'LAKE_ZONE') {
        setError({ title: strings.ERROR_LAKE_ZONE })
        setPin(null)
        setMapKey(k => k + 1)
        setAppState('map')
        return
      }
      if (data.error === 'RESTRICTED_ZONE') {
        setError({ title: strings.ERROR_RESTRICTED_ZONE })
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

  const handleBusinessSubmit = async (business: string, overridePin?: LatLng) => {
    const activePin = overridePin ?? pin
    if (!activePin) return
    console.log('[page] === new analysis run === pin:', activePin, 'stale placesContext:', placesContext)
    if (overridePin) setPin(overridePin)
    setPlacesContext(null)
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
        body: JSON.stringify({ lat: activePin.lat, lng: activePin.lng, businessType: business }),
      })
      clearTimeout(t2)
      clearTimeout(t3)
      if (!placesRes.ok) throw new Error('places')

      const fetchedContext: PlacesContext = await placesRes.json()
      console.log('[places] fetched nearbyChains:', fetchedContext.nearbyChains)
      setPlacesContext(fetchedContext)
      console.log('[page] ctx set, dominant:', fetchedContext.dominantCompetitors?.length, 'nearby:', fetchedContext.nearbyChains?.length)
      if (!fetchedContext.recognized) setWarning(strings.WARN_UNKNOWN_TYPE)
      else setWarning(null)

      // Cuisine prompt: pause if nearby food chains detected
      if ((fetchedContext.nearbyChains ?? []).length > 0) {
        setAppState('cuisine')
        return
      }

      setLoadingStep(4)
      await runAnalyze(fetchedContext, undefined, business, activePin)
      console.log('[page] === analysis run complete ===')
    } catch (err) {
      clearTimeout(t2)
      clearTimeout(t3)
      const isNoData = (err as Error).message === 'places'
      setError({
        title: isNoData ? strings.ERROR_NO_DATA : strings.ERROR_ANALYSIS_FAILED,
        hint: isNoData ? strings.ERROR_HINT_NO_DATA : strings.ERROR_HINT_ANALYSIS_FAILED,
      })
      setAppState('map')
    }
  }

  const handleCuisineSubmit = async (userCuisine?: string) => {
    if (!pin || !placesContext) return
    console.log('[page] cuisine submit, ctx chains:', placesContext?.nearbyChains, 'userCuisine:', userCuisine)
    const chains = placesContext.nearbyChains ?? []
    const cuisineMatch = userCuisine ? deriveCuisineMatch(userCuisine, chains) : undefined
    setAppState('loading')
    setLoadingStep(4)
    try {
      await runAnalyze(placesContext, cuisineMatch, businessType, pin)
    } catch {
      setError({ title: strings.ERROR_ANALYSIS_FAILED, hint: strings.ERROR_HINT_ANALYSIS_FAILED })
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
      <div
        className="flex-none h-14 flex items-center px-4 z-[1100] gap-3"
        style={{
          background: 'rgba(7,9,13,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 1px 0 rgba(0,201,138,0.06)',
        }}
      >
        <button
          onClick={handleGoHome}
          className="text-gray-400 hover:text-gray-200 transition-colors text-base flex items-center gap-1 shrink-0"
          aria-label={strings.BACK_HOME}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {strings.BACK_HOME}
        </button>
        <span className="w-px h-5 bg-gray-700 shrink-0" />
        <img src="/logo.png" alt="myblocate" className="h-7 w-auto" />

        <div className="ml-auto flex items-center gap-2">
          {/* Language switcher */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => handleLangChange('az')}
              className="px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors"
              style={{
                background: lang === 'az' ? '#0050c9' : 'transparent',
                color: lang === 'az' ? '#07090D' : 'rgba(148,163,184,0.6)',
              }}
            >
              AZ
            </button>
            <button
              onClick={() => handleLangChange('en')}
              className="px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors"
              style={{
                background: lang === 'en' ? '#0050c9' : 'transparent',
                color: lang === 'en' ? '#07090D' : 'rgba(148,163,184,0.6)',
              }}
            >
              EN
            </button>
          </div>

          {/* History */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-800"
            aria-label={strings.HISTORY_OPEN}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5"/>
              <line x1="3" y1="10" x2="17" y2="10"/>
              <line x1="3" y1="15" x2="17" y2="15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Backdrop for history drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/50" onClick={() => setHistoryOpen(false)} />
      )}

      {/* History drawer */}
      <HistorySidebar
        analyses={analyses}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        strings={strings}
        currentResult={result}
        currentBusiness={businessType}
        currentContext={placesContext}
      />

      {/* Content area */}
      <div className="flex flex-1 min-h-0">

        {/* Map column — full width on mobile, 60% on desktop */}
        <div className="min-h-0 flex flex-col" style={{ flex: '3' }}>

          {/* Map area */}
          <div className="relative flex-1 min-h-0">
            <MapErrorBoundary message={strings.MAP_ERROR}>
              <Map key={mapKey} onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} flyToTarget={flyToTarget} />
            </MapErrorBoundary>

            {(appState === 'map' || appState === 'input') && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[600] w-80">
                <LocationSearch
                  onLocationSelect={(lat, lng) => {
                    handlePinDrop(lat, lng)
                    setFlyToTarget({ lat, lng })
                  }}
                  placeholder={strings.LOCATION_SEARCH_PLACEHOLDER}
                  noResultsText={strings.LOCATION_SEARCH_NO_RESULTS}
                />
              </div>
            )}

            {appState === 'map' && (
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] rounded-full px-5 py-2 text-sm pointer-events-none select-none backdrop-blur-md"
                style={{
                  background: 'rgba(7,9,13,0.82)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(203,213,225,0.7)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}
              >
                {strings.MAP_INSTRUCTION}
              </div>
            )}

            {error && (
              <div
                className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] backdrop-blur-sm rounded-xl shadow-xl max-w-sm"
                style={{
                  background: 'rgba(15,23,42,0.96)',
                  border: '1px solid rgba(248,113,113,0.35)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                }}
                role="alert"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(248,113,113,0.12)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7" cy="7" r="5.5" />
                      <line x1="7" y1="4.5" x2="7" y2="7.5" />
                      <circle cx="7" cy="9.5" r="0.4" fill="#f87171" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>{error.title}</p>
                    {error.hint && (
                      <p className="text-xs mt-1 leading-snug" style={{ color: 'rgba(203,213,225,0.65)' }}>{error.hint}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    aria-label={strings.ERROR_DISMISS}
                    className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors -mr-1 -mt-1 p-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="3" y1="3" x2="9" y2="9" />
                      <line x1="9" y1="3" x2="3" y2="9" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {warning && !error && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/95 backdrop-blur-sm border border-amber-500/40 text-amber-400 text-sm px-4 py-3 rounded-xl shadow-xl max-w-xs text-center">
                {warning}
              </div>
            )}

            {appState === 'input' && (
              <BusinessInputModal onSubmit={handleBusinessSubmit} onClose={handleModalClose} lang={lang} strings={strings} />
            )}

            {appState === 'loading' && <LoadingOverlay step={loadingStep} strings={strings} />}

            {appState === 'cuisine' && placesContext?.nearbyChains && placesContext.nearbyChains.length > 0 && (
              <div className="absolute inset-0 flex items-end sm:items-center justify-center z-[1000] pointer-events-none">
                <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[420px] mx-0 sm:mx-4 pointer-events-auto flex flex-col">
                  <div className="px-5 pt-5 pb-3">
                    <h2 className="text-sm font-semibold text-slate-200">{strings.MODAL_CUISINE_TITLE}</h2>
                    <div className="mt-3 rounded-xl px-4 py-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>
                        ⚠ {strings.MODAL_CUISINE_CHAIN_DETECTED.replace('{name}', placesContext.nearbyChains[0].name)}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'rgba(251,191,36,0.6)' }}>
                        {placesContext.nearbyChains[0].name} · {placesContext.nearbyChains[0].distance}m
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">{strings.MODAL_CUISINE_PROMPT}</p>
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

          {/* Result sheet — mobile only (desktop shows in dashboard panel) */}
          {appState === 'result' && result && (
            <div className="lg:hidden">
              <ResultSheet business={businessType} result={result} context={placesContext} lat={pin?.lat} lng={pin?.lng} lang={lang} onReset={handleReset} strings={strings} />
            </div>
          )}

        </div>

        {/* Desktop dashboard panel — hidden on mobile, 40% width on desktop */}
        <div
          className="hidden lg:flex flex-col"
          style={{ flex: '2', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          <DesktopDashboard
            analyses={analyses}
            currentResult={result}
            currentBusiness={businessType}
            currentContext={placesContext}
            currentLat={pin?.lat ?? null}
            currentLng={pin?.lng ?? null}
            onReset={handleReset}
            onOpenHistory={() => setHistoryOpen(true)}
            strings={strings}
          />
        </div>

      </div>
    </main>
  )
}
