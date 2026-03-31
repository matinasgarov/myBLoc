'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AZ } from '@/lib/az'
import { saveAnalysis, getAnalyses } from '@/lib/storage'
import BusinessInputModal from '@/components/BusinessInputModal'
import LoadingOverlay from '@/components/LoadingOverlay'
import ResultSheet from '@/components/ResultSheet'
import HistorySidebar from '@/components/HistorySidebar'
import type { AnalysisResult, LatLng, SavedAnalysis } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type AppState = 'landing' | 'map' | 'input' | 'loading' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

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

    try {
      const placesRes = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business }),
      })
      if (!placesRes.ok) throw new Error('places')
      setLoadingStep(2)
      const placesContext = await placesRes.json()

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business, placesContext }),
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
        ...analysisResult,
      }
      saveAnalysis(saved)
      setAnalyses(getAnalyses())
    } catch (err) {
      const msg =
        (err as Error).message === 'places' ? AZ.ERROR_NO_DATA : AZ.ERROR_ANALYSIS_FAILED
      setError(msg)
      setAppState('map')
    }
  }

  const handleReset = () => {
    setAppState('map')
    setPin(null)
    setResult(null)
    setBusinessType('')
    setError(null)
  }

  const isDimmed = appState === 'loading' || appState === 'result'

  if (appState === 'landing') {
    return (
      <main className="w-screen h-screen bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-5xl font-bold text-blue-600 tracking-tight animate-fade-in">
          {AZ.LANDING_BRAND}
        </h1>
        <p className="mt-4 text-gray-600 text-center max-w-xs text-sm animate-fade-in-delay">
          {AZ.LANDING_DESCRIPTION}
        </p>
        <p className="mt-2 text-gray-400 text-center max-w-xs text-xs animate-fade-in-delay">
          {AZ.LANDING_DISCLAIMER}
        </p>
        <button
          onClick={handleStart}
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-md animate-fade-in-delay-2"
        >
          {AZ.LANDING_CTA}
        </button>
      </main>
    )
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col">

      {/* Header bar */}
      <div className="flex-none h-14 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 z-[1100]">
        <span className="text-lg font-bold text-blue-600 tracking-tight">
          {AZ.HEADER_BRAND}
        </span>
        <button
          onClick={() => setShowHistory((h) => !h)}
          title={AZ.HISTORY_BUTTON_LABEL}
          className="bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg border border-gray-200"
        >
          🕐
        </button>
      </div>

      {/* Map container — flex-1 fills remaining height; min-h-0 prevents overflow */}
      <div className="relative flex-1 min-h-0">
        <Map onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} />

        {appState === 'map' && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-gray-600 shadow-md pointer-events-none select-none">
            {AZ.MAP_INSTRUCTION}
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

        {appState === 'result' && result && (
          <>
            <div className="absolute inset-0 z-[999]" onClick={handleReset} />
            <ResultSheet business={businessType} result={result} onReset={handleReset} />
          </>
        )}
      </div>

      {showHistory && (
        <HistorySidebar analyses={analyses} onClose={() => setShowHistory(false)} />
      )}
    </main>
  )
}
