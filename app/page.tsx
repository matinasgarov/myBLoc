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
import type { AnalysisResult, LatLng, PlacesContext, SavedAnalysis } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type AppState = 'landing' | 'map' | 'input' | 'loading' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3 | 4>(1)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [placesContext, setPlacesContext] = useState<PlacesContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [lang, setLang] = useState<Lang>('az')

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

  const handleBusinessSubmit = async (business: string) => {
    if (!pin) return
    setBusinessType(business)
    setAppState('loading')
    setLoadingStep(1)
    setError(null)

    // Simulate steps 2 and 3 while the places API loads
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

      // Step 4: AI analysis begins
      setLoadingStep(4)
      const fetchedContext = await placesRes.json()
      setPlacesContext(fetchedContext)

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business, placesContext: fetchedContext }),
      })
      if (!analyzeRes.ok) throw new Error('analyze')

      const analysisResult: AnalysisResult = await analyzeRes.json()
      setResult(analysisResult)
      setAppState('result')

      const saved: SavedAnalysis = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        lat: pin.lat,
        lng: pin.lng,
        business,
        context: fetchedContext,
        ...analysisResult,
      }
      saveAnalysis(saved)
      setAnalyses(getAnalyses())
    } catch (err) {
      clearTimeout(t2)
      clearTimeout(t3)
      const msg =
        (err as Error).message === 'places' ? strings.ERROR_NO_DATA : strings.ERROR_ANALYSIS_FAILED
      setError(msg)
      setAppState('map')
    }
  }

  const handleReset = () => {
    setAppState('map')
    setPin(null)
    setResult(null)
    setPlacesContext(null)
    setBusinessType('')
    setError(null)
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
      <div className="flex-none h-14 bg-black border-b border-gray-800 shadow-sm flex items-center px-4 z-[1100]">
        <span className="text-lg font-bold text-gray-200 tracking-tight">
          {strings.HEADER_BRAND}
        </span>
      </div>

      {/* Content area: map + persistent history sidebar */}
      <div className="flex flex-1 min-h-0">

        {/* Left: map + result panel stacked */}
        <div className="flex-1 min-h-0 flex flex-col">

          {/* Map area */}
          <div className="relative flex-1 min-h-0">
            <Map onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} />

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

            {appState === 'input' && (
              <BusinessInputModal onSubmit={handleBusinessSubmit} onClose={handleReset} />
            )}

            {appState === 'loading' && <LoadingOverlay step={loadingStep} />}
          </div>

          {/* Result panel — below map */}
          {appState === 'result' && result && (
            <ResultSheet business={businessType} result={result} context={placesContext} onReset={handleReset} />
          )}

        </div>

        {/* Persistent history sidebar */}
        <HistorySidebar analyses={analyses} />
      </div>
    </main>
  )
}
